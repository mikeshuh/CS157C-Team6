# Simple Dockerfile for Flask backend
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 5001

# Start the application
CMD ["flask", "run", "--host=0.0.0.0", "--port=5001"]