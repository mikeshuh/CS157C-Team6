import os, json
import requests #different from flask request
from flask import jsonify
from dotenv import load_dotenv

load_dotenv()

class NewsApi:
    BASE_URL = "https://newsapi.org/v2/"
    def __init__(self):
        self.api_key = os.environ.get("NEWS_API_KEY")
        
    def get_articles(self, params=None):
        '''
        Fetch articles from the News API.
        Parameters: params 
        '''
        try:
            header = {"Authorization": self.api_key}
            response = requests.get(f"{self.BASE_URL}/everything?", params=params, headers=header)

            #file with dummy data to avoid repeated news_api calls
            #f = open('dummy.json', encoding="utf-8")
            #response = json.load(f)

            #print(json.loads(response.text))
            result_json = json.loads(response.text) #converts the json string to json
            articles = result_json["articles"] #list of articles from news_api
            processed_data = process_articles(articles)
            print("News Articles Found:", len(processed_data))
            print(processed_data)
            return jsonify({
                "success": True,
                "num_articles" : len(processed_data),
                "processed_articles" : processed_data
            })
        except Exception as e:
            return {"error": str(e)}
        
def process_articles(articles):
    '''
    Takes the list of articles from News API, processes the data by getting the
    url, title, author, published date. Returns a list of JSON objects that contain
    these fields
    '''
    processed_articles = [] #list of json objs to return
    for article in articles: 
        p_article = {
            "title": article["title"],
            "author": article["author"],
            "published_date": article["publishedAt"],
            "url": article["url"],
            "img": article["urlToImage"],
        }
        processed_articles.append(p_article)
    return processed_articles
