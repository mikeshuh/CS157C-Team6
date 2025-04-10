import uuid
import pytest
from server.app import create_app

@pytest.fixture
def client():
    # Create app instance with testing settings
    app = create_app()
    app.config["TESTING"] = True
    app.config["MONGO_URI"] = "mongodb://localhost:27017/test_database"
    app.config["JWT_SECRET_KEY"] = "super-secret-key"
    
    with app.test_client() as client:
        with app.app_context():
            # Clear the 'users' and 'articles' collections (if they exist)
            if hasattr(app, 'mongo'):
                app.mongo.db.users.delete_many({})
                app.mongo.db.articles.delete_many({})
        yield client

def test_health_check(client):
    """
    Test that /api/test endpoint returns a healthy response.
    """
    response = client.get('/api/test')
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    # Adjust the expected message if needed
    assert data.get("message") == "Flask Backend is Running!"

def test_home(client):
    """
    Test the home route ("/") returns the expected content.
    """
    response = client.get('/')
    assert response.status_code == 200
    # Verify the content of the homepage; adjust as needed
    assert b"Hello, Flask!" in response.data

def test_register_and_login(client):
    """
    Test that a new user can register and then log in successfully.
    """
    # Generate a unique username for each test run to avoid duplication errors
    unique_username = f"testuser_{uuid.uuid4().hex}"
    
    # Payload for registration
    register_payload = {
        "username": unique_username,
        "password": "secret123",
        "role": "user"
    }
    reg_response = client.post('/register', json=register_payload)
    # Uncomment for debugging:
    # print("Registration response:", reg_response.get_json())
    assert reg_response.status_code == 201, f"Expected 201, got {reg_response.status_code}"
    reg_data = reg_response.get_json()
    # If your endpoint returns a message, you can validate it
    assert "msg" in reg_data and "registered" in reg_data["msg"].lower()

    # Payload for login
    login_payload = {
        "username": unique_username,
        "password": "secret123"
    }
    login_response = client.post('/login', json=login_payload)
    assert login_response.status_code == 201, f"Login failed: {login_response.get_json()}"
    login_data = login_response.get_json()
    # Check that an access token was returned
    assert "access_token" in login_data

def test_duplicate_registration(client):
    """
    Test that trying to register the same user twice returns a 400 error.
    """
    payload = {
        "username": "dupuser",
        "password": "dupsecret",
        "role": "user"
    }
    # First registration should succeed.
    first_response = client.post('/register', json=payload)
    assert first_response.status_code == 201
    
    # Second registration with the same payload should fail.
    second_response = client.post('/register', json=payload)
    assert second_response.status_code == 400
    data = second_response.get_json()
    # Adjust the expectation based on your API's error message.
    assert "msg" in data
    assert "exists" in data["msg"].lower()

#additional

# def test_register_missing_fields(client):
#     """
#     Test that registration fails when required fields are missing.
#     """
#     # For example, omit the "password" field
#     payload = {
#         "username": "user_without_password",
#         # "password" is intentionally omitted
#         "role": "user"
#     }
#     response = client.post('/register', json=payload)
#     # Expecting a 400 error due to missing required fields
#     assert response.status_code == 400, f"Expected 400 for missing fields, got {response.status_code}"

# def test_invalid_content_type(client):
#     """
#     Test that the endpoint returns a 400 error when an invalid content type is used.
#     """
#     # Send data as plain text instead of JSON
#     response = client.post('/register', data="username=test&password=123", content_type="text/plain")
#     # Expect a 400 status code or an error response
#     assert response.status_code == 400, f"Expected 400 for invalid content type, got {response.status_code}"

# def test_login_wrong_password(client):
#     """
#     Test that login fails if the wrong password is provided.
#     """
#     # First, register a user with a known password
#     unique_username = f"testuser_{uuid.uuid4().hex}"
#     register_payload = {
#         "username": unique_username,
#         "password": "correctpassword",
#         "role": "user"
#     }
#     reg_response = client.post('/register', json=register_payload)
#     assert reg_response.status_code == 201, f"User registration failed: {reg_response.get_json()}"

#     # Attempt to log in with an incorrect password
#     login_payload = {
#         "username": unique_username,
#         "password": "wrongpassword"
#     }
#     login_response = client.post('/login', json=login_payload)
#     # The expected response might be 401 Unauthorized or 400, depending on your API error handling
#     assert login_response.status_code in (400, 401), f"Expected login failure with status 400 or 401, got {login_response.status_code}"

# def test_insert_article(client):
#     """
#     Test that an article can be inserted successfully via /api/insert_articles.
#     """
#     article_payload = {
#          "url": "http://example.com/article",
#          "title": "Example Article",
#          "content": "Article content",
#          "author": "Author Name",
#          "published_date": "2025-04-10T00:00:00"
#     }
#     response = client.post('/api/insert_articles', json=article_payload)
#     # Expecting a 201 status code if the insertion is successful
#     assert response.status_code == 201, f"Article insertion failed: {response.get_json()}"

# def test_get_articles(client):
#     """
#     Test that articles can be retrieved using /api/get_articles.
#     """
#     # Insert an article first to ensure there is data
#     article_payload = {
#          "url": "http://example.com/article2",
#          "title": "Another Article",
#          "content": "Content of article 2",
#          "author": "Author 2",
#          "published_date": "2025-04-10T00:00:00"
#     }
#     insert_response = client.post('/api/insert_articles', json=article_payload)
#     assert insert_response.status_code == 201, f"Article insertion failed: {insert_response.get_json()}"
    
#     # Retrieve articles with a filter (adjust query parameters based on your API design)
#     response = client.get('/api/get_articles?title=Another')
#     assert response.status_code == 200, f"Expected 200 when getting articles, got {response.status_code}"
#     data = response.get_json()
#     assert isinstance(data, dict), "Expected the response to be a dictionary."
#     # Assuming your API returns a list under the key "articles"
#     assert "articles" in data, "Response JSON does not contain 'articles' key."
#     # Validate that at least one article matches the inserted article title
#     assert any(article_payload["title"] in article.get("title", "") for article in data["articles"]), "Inserted article not found in response."
