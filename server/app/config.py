import os
from dotenv import load_dotenv

class Config:
    #gets values from local .env file
    MONGO_URI = os.getenv("MONGO_URI")
    DEBUG = True