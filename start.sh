#!/bin/bash
# Quick start script for CompileX (Linux/Mac)

echo "=========================================="
echo "Starting CompileX..."
echo "=========================================="
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Start the server
echo ""
echo "=========================================="
echo "CompileX is starting on http://localhost:5000"
echo "Press Ctrl+C to stop the server"
echo "=========================================="
echo ""

python app.py

