from flask import Blueprint
from app.database import mongo

main = Blueprint("main", __name__)
@main.route('/')
def home():
    return "Hello, Flask!"


@main.route('/api/test', methods=['GET'])
def test():
    return {"message": "Flask Backend is Running!"}