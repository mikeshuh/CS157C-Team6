from bs4 import BeautifulSoup
import requests, json
from flask import jsonify

def scrape_article(url):
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')

        #find content using common tags
        common_tags = [
            {'name': 'article'},
            {'name': 'main'},
            {'name': 'section'},
            {'name': 'div', 'attrs': {'class': 'content'}},
            {'name': 'div', 'attrs': {'id': 'content'}},
            {'name': 'div', 'attrs': {'class': 'post-content'}},
            {'name': 'div', 'attrs': {'id': 'article-body'}}
        ]

        content = None
        for tag in common_tags:
            content_tag = soup.find(**tag)
            if content_tag:
                content = content_tag.get_text(separator=' ', strip=True)
                break

        #Fallback: scrape entire body if no good tag found
        if not content:
            body_tag = soup.find('body')
            if body_tag:
                content = body_tag.get_text(separator=' ', strip=True)
            else:
                content = "Could not find any content."
                raise Exception('No content')

        return jsonify({
            "success" : True,
            "url" : url,
            "content" : content
        })

    except Exception as e:
        return {'success': False, 'error': str(e)}