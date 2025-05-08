from flask import Flask, jsonify
from flask_cors import CORS
from app.database import mongo
from app.routes import main  #blueprint
from app.config import Config
from app.bcrypt import bcrypt, jwt
from flask_jwt_extended import JWTManager
from flask_jwt_extended.exceptions import JWTExtendedException
from jwt.exceptions import PyJWTError

def create_app():
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(Config)
    
    # Initialize
    mongo.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    
    # JWT Error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            'error': 'Token has expired',
            'message': 'The token has expired. Please log in again.'
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({
            'error': 'Invalid token',
            'message': 'Authorization token is invalid. Please log in again.'
        }), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({
            'error': 'Authorization required',
            'message': 'Request does not contain an access token'
        }), 401
    
    # Generic error handler for JWT errors
    @app.errorhandler(JWTExtendedException)
    def handle_jwt_error(e):
        return jsonify({
            'error': 'JWT Error',
            'message': str(e)
        }), 401
        
    # Error handler for PyJWT errors
    @app.errorhandler(PyJWTError)
    def handle_pyjwt_error(e):
        return jsonify({
            'error': 'JWT Error',
            'message': str(e)
        }), 401
    
    # Enable CORS
    CORS(app)

    # Register Blueprints
    app.register_blueprint(main)
    return app