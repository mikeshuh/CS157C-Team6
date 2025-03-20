from bs4 import BeautifulSoup
import requests, json
from flask import jsonify

'''
sites with paywalls:
wired.com

sites formatted:
verge.com ({site: 'p', class_="duet--article--dangerously-set-cms-markup duet--article--standard-paragraph _1ymtmqpi _17nnmdy1 _17nnmdy0 _1xwtict1"})
'''

'''
function currently works with 1 url and verge.com
'''
def scrape_article(url):
    '''
    Scrapes article content given url
    Returns: 
    '''
    try:
        response = requests.get(url)
        soup = BeautifulSoup(response.content, "html.parser")
        paragraphs = soup.find_all('p', class_="duet--article--dangerously-set-cms-markup duet--article--standard-paragraph _1ymtmqpi _17nnmdy1 _17nnmdy0 _1xwtict1")
        content = ""
        for p in paragraphs:
            content += p.text
        return jsonify({
            "success" : True,
            "url" : json.dumps(url),
            "content" : content
        })
    except Exception as e:
        return {"error": str(e)}