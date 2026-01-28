#!/usr/bin/env python3
"""
CompileX Setup Test Script
Tests if all dependencies are installed and working correctly
"""

import sys
import os

def test_python_version():
    """Test if Python version is 3.7+"""
    print("Testing Python version...", end=" ")
    if sys.version_info >= (3, 7):
        print(f"✓ Python {sys.version.split()[0]}")
        return True
    else:
        print(f"✗ Python {sys.version.split()[0]} (requires 3.7+)")
        return False

def test_dependencies():
    """Test if required Python packages are installed"""
    packages = [
        ('flask', 'Flask'),
        ('flask_cors', 'Flask-CORS'),
        ('flask_socketio', 'Flask-SocketIO'),
        ('google.generativeai', 'Google Generative AI'),
        ('requests', 'Requests')
    ]
    
    all_installed = True
    for package_import, package_name in packages:
        try:
            print(f"Testing {package_name}...", end=" ")
            __import__(package_import)
            print("✓")
        except ImportError:
            print(f"✗ Not installed")
            print(f"  Install with: pip install {package_name.lower()}")
            all_installed = False
    
    return all_installed

def test_compilers():
    """Test if common compilers are available"""
    compilers = [
        ('python', 'Python'),
        ('node', 'Node.js'),
        ('javac', 'Java'),
        ('gcc', 'C/C++'),
        ('go', 'Go'),
        ('rustc', 'Rust')
    ]
    
    print("\nTesting installed compilers (optional):")
    for cmd, name in compilers:
        try:
            result = os.system(f"{cmd} --version > NUL 2>&1" if sys.platform == "win32" else f"{cmd} --version > /dev/null 2>&1")
            if result == 0:
                print(f"  {name}: ✓")
            else:
                print(f"  {name}: ✗ (not installed)")
        except Exception:
            print(f"  {name}: ✗ (not installed)")

def test_judge0_api():
    """Test if Judge0 API key is set"""
    print("\nTesting Judge0 API configuration:")
    api_key = os.getenv("JUDGE0_API_KEY")
    if api_key and api_key != "INSERT_YOUR_RAPIDAPI_KEY_HERE":
        print(f"  Judge0 API Key: ✓ Set ({api_key[:10]}...)")
        return True
    else:
        print("  Judge0 API Key: ✗ Not set (will use local compilation)")
        print("  To enable Judge0: export JUDGE0_API_KEY=your-key-here")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("CompileX Setup Test")
    print("=" * 60)
    print()
    
    tests = [
        test_python_version(),
        test_dependencies(),
    ]
    
    test_compilers()
    test_judge0_api()
    
    print()
    print("=" * 60)
    if all(tests):
        print("✓ All required dependencies are installed!")
        print("  Run 'python app.py' to start CompileX")
    else:
        print("✗ Some dependencies are missing")
        print("  Run 'pip install -r requirements.txt' to install them")
    print("=" * 60)

if __name__ == "__main__":
    main()

