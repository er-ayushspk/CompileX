# CompileX Setup Guide

## Quick Start

1. **Install Python Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the Application:**
   ```bash
   python app.py
   ```

3. **Open in Browser:**
   Navigate to `http://localhost:5000`

## Judge0 API Setup (Optional but Recommended)

CompileX supports **both online and local compilation**:

### Option 1: Use Judge0 API (Recommended for 30+ languages)

1. **Get a Free RapidAPI Key:**
   - Go to [RapidAPI Judge0 CE](https://rapidapi.com/judge0-official/api/judge0-ce)
   - Sign up for a free account
   - Subscribe to the FREE plan (50 requests/day)
   - Copy your API key

2. **Set the API Key:**
   
   **Option A - Environment Variable (Recommended):**
   ```bash
   # Windows (PowerShell)
   $env:JUDGE0_API_KEY = "your-api-key-here"
   
   # Windows (CMD)
   set JUDGE0_API_KEY=your-api-key-here
   
   # Linux/Mac
   export JUDGE0_API_KEY=your-api-key-here
   ```
   
   **Option B - Edit app.py:**
   ```python
   # Line 525 in app.py
   "X-RapidAPI-Key": os.getenv("JUDGE0_API_KEY", "INSERT_YOUR_KEY_HERE")
   ```

### Option 2: Use Local Compilation (No API Key Required)

If you don't set up Judge0, CompileX will automatically fall back to local compilation. You'll need the compilers installed:

- **Python:** `python` (usually pre-installed)
- **JavaScript:** `node` ([Download Node.js](https://nodejs.org/))
- **Java:** `javac` and `java` ([Download JDK](https://www.oracle.com/java/technologies/downloads/))
- **C/C++:** `gcc` or `g++` ([Download MinGW for Windows](https://www.mingw-w64.org/))
- **Go:** `go` ([Download Go](https://go.dev/dl/))
- **Rust:** `rustc` ([Download Rust](https://www.rust-lang.org/tools/install))

## Features

✨ **30+ Programming Languages** - Python, JavaScript, Java, C, C++, Ruby, Go, Rust, PHP, Swift, C#, Kotlin, and more!

✨ **Beautiful Monaco Editor** - VSCode-style editor with:
- Colorful syntax highlighting
- IntelliSense/autocomplete
- Bracket pair colorization
- Code folding
- Multi-cursor editing

✨ **AI Assistant** - Powered by Google Gemini:
- Get code explanations
- Debug assistance
- Code refactoring suggestions
- Context-aware help

✨ **File Explorer** - Full file system operations:
- Create/delete files and folders
- Rename and move files
- Multi-file editing
- Auto-save functionality

✨ **Resizable Panels** - Customize your workspace layout

✨ **Dark/Light Themes** - Easy theme switching

✨ **Live Code Execution** - Run code with live input support

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save current file |
| `Ctrl+N` | New file |
| `Ctrl+O` | Open folder |
| `Ctrl+W` | Close current tab |
| `F5` or `Ctrl+R` | Run code |
| `Ctrl+/` | Comment/uncomment lines |
| `Ctrl+Space` | Trigger code suggestions |
| `Ctrl+Shift+F` | Format document |
| `Ctrl+Enter` | Run code |

## Troubleshooting

### Code execution fails with 500 error
- **With Judge0:** Check that your API key is set correctly
- **Without Judge0:** Make sure the compiler for your language is installed

### Syntax highlighting not working
- Refresh the page (F5)
- Check that the file extension is correct (.py, .js, .cpp, etc.)

### File explorer not updating
- Click the refresh button in the explorer
- Reload the page if needed

## Project Structure

```
CompileX/
├── app.py                 # Flask backend
├── frontend/
│   ├── index.html         # Main HTML
│   ├── css/
│   │   └── style.css      # Styles
│   └── js/
│       ├── app.js         # Main app logic
│       ├── editor.js      # Monaco editor
│       ├── compiler.js    # Code compilation
│       ├── agent.js       # AI assistant
│       └── file-explorer.js  # File operations
├── requirements.txt       # Python dependencies
└── README.md             # Project info
```

## Support

For issues or questions, please check:
- [Monaco Editor Documentation](https://microsoft.github.io/monaco-editor/)
- [Judge0 API Documentation](https://ce.judge0.com/)
- [Flask Documentation](https://flask.palletsprojects.com/)

## License

This project is open source and available for educational purposes.

---

**Made with ❤️ using Monaco Editor, Judge0, and Flask**

