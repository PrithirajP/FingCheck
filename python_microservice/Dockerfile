# Use an official lightweight Python image
FROM python:3.10-slim

# Set the working directory inside the container
WORKDIR /app

# Upgrade pip to the latest version
RUN pip install --upgrade pip

# Copy the requirements file first to leverage Docker's layer caching
COPY requirements.txt .

# Install a CPU-only version of PyTorch to keep the image size drastically smaller
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install the rest of the Python dependencies
# --no-cache-dir prevents pip from saving downloaded packages, reducing image size
RUN pip install --no-cache-dir -r requirements.txt

# Copy your FastAPI script and the PyTorch model file into the container
COPY main.py .
COPY best_model.pth .

# Expose the port Uvicorn uses
EXPOSE 8000

# Start the FastAPI server on 0.0.0.0 so it is accessible outside the container
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]