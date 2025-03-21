from bs4 import BeautifulSoup
import requests, json
from flask import jsonify
from urllib.parse import urlparse

'''
domain_rules is the scraping format for websites
'''
domain_rules = {
    "theverge.com" : {
        "tag" : "p",
        "class" : "duet--article--dangerously-set-cms-markup duet--article--standard-paragraph _1ymtmqpi _17nnmdy1 _17nnmdy0 _1xwtict1"
    },
    "techcrunch.com" : {
        "tag" : "p",
        "class" : "wp-block-paragraph"
    },
    "bbc.com" : {
        "tag" : "p",
        "class" : "sc-eb7bd5f6-0 fezwLZ"
    },
    "foxnews.com" : {
        "tag" : "p",
        "class" : "article-content",
        "div" : "article-body"
    },
}

def scrape_article(url):
    '''
    Scrapes article content given url
    Returns: 
    '''
    try:
        domain = urlparse(url).netloc.replace("www.", "") #gets domain from url
        rules = domain_rules.get(domain) #if we have this domain in our rules set the rules

        if rules:
            response = requests.get(url)
            soup = BeautifulSoup(response.content, "html.parser")
            if "div" in rules:
                div = soup.find('div', class_=rules['div'])
                paragraphs = div.find_all('p')
            else:
                paragraphs = soup.find_all(rules["tag"], class_=rules["class"])
            content = ""
            for para in paragraphs:
                content += para.text

        if len(content) < 200:
            raise Exception("Not enough content to scrape")
        
        return jsonify({
            "success" : True,
            "url" : json.dumps(url),
            "content" : content
        })
    except Exception as e:
        return {"error": str(e)}
    
def scrape_tester(url):
    '''
    Function to test scraping new URL's
    Will print the URL, Domain, and content to the terminal
    '''
    print("URL: ", url)
    domain = urlparse(url).netloc.replace("www.", "")
    print("Domain:", domain)
    rules = domain_rules.get(domain)
    if rules:
        response = requests.get(url)
        soup = BeautifulSoup(response.content, "html.parser")
        if "div" in rules:
            div = soup.find('div', class_=rules['div'])
            paragraphs = div.find_all('p')
        else:
            paragraphs = soup.find_all(rules["tag"], class_=rules["class"])
        content = ""
        for para in paragraphs:
            content += para.text
    if len(content) < 200:
        raise Exception("Not enough data to scrape")
    
    #print("Scraped content: \n", content)
    return jsonify({
        "success" : True,
        "content" : content
    })