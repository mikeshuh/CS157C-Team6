import os, json
import requests #different from flask request
from flask import jsonify

class NewsApi:
    BASE_URL = "https://newsapi.org/v2/"
    def __init__(self):
        self.api_key = os.getenv("NEWS_API_KEY")
        
    def get_articles(self, params=None):
        '''
        Fetch articles from the News API.'
        '''
        try:
            header = {"Authorization": self.api_key}
            #response = requests.get(f"{self.BASE_URL}/everything?", params=params, headers=header)

            #file with dummy data to avoid repeated news_api calls
            f = open('dummy.json', encoding="utf-8")
            response = json.load(f)
            print(params)
            return jsonify({
            "message": "testing"
            })
        except Exception as e:
            return {"error": str(e)}