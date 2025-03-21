from flask import Blueprint, jsonify, request
from app.database import mongo
from app.schemas import article_schema
from datetime import datetime
from app.services.news_api import NewsApi
from app.services.utils import scrape_summarize
from app.services.scraper import scrape_tester, domain_rules
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
    Insert one or multiple articles into the articles collection in briefly.
    
    Required fields:
    - title (str)
    - summary (str)
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
        
        #insert all articles into db
        results = mongo.db.articles.insert_many(validated_data)
        
        #inserted_articles is a list of the inserted articles, finds the recently inserted articles using id
        inserted_articles = list(mongo.db.articles.find({"_id": {"$in" : results.inserted_ids}}))
        
        #convert ObjectId to str for dump
        for article in inserted_articles:
            article['_id'] = str(article['_id'])
        
        created_at = datetime.now().isoformat()

        return jsonify({
            "success" : True,
            "created_at" : created_at,
            "articles" : article_schema.dump(inserted_articles, many=True)
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

        #insert all articles into db
        results = mongo.db.articles.insert_many(validated_data)

        #inserted_articles is a list of the inserted articles, finds the recently inserted articles using id
        inserted_articles = list(mongo.db.articles.find({"_id": {"$in" : results.inserted_ids}}))
        
        #convert ObjectId to str for dump
        for article in inserted_articles:
            article['_id'] = str(article['_id'])
        
        created_at = datetime.now().isoformat()

        return jsonify({
            "success" : True,
            "created_at" : created_at,
            "articles_inserted" : article_schema.dump(inserted_articles, many=True)
        }), 201
    except Exception as e:
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