from flask import Flask
from flask_cors import CORS
from app.database import mongo
from app.routes import main  #blueprint

def create_app():
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object("app.config.Config")

    # Initialize database
    mongo.init_app(app)

    # Enable CORS
    CORS(app)

    # Register Blueprints
    app.register_blueprint(main)

    return app