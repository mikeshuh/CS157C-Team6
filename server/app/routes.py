from flask import Blueprint, jsonify, request
from marshmallow import ValidationError
from app.database import mongo
from app.schemas import article_schema, user_schema
from datetime import datetime
import random
from app.services.news_api import NewsApi
from app.services.utils import *
from app.services.scraper import scrape_article
from pymongo import UpdateOne
from app.bcrypt import bcrypt, jwt
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
import time
from bson import ObjectId
import json


main = Blueprint("main", __name__)
news_api = NewsApi()
@main.route('/')
def home():
    return "Hello, Flask!"

@main.route('/api/test', methods=['GET'])
def test():
    """
    Test if the server is running.
    """
    return {"message": "Flask Backend is Running!"}
@main.route('/api/test_db_connect', methods=['GET'])
def test_connection():
    """
    Test connection to mongodb.
    """
    try:
        mongo.db.command('ping')
        return {"message": "Connected to MongoDB", 
                "database": mongo.db.name}
    except Exception as e:
        return {"error": str(e)}

@main.route('/api/insert_articles', methods=['POST'])
def insert_article():
    '''
    Manually insert one or multiple articles into the articles collection in briefly.
    Must follow schema (see schema.py)
    '''
    try:
        content_type = request.headers.get('Content-Type')
        if content_type == 'application/json':
            data = request.get_json()
        elif content_type == 'application/x-www-form-urlencoded':
            data = request.form.to_dict()
        else:
            return jsonify({"error": "Unsupported Content-Type"})

        #deserialize and validate input article data
        if isinstance(data, list):
            validated_data = article_schema.load(data, many=True)
        elif isinstance(data, dict):
            validated_data = article_schema.load(data)
            validated_data = [validated_data] #converts to list for insert_many
        else: 
            return jsonify({"error": "Invalid data"})
        
        bulk_operations = [] #list of operations to perform

        #create an operation to update article for each article
        for article in validated_data:
            bulk_operations.append(
                UpdateOne(
                    {"url": article["url"]},  # filter criteria
                    {"$set": article},        # update operation
                    upsert=True
                )
            )

        results = mongo.db.articles.bulk_write(bulk_operations) #perform operations at once
        article_urls = [article["url"] for article in validated_data] #list of article urls that were inserted

        #inserted_articles is a list of the inserted articles, finds the recently inserted articles using url
        inserted_articles = list(mongo.db.articles.find({"url": {"$in": article_urls}})) 

        #convert mongodb ObjectId to str for dump
        for article in inserted_articles:
            article['_id'] = str(article['_id'])

        created_at = datetime.now().isoformat()

        return jsonify({
            "success" : True,
            "created_at" : created_at,
            "num_inserted" : results.upserted_count,
            "num_updated" : results.modified_count,
            "num_processed" : len(bulk_operations),
            "articles_processed" : article_schema.dump(inserted_articles, many=True)
        }), 201
    except Exception as e:
        return jsonify({
            "success" : False,
            "error": str(e)
        })
    
@main.route('/api/delete_all_articles', methods=['DELETE'])
def delete_all():
    '''
    Delete all articles in the articles collection in briefly.
    '''
    try:
        results = mongo.db.articles.delete_many({})
        count = results.deleted_count
        return jsonify({
            "success" : True,
            "deletedCount" : count,
            "message": "All articles deleted"
        })
    except Exception as e:
        return jsonify({
            "success" : False,
            "error": str(e)
        })
    
@main.route('/api/personalized_articles/<user_id>', methods=['GET'])
def personalized_articles(user_id):
    '''
    Returns personalized article recommendations based on a user's liked articles.
    Analyzes the tags of articles the user has liked and returns other articles with similar tags.
    '''
    try:
        # Convert user_id to ObjectId
        try:
            user_obj_id = ObjectId(user_id)
        except Exception:
            return jsonify({"success": False, "error": "Invalid user_id format"}), 400
        
        # Get the user and their likes
        user = mongo.db.users.find_one({'_id': user_obj_id})
        print(f"User lookup result: {user is not None}")
        
        if not user:
            print(f"User {user_id} not found in database")
            return get_articles()
            
        # Check if user has likes
        if 'likes' not in user:
            print(f"User {user_id} has no 'likes' field in database")
            return get_articles()
            
        # Check if likes array is empty
        if not user['likes']:
            print(f"User {user_id} has empty likes array")
            return get_articles()
            
        # Log the raw likes array
        print(f"Raw likes from database: {user['likes']}")
        
        try:
            # Get all liked articles
            liked_article_ids = [ObjectId(article_id) for article_id in user['likes']]
            print(f"User {user_id} has {len(liked_article_ids)} liked articles")
            print(f"First few liked_article_ids: {[str(id) for id in liked_article_ids[:3]]}")
            
            # Find the liked articles in the database
            liked_articles = list(mongo.db.articles.find({'_id': {'$in': liked_article_ids}}))
            print(f"Found {len(liked_articles)} liked articles in database")
            
            # Check if any liked articles were found
            if not liked_articles:
                print(f"WARNING: None of the user's liked articles were found in the database!")
                # If no liked articles found in database, return regular articles
                return get_articles()
        except Exception as e:
            print(f"Error processing liked articles: {str(e)}")
            return get_articles()
        
        # Debug each liked article to see what tags are available
        print(f"Debugging liked articles:")
        for idx, article in enumerate(liked_articles):
            article_id = str(article.get('_id', 'unknown'))
            has_summarization = 'summarization' in article
            has_tags = has_summarization and 'tags' in article['summarization']
            tags = article['summarization'].get('tags', []) if has_summarization else []
            print(f"Article {idx+1} (ID: {article_id})")
            print(f"  Has summarization: {has_summarization}")
            print(f"  Has tags: {has_tags}")
            print(f"  Tags: {tags}")
        
        # Extract all tags from liked articles
        preferred_tags = []
        for article in liked_articles:
            if 'summarization' in article and 'tags' in article['summarization']:
                # Normalize tags - convert to lowercase and strip whitespace
                article_tags = [tag.lower().strip() for tag in article['summarization']['tags'] if tag]
                preferred_tags.extend(article_tags)
        
        # Count tag occurrences to find most preferred categories
        tag_counts = {}
        for tag in preferred_tags:
            if tag:  # Only count non-empty tags
                tag_counts[tag] = tag_counts.get(tag, 0) + 1
        
        print(f"Tag counts from liked articles: {tag_counts}")
        
        # If no tags were found, use the categories from article titles as a fallback
        if not tag_counts:
            print("No tags found in liked articles, using categories from article titles as fallback")
            popular_categories = ["World News", "Technology", "Sports", "Business", "Entertainment", "Health", "Science", "Politics"]
            
            # Check article titles for category hints
            for article in liked_articles:
                title = article.get('title', '').lower()
                for category in popular_categories:
                    if category.lower() in title:
                        tag_counts[category] = tag_counts.get(category, 0) + 1
        
        # Get top 3 preferred tags (or all if fewer than 3)
        top_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
        top_tags = [tag for tag, count in top_tags[:3]]
        
        # If still no tags found, use a default category based on liked articles
        if not top_tags and liked_articles:
            # Default to "General News" if we can't determine categories
            top_tags = ["General News"]
            
        print(f"Top preferred tags: {top_tags}")
        
        # First get a larger pool of potential articles that match any of the preferred tags
        or_conditions = []
        for tag in top_tags:
            # Exact tag matches with case insensitivity
            or_conditions.append({'summarization.tags': {'$regex': f'^{tag}$', '$options': 'i'}})
            # Partial tag matches for related content
            or_conditions.append({'summarization.tags': {'$regex': tag, '$options': 'i'}})
        
        # Get a pool of candidate articles
        candidate_articles = list(mongo.db.articles.find({
            '_id': {'$nin': liked_article_ids},
            '$or': or_conditions
        }).limit(50))  # Get a larger pool to rank
        
        print(f"Found {len(candidate_articles)} candidate articles with tag matches")
        
        # If we don't have enough candidates, expand the search
        if len(candidate_articles) < 10:
            print("Not enough candidate articles, expanding search criteria")
            # Add any articles with popular tags as fallback
            popular_tags = ['Sports', 'Business', 'World News', 'Technology', 'Entertainment']
            expanded_conditions = []
            for tag in popular_tags:
                expanded_conditions.append({'summarization.tags': {'$regex': f'^{tag}$', '$options': 'i'}})
            
            additional_articles = list(mongo.db.articles.find({
                '_id': {'$nin': liked_article_ids + [article['_id'] for article in candidate_articles]},
                '$or': expanded_conditions
            }).limit(50 - len(candidate_articles)))
            
            candidate_articles.extend(additional_articles)
            print(f"Added {len(additional_articles)} additional articles from popular categories")
        
        # Score each article based on how well it matches the preferred tags
        scored_articles = []
        for article in candidate_articles:
            score = 0
            if 'summarization' in article and 'tags' in article['summarization']:
                article_tags = [tag.lower().strip() for tag in article['summarization']['tags']]
                
                # Count direct matches with preferred tags (higher score for exact match)
                for preferred_tag in top_tags:
                    if preferred_tag.lower() in article_tags:
                        score += 10  # High score for exact match
                    elif any(preferred_tag.lower() in tag for tag in article_tags):
                        score += 5   # Medium score for partial match
                    
                # Extra score for articles that match multiple preferred tags
                matches = sum(1 for tag in top_tags if tag.lower() in article_tags or 
                             any(tag.lower() in t for t in article_tags))
                if matches > 1:
                    score += matches * 5  # Bonus for matching multiple preferred tags
                
                # Add slight boost for recency
                if 'published_date' in article:
                    try:
                        pub_date = datetime.strptime(article['published_date'], '%Y-%m-%dT%H:%M:%S')
                        days_old = (datetime.now() - pub_date).days
                        if days_old < 3:
                            score += 3  # Boost very recent articles
                        elif days_old < 7:
                            score += 1  # Small boost for articles less than a week old
                    except:
                        pass  # Skip date scoring if format issues
                
                # Add randomness factor to prevent repeated identical recommendations
                score += random.uniform(0, 2)  # Small random component
                
                scored_articles.append((article, score))
            else:
                # Articles without tags still get considered but with a low score
                scored_articles.append((article, 0.5))
        
        # Sort by score (highest first) and take top 10
        sorted_articles = sorted(scored_articles, key=lambda x: x[1], reverse=True)
        recommended_articles = [article for article, score in sorted_articles[:10]]
        
        # Log the scores of selected articles for debugging
        print(f"Selected articles with scores:")
        for i, (article, score) in enumerate(sorted_articles[:10]):
            article_id = str(article.get('_id', 'unknown'))
            article_tags = article.get('summarization', {}).get('tags', [])
            print(f"  {i+1}. ID: {article_id}, Score: {score}, Tags: {article_tags}")
        
        print(f"Final recommendation count: {len(recommended_articles)} articles")
        
        # If still not enough recommendations, add some general articles
        if len(recommended_articles) < 10:
            additional_articles = list(mongo.db.articles.find({
                '_id': {'$nin': liked_article_ids + [article['_id'] for article in recommended_articles]}
            }).limit(10 - len(recommended_articles)))
            
            print(f"Added {len(additional_articles)} general articles to fill up recommendations")
            recommended_articles.extend(additional_articles)
        
        # For debugging: print the tags of recommended articles
        for i, article in enumerate(recommended_articles):
            tags = article.get('summarization', {}).get('tags', [])
            print(f"Recommended article {i+1} tags: {tags}")
        
        # Convert ObjectId to string for JSON serialization
        for article in recommended_articles:
            article['_id'] = str(article['_id'])
            
        # Make sure we capitalize the tags for better display
        display_tags = [tag.capitalize() for tag in top_tags]
        
        print(f"Returning {len(recommended_articles)} personalized articles with tags: {display_tags}")
        
        return jsonify({
            'success': True,
            'num_found': len(recommended_articles),
            'preferred_tags': display_tags,
            'articles': recommended_articles
        })
        
    except Exception as e:
        print(f"Error generating personalized articles: {str(e)}")
        # Fallback to regular articles API
        return get_articles()

@main.route('/api/get_articles', methods=['GET'])
def get_articles():
    title = request.args.get('title')
    tags = request.args.getlist('tags')  # List of tags for filtering
    author = request.args.get('author')  # Author filter
    start_date = request.args.get('start_date')  # Start date filter (e.g. '2025-01-01')
    end_date = request.args.get('end_date')  # End date filter (e.g. '2025-12-31')

    # Build the filter query
    query = {}

    if title:
        query["title"] = {"$regex": title, "$options": "i"} # case-insensitive match
        
    # Filter by tags (if provided)
    if tags:
        query["summarization.tags"] = {"$in": tags}

    # Filter by author (if provided)
    if author:
        query["author"] = author

    # Filter by published date range (if provided)
    if start_date:
        query["published_date"] = {"$gte": datetime.strptime(start_date, "%Y-%m-%d")}
    if end_date:
        if "published_date" not in query:
            query["published_date"] = {}
        query["published_date"]["$lte"] = datetime.strptime(end_date, "%Y-%m-%d")

    # Query the database for articles based on the filter
    articles = list(mongo.db.articles.find(query))

    return jsonify({
        "num_found" : len(articles),
        "articles": article_schema.dump(articles, many=True)
    })

@main.route('/register', methods=['POST'])
def register():
    '''
    Register a new user
    Required header: Content-Type: application/json
    Required fields: username, email, password
    '''
    #get data from payload
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    role = data.get('role', 'user') #default role is user

    # Check if required fields are provided
    if not username or not password or not email:
        return jsonify({"msg": "Username, email, and password are required"}), 400
    
    # Check if username exists
    if get_user(username):
        return jsonify({"msg": "User already exists"}), 400
    
    # Check if email exists
    if mongo.db.users.find_one({"email": email}):
        return jsonify({"msg": "Email already in use"}), 400
    
    # Validate password strength
    if not validate_password(password):
        return jsonify({"msg": "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character"}), 400
    
    # Hash password and create user object
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    user = {
        "username": username,
        "email": email,
        "password": hashed_password,
        "role": role  
    }

    try:
        validated_user = user_schema.load(user) # Validate user against schema
        mongo.db.users.insert_one(validated_user) # Insert the user
        return jsonify({"msg": "User registered successfully"}), 201
    except ValidationError as err:
        return jsonify({"msg": "Validation error", "errors": err.messages}), 400
    except Exception as e:
        return jsonify({"msg": "Registration failed", "error": str(e)}), 500

@main.route('/login', methods=['POST'])
def login():
    '''
    Authenticate a user and return a JWT token
    Required header: Content-Type: application/json
    Required fields: username, password
    '''
    try:
        # Get data from payload
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400
        
        # Sanitize inputs
        username = sanitize_input(username)
        
        # Get user from database
        user = get_user(username)
        
        # Check if user exists or if password matches
        if not user or not bcrypt.check_password_hash(user["password"], password):
            return jsonify({"error": "Invalid username or password"}), 401
        
        # Create user info for JWT claim - avoid complex objects
        user_id = str(user['_id'])
        user_claims = {
            'id': user_id,
            'username': user['username'],
            'role': user.get('role', 'user')
        }
        
        # Create JWT token with user claims
        access_token = create_access_token(identity=user_claims)
        
        # Get user likes and convert ObjectIds to strings if needed
        user_likes = user.get('likes', [])
        print(f"User {username} has {len(user_likes)} likes in database")
        
        # Ensure likes are properly formatted as strings
        if user_likes:
            user_likes = [str(like_id) for like_id in user_likes]
            print(f"First few likes: {user_likes[:3]}")
        
        # Return the user's MongoDB ID, role, and token
        return jsonify({
            'access_token': access_token,
            'user_id': user_id,
            'user_role': user.get('role', 'user'),
            'likes': user_likes
        }), 200
    
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({"error": "An error occurred during login. Please try again."}), 500

@main.route('/api/user/likes/<user_id>', methods=['GET'])
def get_user_likes(user_id):
    try:
        # Convert string ID to ObjectId
        try:
            user_obj_id = ObjectId(user_id)
        except Exception:
            return jsonify({"success": False, "error": "Invalid user_id format"}), 400
            
        # Find the user
        user = mongo.db.users.find_one({"_id": user_obj_id})
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
            
        # Return the user's likes
        return jsonify({
            "success": True,
            "likes": user.get('likes', [])
        }), 200
    except Exception as e:
        print(f"Error getting user likes: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
        }), 500

@main.route('/api/user/liked_articles/<user_id>', methods=['GET'])
def get_user_liked_articles(user_id):
    '''
    Fetch the full article details for all articles a user has liked
    '''
    try:
        # Convert string ID to ObjectId
        try:
            user_obj_id = ObjectId(user_id)
        except Exception:
            return jsonify({"success": False, "error": "Invalid user_id format"}), 400
            
        # Find the user and get their likes
        user = mongo.db.users.find_one({"_id": user_obj_id})
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
        
        user_likes = user.get('likes', [])
        if not user_likes:
            return jsonify({
                "success": True,
                "num_found": 0,
                "articles": []
            }), 200
        
        # Convert string IDs to ObjectIds
        try:
            liked_article_ids = [ObjectId(article_id) for article_id in user_likes]
        except Exception as e:
            print(f"Error converting article IDs: {str(e)}")
            return jsonify({"success": False, "error": "Invalid article ID format"}), 400
        
        # Fetch the articles from the database
        liked_articles = list(mongo.db.articles.find({
            "_id": {"$in": liked_article_ids}
        }))
        
        print(f"Found {len(liked_articles)} liked articles for user {user_id}")
        
        # Convert ObjectIds to strings for JSON serialization
        for article in liked_articles:
            article['_id'] = str(article['_id'])
        
        return jsonify({
            "success": True,
            "num_found": len(liked_articles),
            "articles": liked_articles
        }), 200
    except Exception as e:
        print(f"Error getting liked articles: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "articles": []
        }), 500

@main.route('/api/like_article', methods=['POST'])
def like_article():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        article_id = data.get('article_id')

        if not user_id or not article_id:
            return jsonify({"success": False, "error": "Missing user_id or article_id"}), 400
        
        try:
            user_obj_id = ObjectId(user_id)
            article_obj_id = ObjectId(article_id)
        except Exception:
            return jsonify({"success": False, "error": "Invalid user_id or article_id format"}), 400
        
        #tries adding article to user likes array
        user_update_result = mongo.db.users.update_one(
            {"_id": user_obj_id},
            {"$addToSet": {"likes": str(article_obj_id)}}
        )

        #checks if there was an article added
        if (user_update_result.modified_count != 0):
            print('Added article_id', article_obj_id, 'to user', user_obj_id, 'likes')
        #if article not added, then it already exists in likes array, then remove it
        else:
            user_update_result = mongo.db.users.update_one(
            {"_id": user_obj_id},
            {"$pull": {"likes": str(article_obj_id)}})
            print('Removed article_id', article_obj_id, 'from user', user_obj_id, 'likes')

        return jsonify({
            "success": True,
            "user_modified_count": user_update_result.modified_count,
        }), 200
    
    except Exception as e:
        print("Like article failed:", str(e))
        return jsonify({
            "success": False,
            "error": str(e),
        }), 500
    
@main.route('/api/test_scraper_v2', methods=['POST'])
def scrape_article_test():
    data = request.get_json()
    url = data.get('url')
    result = scrape_article(url)
    result_json = json.loads(result.data)
    print(result_json)
    return jsonify({
        'success' : True
    })

@main.route('/api/generate_articles', methods=['POST'])
def generate_articles():
    '''
    Generate articles based on the provided keywords.
    Parameters:
    q : Keywords or phrases to search for in the article title and body.
    searchIn : The fields to restrict your q search to. options = (title, description, content)
    domains : A comma-seperated string of domains (eg bbc.co.uk, techcrunch.com, engadget.com) to restrict the search to.
    excludeDomains: A comma-seperated string of domains (eg bbc.co.uk, techcrunch.com, engadget.com) to remove from the results.
    pageSize : The number of results to return per page.
    '''
    start_time = time.time()
    try:
        if request.method == 'POST':
            content_type = request.headers.get('Content-Type')
            if content_type == 'application/json':
                data = request.get_json()
            elif content_type == 'application/x-www-form-urlencoded':
                data = request.form.to_dict()
            else:
                return jsonify({"error": "Unsupported Content-Type"})
            if not isinstance(data, dict):
                return jsonify({"error": "Invalid data"})
        else:
            data = {}
        
        data["pageSize"] = 5 #setting max articles to get to 5 (for now)
        data['sortBy'] = 'relevancy'
        print('Parameters for article query from NewsAPI:', data)
        result = news_api.get_articles(params=data) #result is a jsonify object from get_articles
        #print("Results from News API: \n", json.loads(result.data))

        summarized_dict = scrape_summarize(result) #dict that includes processed articles + summarizations
        #print('Dictionary that has summarization: \n', summarized_dict)

        processed_articles = summarized_dict['processed_articles'] #extract processed articles
        validated_data = article_schema.load(processed_articles, many=True) #schema validation against the processed articles

        bulk_operations = [] #list of operations to perform
        
        #create an operation to update article for each article
        for article in validated_data:
            bulk_operations.append(
                UpdateOne(
                    {"url": article["url"]},  # filter
                    {"$set": article},        # update
                    upsert=True #if article doesnt exist, insert
                )
            )
        
        results = mongo.db.articles.bulk_write(bulk_operations) #perform the operations at once
        article_urls = [article["url"] for article in validated_data] #list of article urls that were inserted

        #inserted_articles is a list of the inserted articles, finds the recently inserted articles using url
        inserted_articles = list(mongo.db.articles.find({"url": {"$in": article_urls}}))

        #convert mongodb ObjectId to str for dump
        for article in inserted_articles:
            article['_id'] = str(article['_id'])
        
        created_at = datetime.now().isoformat()
        
        end_time = time.time()
        execution_time = end_time - start_time

        print("Generate_articles execution report:")
        print("Articles failed:", summarized_dict["num_failed"])
        print("Articles inserted:", results.upserted_count)
        print("Articles updated:", results.modified_count)
        print(f"Execution time: {execution_time:.4f} seconds")
        return jsonify({
            "success" : True,
            "created_at" : created_at,
            "num_inserted" : results.upserted_count,
            "num_updated" : results.modified_count,
            "num_processed" : len(bulk_operations),
            "num_failed" : summarized_dict["num_failed"],
            "articles_processed" : article_schema.dump(inserted_articles, many=True)
        }), 201
    except Exception as e:
        end_time = time.time()
        execution_time = end_time - start_time  # Capture time even if it fails
        print("Generate_articles failed after", f"{execution_time:.4f} seconds")
        return jsonify({
            "success" : False,
            "error": str(e),
        })

@main.route('/api/delete_article/<article_id>', methods=['DELETE'])
@jwt_required()
def delete_article(article_id):
    '''
    Delete a single article by ID
    Required: User must be logged in with admin role
    '''
    # Get the current user identity from JWT
    try:
        current_user = get_jwt_identity()
        print(f"JWT Identity received: {current_user}")
        
        # Check if we have valid user data
        if not current_user:
            print("No user identity found in token")
            return jsonify({"success": False, "error": "Authentication required"}), 401
        
        # Extract role - handle both dict and string formats
        user_role = None
        if isinstance(current_user, dict):
            user_role = current_user.get('role')
            username = current_user.get('username', 'unknown')
        elif isinstance(current_user, str):
            # Try to handle string format (fallback)
            print(f"Identity is a string: {current_user}")
            user_role = 'admin' if 'admin' in current_user.lower() else 'user'
            username = current_user
        else:
            print(f"Unexpected identity type: {type(current_user)}")
            username = 'unknown'
        
        print(f"User role extracted: {user_role}")
        
        # Check admin privileges 
        if user_role != 'admin':
            print(f"Insufficient privileges: {user_role}")
            return jsonify({
                "success": False, 
                "error": "Admin privileges required for this operation"
            }), 403
            
        # Convert string ID to ObjectId for MongoDB
        try:
            article_obj_id = ObjectId(article_id)
        except Exception as e:
            print(f"Invalid article ID format: {article_id}, error: {str(e)}")
            return jsonify({
                "success": False,
                "error": "Invalid article ID format"
            }), 400
        
        # Delete the article from MongoDB
        result = mongo.db.articles.delete_one({"_id": article_obj_id})
        
        # Check if article was found and deleted
        if result.deleted_count == 0:
            print(f"Article not found: {article_id}")
            return jsonify({
                "success": False,
                "error": "Article not found"
            }), 404
        
        print(f"Article {article_id} successfully deleted by {username}")
        return jsonify({
            "success": True,
            "message": f"Article with ID {article_id} deleted successfully"
        }), 200
        
    except Exception as e:
        print(f"Error in delete_article: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"An error occurred: {str(e)}"
        }), 500

@main.route('/api/test_auth', methods=['GET'])
@jwt_required()
def test_auth():
    '''
    Test endpoint to verify JWT token authentication
    '''
    current_user = get_jwt_identity()
    return jsonify({
        "success": True,
        "authenticated": True,
        "user": current_user,
        "message": "Authentication successful"
    })

@main.route('/api/update_article/<article_id>', methods=['PUT'])
@jwt_required()
def update_article(article_id):
    '''
    Update an article's summary and key points
    Required: User must be logged in with admin role
    '''
    # Get the current user identity from JWT
    try:
        current_user = get_jwt_identity()
        
        # Check if we have valid user data
        if not current_user:
            return jsonify({"success": False, "error": "Authentication required"}), 401
        
        # Extract role - handle both dict and string formats
        user_role = None
        if isinstance(current_user, dict):
            user_role = current_user.get('role')
            username = current_user.get('username', 'unknown')
        elif isinstance(current_user, str):
            # Try to handle string format (fallback)
            user_role = 'admin' if 'admin' in current_user.lower() else 'user'
            username = current_user
        else:
            username = 'unknown'
        
        # Check admin privileges 
        if user_role != 'admin':
            return jsonify({
                "success": False, 
                "error": "Admin privileges required for this operation"
            }), 403
        
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        # Extract the fields to update
        update_fields = {}
        
        if 'summary' in data:
            update_fields['summarization.summary'] = data['summary']
        
        if 'key_points' in data and isinstance(data['key_points'], list):
            update_fields['summarization.key_points'] = data['key_points']
        
        if not update_fields:
            return jsonify({"success": False, "error": "No valid fields to update"}), 400
            
        # Convert string ID to ObjectId for MongoDB
        try:
            article_obj_id = ObjectId(article_id)
        except Exception as e:
            return jsonify({
                "success": False,
                "error": "Invalid article ID format"
            }), 400
        
        # Update the article in MongoDB
        result = mongo.db.articles.update_one(
            {"_id": article_obj_id},
            {"$set": update_fields}
        )
        
        # Check if article was found and updated
        if result.matched_count == 0:
            return jsonify({
                "success": False,
                "error": "Article not found"
            }), 404
        
        # Get the updated article to return
        updated_article = mongo.db.articles.find_one({"_id": article_obj_id})
        if updated_article:
            updated_article['_id'] = str(updated_article['_id'])
        
        print(f"Article {article_id} successfully updated by {username}")
        return jsonify({
            "success": True,
            "message": f"Article with ID {article_id} updated successfully",
            "article": updated_article
        }), 200
        
    except Exception as e:
        print(f"Error in update_article: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"An error occurred: {str(e)}"
        }), 500