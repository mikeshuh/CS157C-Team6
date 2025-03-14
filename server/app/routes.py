from flask import Blueprint
from flask import jsonify
from app.database import mongo

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

@main.route('/api/test_db_insert', methods=['GET'])
def test_insert():
    """
    Insert a test item into the test collection in briefly mongodb.
    Returns:
        dict: {'message': 'Inserted item into MongoDB'} or {'error': str(e)}
    
    """
    try:
        test_item = {"name" : "test item", "description" : "hello"}
        mongo.db.test_collection.insert_one(test_item)
        return {"message": "Inserted item into MongoDB"}
    except Exception as e:
        return {"error": str(e)}