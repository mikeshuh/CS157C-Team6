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
    Required header: Content-Type: application/json 
    '''
    #get data from payload
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'user') #default role is user

    #check if username exists
    if get_user(username):
        return jsonify({"msg": "User already exists"}), 400
    
    #hash password and create user object
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    user = {
        "username": username,
        "password": hashed_password,
        "role": role  
    }

    validated_user = user_schema.load(user) #validate user against schema
    mongo.db.users.insert_one(validated_user) #insert the user
    return jsonify({"msg": "User registered successfully"}), 201

@main.route('/login', methods=['POST'])
def login():
    #get data from payload
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    user = get_user(username)

    #check if user exists or if pw matches
    if not user or not bcrypt.check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid email or password"}), 401
    
    #create jwt token
    access_token = create_access_token(identity={
        'username': user['username'],
        'role': user['role']
    })

    return jsonify({'access_token': access_token}), 201
