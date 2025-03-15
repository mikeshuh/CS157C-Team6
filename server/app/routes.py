from flask import Blueprint, jsonify, request
from app.database import mongo
from app.schemas import article_schema
from datetime import datetime

main = Blueprint("main", __name__)
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
