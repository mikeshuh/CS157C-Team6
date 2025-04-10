from flask import Flask
from flask_cors import CORS
from app.database import mongo
from app.routes import main  #blueprint
from app.config import Config
from app.bcrypt import bcrypt, jwt

def create_app():
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(Config)
    
    # Initialize
    mongo.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    
    # Enable CORS
    CORS(app)

    # Register Blueprints
    app.register_blueprint(main)
    return app