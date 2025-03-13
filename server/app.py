from flask import Flask
from flask_cors import CORS
app = Flask(__name__)
CORS(app)
@app.route('/')
def home():
    return "Hello, Flask!"


@app.route('/api/test', methods=['GET'])
def test():
    return {"message": "Flask Backend is Running!"}

if __name__ == '__main__':
    app.run(debug=True)