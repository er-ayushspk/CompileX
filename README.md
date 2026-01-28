# # CompileX 🚀

> **A powerful online code editor and compiler supporting 30+ programming languages**

![CompileX](https://img.shields.io/badge/Monaco-Editor-blue)
![Python](https://img.shields.io/badge/Python-3.7+-green)
![Flask](https://img.shields.io/badge/Flask-2.0+-red)
![Judge0](https://img.shields.io/badge/Judge0-API-orange)

## ✨ Features

- **🎨 Beautiful Monaco Editor** - VSCode-style editor with:
  - Colorful syntax highlighting for 30+ languages
  - IntelliSense & autocomplete
  - Bracket pair colorization with rainbow colors
  - Code folding & multi-cursor editing
  - Dark/Light themes

- **🤖 AI Assistant** - Powered by Google Gemini:
  - Code explanations & debugging help
  - Refactoring suggestions
  - Context-aware assistance

- **📁 File Explorer** - Full file system operations:
  - Create/delete/rename files and folders
  - Multi-file editing with tabs
  - Auto-save functionality

- **⚡ Multi-Language Support**:
  - Python, JavaScript, TypeScript, Java
  - C, C++, C#, Go, Rust, Swift
  - Ruby, PHP, Kotlin, Scala, Dart
  - And 20+ more languages!

- **🔧 Code Execution**:
  - Online execution with Judge0 API (30+ languages)
  - Local compilation fallback
  - Live input support for interactive programs
  - Real-time error highlighting

- **🎯 Professional UI**:
  - Resizable panels for custom layouts
  - Modern dark/light themes
  - Smooth animations & transitions
  - Responsive design

## 🚀 Quick Start

### Windows

1. **Double-click** `start_compilex.bat`
2. **Open** `http://localhost:5000` in your browser

### Linux/Mac

```bash
chmod +x start.sh
./start.sh
```

Then open `http://localhost:5000` in your browser.

### Manual Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
python app.py
```

## 📦 Requirements

- **Python 3.7+**
- **Node.js** (optional, for JavaScript/TypeScript)
- **Compilers** (optional, for local compilation):
  - Java JDK, GCC/G++, Go, Rust, etc.

See [SETUP.md](SETUP.md) for detailed setup instructions.

## 🔑 Judge0 API Setup (Optional)

CompileX works without any API key using local compilation. However, for best experience with 30+ languages:

1. Get a free API key from [RapidAPI Judge0](https://rapidapi.com/judge0-official/api/judge0-ce)
2. Set it as an environment variable:

```bash
# Windows
set JUDGE0_API_KEY=your-key-here

# Linux/Mac
export JUDGE0_API_KEY=your-key-here
```

Or edit `app.py` line 525 and insert your key.

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save current file |
| `Ctrl+N` | New file |
| `Ctrl+R` or `F5` | Run code |
| `Ctrl+/` | Toggle comment |
| `Ctrl+Space` | Code suggestions |
| `Ctrl+Shift+F` | Format document |

## 🎨 Screenshots

### Dark Theme
```
┌─────────────────────────────────────────────────┐
│ Beautiful syntax highlighting with Monaco Editor │
│ • Keywords in purple                            │
│ • Strings in orange                            │
│ • Functions in yellow                          │
│ • Comments in green                            │
└─────────────────────────────────────────────────┘
```

### Features
- ✅ Multi-tab editing
- ✅ Live error detection
- ✅ AI-powered assistance
- ✅ File explorer with context menu
- ✅ Output panel with colored logs
- ✅ Resizable panels

## 🧪 Testing

Run the setup test to verify everything is working:

```bash
python test_setup.py
```

## 📚 Documentation

- [Setup Guide](SETUP.md) - Detailed setup instructions
- [Monaco Editor Docs](https://microsoft.github.io/monaco-editor/)
- [Judge0 API Docs](https://ce.judge0.com/)

## 🛠️ Tech Stack

- **Frontend:**
  - Monaco Editor (VSCode editor)
  - Vanilla JavaScript
  - Modern CSS with CSS Grid

- **Backend:**
  - Flask (Python web framework)
  - Flask-SocketIO (WebSocket support)
  - Google Generative AI (Gemini)

- **APIs:**
  - Judge0 CE (Code execution)
  - RapidAPI (API gateway)

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📝 License

This project is open source and available for educational purposes.

## 💡 Tips

- **No API Key?** CompileX will automatically use local compilation
- **New to coding?** Use the AI Assistant for help
- **Pro tip:** Use `Ctrl+Space` for code suggestions
- **Customize:** Resize panels to fit your workflow

## 🔥 What Makes CompileX Cool?

1. **Instant Setup** - Just run and start coding!
2. **Beautiful UI** - Professional VSCode-like interface
3. **Smart Editor** - IntelliSense, syntax highlighting, code folding
4. **AI Powered** - Get coding help from Google Gemini
5. **Multi-Language** - Support for 30+ programming languages
6. **Free Forever** - Works with or without API keys

---

**Made with ❤️ by developers, for developers**

CompileX

A web-based code editor with compilation capabilities for multiple programming languages and local file system integration.

## Features

- Code editing with syntax highlighting and VS Code-like features
- Support for multiple programming languages
- File system operations (open, save, create folders)
- Code compilation and execution
- Agent functionalities for code assistance
- Local folder integration

## Technologies

- Frontend: HTML, CSS, JavaScript
- Backend: Python (Flask)
- Code Editor: Monaco Editor (VS Code's editor)
- File System: Python's os and shutil modules
- Compilation: Language-specific compilers and interpreters