# Use a lightweight Python base image
FROM python:3.9-slim

# Create a directory inside the container for your app code
WORKDIR /app

# Copy your requirements file first (for caching installs)
COPY requirements.txt /app

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your code into the container
COPY . /app

# Expose the port your Flask app runs on (default 5000)
EXPOSE 5000

# Set environment variables if needed (e.g., Flask settings)
# ENV FLASK_ENV=development

# If your Flask "entry point" is app.py or something else, use that here
# Example if you typically do: "python server/app.py"
CMD ["flask", "run", "--host=0.0.0.0"]

# If you normally do "flask run", you can do:
# CMD ["flask", "run", "--host=0.0.0.0"]