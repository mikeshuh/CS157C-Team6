# migrate_users.py
from flask import Flask
from app import create_app
from app.database import mongo
import re

def generate_email_from_username(username):
    """Generate a placeholder email from username"""
    sanitized = re.sub(r'[^a-zA-Z0-9]', '', username)
    return f"{sanitized}@briefly.example.com"

def migrate_users():
    """Add email field to existing users"""
    app = create_app()
    
    with app.app_context():
        # Get all users without email field
        users_without_email = list(mongo.db.users.find({"email": {"$exists": False}}))
        
        if not users_without_email:
            print("No users need migration. All users already have an email field.")
            return
        
        print(f"Found {len(users_without_email)} users without email field.")
        
        # Update each user with a generated email
        for user in users_without_email:
            username = user.get('username')
            if not username:
                continue
                
            email = generate_email_from_username(username)
            
            # Update the user document
            result = mongo.db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"email": email}}
            )
            
            if result.modified_count:
                print(f"Updated user {username} with email {email}")
            else:
                print(f"Failed to update user {username}")
        
        print("Migration completed.")

if __name__ == "__main__":
    migrate_users()