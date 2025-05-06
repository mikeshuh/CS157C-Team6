from flask import Blueprint, jsonify, request
from app.database import mongo
from app.schemas import article_schema, user_schema
from datetime import datetime
from app.services.news_api import NewsApi
from app.services.utils import *
from app.services.scraper import scrape_tester, domain_rules
from pymongo import UpdateOne
from app.bcrypt import bcrypt, jwt
from flask_jwt_extended import create_access_token
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

@main.route('/api/generate_articles', methods=['GET', 'POST'])
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
        rules_string = ", ".join(domain_rules.keys()) #converting the keys into a comma separated string
        data["domains"] = rules_string #setting our domains to search in to the domains we have rules for

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

@main.route('/api/test_scraper', methods=['POST'])
def test_scraper():
    content_type = request.headers.get('Content-Type')
    if content_type == 'application/json':
        data = request.get_json()
    elif content_type == 'application/x-www-form-urlencoded':
        data = request.form.to_dict()
    else:
        return jsonify({"error": "Unsupported Content-Type"})
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid data"})
    
    response = scrape_tester(data["url"])
    return response

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
        
        # Create JWT token with user identity and additional claims
        user_claims = {
            'username': user['username'],
            'role': user.get('role', 'user')
        }
        
        # Add email to claims if it exists
        if 'email' in user:
            user_claims['email'] = user['email']
        
        access_token = create_access_token(identity=user_claims)
        
        # Return the user's MongoDB ID along with the token
        return jsonify({
            'access_token': access_token,
            'user_id': str(user['_id']),
            'likes': user.get('likes', [])
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
    

