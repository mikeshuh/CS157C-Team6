import os, json
from google import genai
from dotenv import load_dotenv
from flask import jsonify

load_dotenv()

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

class AI():
    def __init__(self, client):
        self.client = client
        self.prompt = "You are a JSON only reponse generator. Always respond with valid JSON that matches the user's requested schema." +\
        " Never include explanations or non-JSON text in your responses." +\
        "Summarize this article into one paragraph and include a key points section with bullet points." +\
        "In the key points section, only include the main points of the article. " +\
        "Return as a JSON object. Here is the JSON schema: " +\
        "Summary = {{'summary': str, 'key_points' : list[str], 'tags' : list[str]}}, " +\
        "Tag the articles based on its content. The max amount of tags an article can have is 4. Populate the tags key only using these options: " +\
        "[World News, Politics, Business, Finance, Health, Science, Entertainment, Sports, Technology, AI, Cybersecurity, Gaming, Travel, Food, Lifestyle]"
        "Here is the article: "

    def summarize_article(self, content):
        query = self.prompt + content
        response = client.models.generate_content(
            model="gemini-2.0-flash", contents=query
        )
        clean_json = response.text.replace("```json", "").replace("```", "").strip() #remove from gemini response
        return jsonify({
            "success": True,
            "summarization" : json.loads(clean_json),
        })

ai_client = AI(client)