# Use official Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements file (Make sure it's named requirements.txt in your folder)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Expose port 8000 for FastAPI
EXPOSE 8000

# Start the backend server
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]