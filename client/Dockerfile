# Simple Dockerfile for Next.js frontend
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Set environment variables
ENV NEXT_PUBLIC_API_URL=http://localhost:5001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
