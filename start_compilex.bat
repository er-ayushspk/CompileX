@echo off
cls
echo ==========================================
echo CompileX - Online Code Editor
echo ==========================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed!
    echo Please install Python 3.7+ from https://www.python.org/
    pause
    exit /b
)

:: Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

:: Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

:: Install requirements
echo.
echo Installing dependencies...
pip install -r requirements.txt

:: Download Monaco Editor if not already downloaded
if not exist "frontend\lib\monaco-editor\min" (
    echo.
    echo Downloading Monaco Editor...
    python download_monaco.py
)

:: Start the application
echo.
echo ==========================================
echo Starting CompileX on http://localhost:5000
echo Press Ctrl+C to stop the server
echo ==========================================
echo.

python app.py
pause