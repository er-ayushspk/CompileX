from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os
import subprocess
import shutil
import tempfile
import json
import sys
from threading import Thread
from queue import Queue, Empty

import google.generativeai as genai # Import the Gemini library

# Global Gemini model instance
gemini_model = None

# from pylsp import lsp
# from pylsp.python_lsp import PythonLSPServer

# Fix for Python 3.14 compatibility - set instance_path explicitly to avoid pkgutil.get_loader issue
import pathlib
import os

# Get the absolute path of the current file's directory
instance_path = pathlib.Path(__file__).parent.resolve()

# Create Flask app with explicit instance_path to avoid Python 3.14 compatibility issues
app = Flask(
    __name__,
    static_folder='frontend',
    instance_path=str(instance_path),
    instance_relative_config=False
)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Custom I/O for LSP server
# class LSPSocketIOStream:
#     def __init__(self):
#         self.queue = Queue()

#     def readline(self):
#         return self.queue.get()

#     def write(self, message):
#         # Assuming message is already JSON RPC, just emit it
#         socketio.emit('lsp_message', json.loads(message.decode('utf-8')))

#     def flush(self):
#         pass

# LSP server setup
# Use custom streams for pylsp
# stdin_stream = LSPSocketIOStream()
# stdout_stream = LSPSocketIOStream()

# lsp_server = PythonLSPServer(stdin_stream, stdout_stream)
# lsp_thread = Thread(target=lsp_server.start_event_loop, args=(stdin_stream, stdout_stream))
# lsp_thread.daemon = True
# lsp_thread.start()

# @socketio.on('lsp_message')
# def handle_lsp_message(message):
#     # Put incoming message into the stdin stream for pylsp
#     stdin_stream.queue.put(json.dumps(message).encode('utf-8') + b'\n')

# Dictionary to hold LSP subprocesses, keyed by language ID
lsp_processes = {}
lsp_threads = {}

# Dictionary to store LSP diagnostics by file URI
current_lsp_diagnostics = {}

def start_lsp_process(language_id, root_path):
    global lsp_processes, lsp_threads

    if language_id == 'python':
        cmd = [sys.executable, '-m', 'pylsp']
    elif language_id in ['javascript', 'typescript']:
        # Ensure Node.js and npm are available in the environment
        # You might need to adjust the path to the language server if it's not globally installed
        # For example, if it's in node_modules of the frontend directory:
        lsp_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'node_modules', 'typescript-language-server', 'lib', 'cli.js')
        if not os.path.exists(lsp_path):
            print(f"[LSP Error] {lsp_path} not found. Please run 'npm install' in the frontend directory.")
            return False
        cmd = ['node', lsp_path, '--stdio']
    else:
        print(f"[LSP Error] Unsupported language ID: {language_id}")
        return False

    print(f"[LSP] Starting {language_id} LSP with command: {cmd}")
    process = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        bufsize=0,  # Unbuffered I/O
        cwd=root_path # Set CWD for the LSP process
    )
    lsp_processes[language_id] = process

    # Start a thread to read stdout from LSP process and emit to client
    stdout_thread = Thread(target=read_lsp_stdout, args=(language_id, process), daemon=True)
    lsp_threads[f'{language_id}_stdout'] = stdout_thread
    stdout_thread.start()

    # Start a thread to read stderr from LSP process (for debugging)
    stderr_thread = Thread(target=read_lsp_stderr, args=(language_id, process), daemon=True)
    lsp_threads[f'{language_id}_stderr'] = stderr_thread
    stderr_thread.start()

    return True

def read_lsp_stdout(language_id, process):
    while True:
        line = process.stdout.readline().decode('utf-8')
        if line:
            try:
                # LSP messages are usually prefixed with Content-Length and Content-Type headers
                # For simplicity, we assume one message per line for now, but proper LSP parsing is more complex.
                # However, pylsp and typescript-language-server usually output full JSON RPC messages per line when using --stdio
                message = json.loads(line)
                socketio.emit('lsp_message', { 'languageId': language_id, 'message': message })
            except json.JSONDecodeError:
                print(f"[LSP {language_id} stdout] Malformed JSON: {line.strip()}")
            except Exception as e:
                print(f"[LSP {language_id} stdout] Error processing message: {e} - {line.strip()}")

def read_lsp_stderr(language_id, process):
    while True:
        line = process.stderr.readline().decode('utf-8')
        if line:
            print(f"[LSP {language_id} stderr] {line.strip()}")

@socketio.on('connect')
def on_connect():
    print("Client connected.")
    # Frontend will send 'initialize' message with languageId and rootUri after connection

@socketio.on('lsp_message')
def handle_lsp_message(data):
    language_id = data.get('languageId')
    message = data.get('message')
    root_path = data.get('rootUri') # Expecting rootUri to be sent by frontend with initialize message

    if not language_id or not message:
        print("[LSP Error] Received incomplete LSP message data.")
        return

    if language_id not in lsp_processes or lsp_processes[language_id].poll() is not None:
        # LSP process not running or has terminated, try to start it
        if not root_path:
            print(f"[LSP Error] Cannot start LSP for {language_id}: rootUri missing.")
            return
        # Convert file URI to local path (remove 'file:///' and handle Windows paths if necessary)
        local_root_path = root_path.replace('file:///', '').replace('/', os.sep)
        if sys.platform == "win32" and local_root_path.startswith(os.sep):
            local_root_path = local_root_path[1:] # Remove leading slash for Windows absolute path
        
        print(f"Attempting to start LSP for {language_id} in {local_root_path}")
        if not start_lsp_process(language_id, local_root_path):
            return

    process = lsp_processes.get(language_id)
    if process and process.stdin:
        try:
            # Ensure the message is a proper JSON RPC message string
            json_message = json.dumps(message)
            process.stdin.write(json_message.encode('utf-8') + b'\n')
            process.stdin.flush()
        except Exception as e:
            print(f"[LSP {language_id} Error] Failed to send message to LSP process: {e}")
    else:
        print(f"[LSP Error] LSP process for {language_id} not available.")

    # Check for diagnostics message and update stored diagnostics
    if message.get('method') == 'textDocument/publishDiagnostics':
        uri = message['params']['uri']
        current_lsp_diagnostics[uri] = message['params']['diagnostics']
        print(f"[LSP] Received and stored diagnostics for {uri}")


# Serve the frontend
@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')

@app.route('/api/create-folder', methods=['POST'])
def create_folder_independent():
    data = request.json
    folder_name = data.get('folderName')
    
    if not folder_name:
        return jsonify({'success': False, 'error': 'No folder name provided'})
    
    # Create folder in temp directory if no workspace is open
    folder_path = os.path.join(tempfile.gettempdir(), 'compilex', folder_name)
    
    try:
        os.makedirs(folder_path, exist_ok=True)
        return jsonify({'success': True, 'path': folder_path})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('frontend', path)

# Terminal command execution (simple, non-interactive)
@app.route('/api/terminal/run', methods=['POST'])
def terminal_run():
    try:
        data = request.get_json(force=True) or {}
        command = data.get('command', '').strip()
        if not command:
            return jsonify({'success': False, 'error': 'No command provided.'}), 400

        # Detect platform and build execution command
        if sys.platform == 'win32':
            exec_cmd = ['powershell', '-NoLogo', '-NoProfile', '-Command', command]
        else:
            exec_cmd = command

        # Execute command with timeout and capture output
        completed = subprocess.run(
            exec_cmd,
            shell=(sys.platform != 'win32'),
            capture_output=True,
            text=True,
            timeout=20
        )

        stdout = completed.stdout or ''
        stderr = completed.stderr or ''
        return jsonify({
            'success': completed.returncode == 0,
            'stdout': stdout,
            'stderr': stderr,
            'code': completed.returncode
        })
    except subprocess.TimeoutExpired:
        return jsonify({'success': False, 'error': 'Command execution timed out.'}), 504
    except Exception as e:
        return jsonify({'success': False, 'error': f'Command execution failed: {str(e)}'}), 500

# File operations
@app.route('/api/files/list', methods=['POST'])
def list_files():
    data = request.json
    directory = data.get('directory', '')
    
    # Use current working directory if no directory is specified
    if not directory:
        directory = os.getcwd()
    
    # Normalize path for the operating system
    directory = os.path.normpath(directory)

    try:
        if not os.path.isdir(directory):
            return jsonify({'success': False, 'error': f'Directory not found: {directory}'})

        files = []
        for item in os.listdir(directory):
            item_path = os.path.join(directory, item)
            is_dir = os.path.isdir(item_path)
            if is_dir:
                # For directories, only include name, path, type, and an empty contents list initially
                # The frontend will request actual contents on expansion.
                files.append({
                    'name': item,
                    'path': item_path,
                    'type': 'directory',
                    'contents': [] # Empty for non-recursive listing
                })
            else:
                files.append({
                    'name': item,
                    'path': item_path,
                    'type': 'file'
                })
        return jsonify({'success': True, 'files': files})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# This function will now be called explicitly when a folder is expanded
@app.route('/api/files/get_folder_contents', methods=['POST'])
def get_folder_contents():
    data = request.json
    directory_path = data.get('path', '')

    # Use current working directory if no directory is specified
    if not directory_path:
        directory_path = os.path.normpath(os.getcwd())

    # Normalize path for the operating system
    directory_path = os.path.normpath(directory_path)

    try:
        if not os.path.isdir(directory_path):
            return jsonify({'success': False, 'error': f'Directory not found: {directory_path}'})

        contents = []
        for item in os.listdir(directory_path):
            item_path = os.path.join(directory_path, item);
            is_dir = os.path.isdir(item_path);
            contents.append({
                'name': item,
                'path': item_path,
                'type': 'directory' if is_dir else 'file',
                'contents': [] if is_dir else None # Only populate if explicitly requested later
            })
        return jsonify({'success': True, 'contents': contents})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/files/read', methods=['POST'])
def read_file():
    data = request.json
    file_path = data.get('path', '')
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return jsonify({'success': True, 'content': content})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/files/write', methods=['POST'])
def write_file():
    data = request.json
    file_path = data.get('path', '')
    content = data.get('content', '')
    
    try:
        # Create directory if it doesn't exist
        directory = os.path.dirname(file_path)
        if directory and not os.path.exists(directory):
            os.makedirs(directory)
            
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/files/create_folder', methods=['POST'])
def create_folder():
    data = request.json
    folder_path = data.get('path', '')
    
    try:
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/files/delete', methods=['POST'])
def delete_file():
    data = request.json
    file_path = data.get('path', '')

    try:
        if os.path.isfile(file_path):
            os.remove(file_path)
        elif os.path.isdir(file_path):
            shutil.rmtree(file_path)
        else:
            return jsonify({'success': False, 'error': 'File or folder not found.'})
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/files/rename', methods=['POST'])
def rename_file_or_folder():
    data = request.json
    old_path = data.get('oldPath', '')
    new_path = data.get('newPath', '')
    is_folder = data.get('isFolder', False)

    # Normalize paths for the operating system
    old_path = os.path.normpath(old_path)
    new_path = os.path.normpath(new_path)

    try:
        if not os.path.exists(old_path):
            return jsonify({'success': False, 'error': 'Original file or folder not found.'})
        if os.path.exists(new_path):
            return jsonify({'success': False, 'error': 'A file or folder with the new name already exists.'})

        os.rename(old_path, new_path)
        new_file_name = os.path.basename(new_path)
        return jsonify({'success': True, 'newFileName': new_file_name})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


# AI Agent Endpoint
@app.route('/api/agent', methods=['POST'])
def agent_prompt():
    global gemini_model # Re-added global declaration for gemini_model

    data = request.json # Re-added: Extract JSON data from the request
    user_prompt = data.get('prompt', '') # Re-added: Get the user's prompt
    file_info = data.get('fileInfo', {}) # Re-added: Get file information

    # Lazy initialization of the Gemini model
    if gemini_model is None:
        try:
            # IMPORTANT: In a production environment, NEVER hardcode your API key.
            # Always use environment variables or a secure secret management system.
            # Replace 'YOUR_GEMINI_API_KEY' with your actual Gemini API key.
            # Use provided key by default; still allow overriding via environment variable
            GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyB6auyv8i6buo66MG42rRmbQ07GlNkGTsQ")  # Prefer env var if set
            if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY":
                raise ValueError("Gemini API key is not set. Please replace 'YOUR_GEMINI_API_KEY' with your actual key in app.py.")

            genai.configure(api_key=GEMINI_API_KEY)
            # Try multiple names to support different client versions
            candidate_models = [
                # Newer Flash family (some client versions use the models/ prefix)
                'models/gemini-2.5-flash',
                'gemini-2.5-flash',
                'models/gemini-2.0-flash',
                'gemini-2.0-flash',
                'models/gemini-2.0-flash-lite',
                'gemini-2.0-flash-lite',
                'models/gemini-2.0-flash-exp',
                'gemini-2.0-flash-exp',
                # Older but widely supported fallbacks
                'models/gemini-1.5-flash',
                'gemini-1.5-flash',
                'models/gemini-pro',
                'gemini-pro'
            ]
            last_err = None
            for name in candidate_models:
                try:
                    gemini_model = genai.GenerativeModel(name)
                    # quick no-op to validate model; some clients lazily validate on first call
                    _ = name  # placeholder
                    print(f"[Gemini] Initialized model: {name}")
                    break
                except Exception as me:
                    last_err = me
                    gemini_model = None
                    continue
            if gemini_model is None:
                raise RuntimeError(f"Failed to initialize any Gemini model. Last error: {last_err}")
        except Exception as e:
            return jsonify({'success': False, 'error': f"Error initializing Gemini model with direct key: {str(e)}"}) # Catch initialization errors

    model = gemini_model # Use the globally initialized model

    # Prepare context for the LLM
    context = f"You are an AI coding assistant named CompileX-AI. Your goal is to be both a helpful conversational 'chat guy' and a proactive coding 'agent'.\n"
    context += f"Engage in natural dialogue, provide detailed and insightful explanations, and offer actionable code suggestions or refactorings when appropriate.\n"
    context += f"User query: {user_prompt}.\n\n"
    if file_info and file_info.get('path'):
        context += f"Current File: {os.path.basename(file_info['path'])}\n"
        context += f"Language: {file_info.get('language', 'unknown')}\n"
        context += f"File Content:\n```\n{file_info.get('content', '')}\n```\n"

    # Include LSP diagnostics in the context if available for the current file
    if file_info and file_info.get('path'):
        file_uri = f"file:///{file_info['path'].replace(os.sep, '/')}"
        diagnostics = current_lsp_diagnostics.get(file_uri)
        if diagnostics:
            context += "\nLSP Diagnostics (Errors/Warnings in current file):\n"
            for diag in diagnostics:
                # Simplified diagnostic message for LLM context
                context += f"- [Line {diag['range']['start']['line'] + 1}, Col {diag['range']['start']['character'] + 1}] Severity: {diag.get('severity', 'unknown')} Message: {diag['message']}\n"
            context += "\n"

    context += "Please provide a helpful response. If the user asks for code, generate it in markdown code blocks (```language\ncode\n```). "
    context += "If the user describes an error or a problem, analyze the provided `LSP Diagnostics` (if any) and `File Content` to identify potential causes and suggest concrete solutions or debugging steps.\n"
    context += "If the user asks for refactoring or improvement, provide specific, actionable suggestions, revised code snippets, and a brief explanation of *why* the changes are beneficial.\n\n"

    try:
        print(f"[Gemini] Sending context to Gemini (first 200 chars): {context[:200]}...")
        # Make the actual LLM call using Gemini
        gemini_response = model.generate_content(context)
        response = gemini_response.text
        print(f"[Gemini] Received response from Gemini (first 200 chars): {response[:200]}...")
    except Exception as e:
        print(f"[Gemini ERROR] Exception during API call: {e}") # Log the actual exception
        response = f"Error calling Gemini LLM: {str(e)}. Please check your API key, LLM client setup, and network connection."
    # --- LLM Integration --- End

    # --- Placeholder for Refactoring Suggestions (now potentially LLM-driven) ---
    # If the prompt indicates a request for refactoring, the LLM should ideally handle it.
    # The previous rule-based suggestions are now less relevant with an LLM.
    # We'll keep a simple note for now, assuming the LLM will provide the actual refactoring.
    if "refactor" in user_prompt.lower() or "improve" in user_prompt.lower():
        if "Error calling LLM" not in response: # If LLM call was successful, trust its response
            pass # LLM is expected to provide the refactoring.
        else: # Fallback if LLM failed
            if file_info.get('language') == 'python' and "long function" in user_prompt.lower():
                response += "\n**Refactoring Suggestion (Python - Fallback):**\n"
                response += "Consider breaking down long functions into smaller, more focused functions to improve readability and maintainability.\n"
            elif file_info.get('language') == 'javascript' and "magic numbers" in user_prompt.lower():
                response += "\n**Refactoring Suggestion (JavaScript - Fallback):\n"
                response += "Replace 'magic numbers' (unnamed numerical constants) with named constants to enhance clarity.\n"
            else:
                response += "\n**Refactoring Suggestion (Fallback):**\nI can provide general refactoring advice. For more specific suggestions, ensure your LLM is properly integrated.\n"

    # The basic context-aware response is now part of the LLM prompt, so it's removed here.

    # This final line ensures a response is always sent, even if LLM integration is incomplete.
    if not response or "simulated LLM response" in response:
        response = "I am currently under development and will provide more intelligent assistance soon! (LLM Integration Pending)"

    return jsonify({'success': True, 'response': response})


# Compilation and execution
@app.route('/api/compile', methods=['POST'])
def compile_code():
    data = request.json
    language = data.get('language', '')
    code = data.get('code', '')
    file_path = data.get('file_path', '')
    file_name = data.get('fileName', '')
    input_data = data.get('input', '')
    use_judge0 = data.get('use_judge0', False)  # Default to local execution
    
    # For Python files, use local execution by default
    if language.lower() == 'python':
        use_judge0 = False
    
    if use_judge0:
        try:
            # Use Judge0 API for compilation
            import requests
            import time
            
            # Judge0 API endpoint - using free Judge0 API
            judge0_api_url = "https://judge0-ce.p.rapidapi.com"
            
            # RapidAPI headers for Judge0
            headers = {
                "Content-Type": "application/json",
                "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
                "X-RapidAPI-Key": "AIzaSyCDuwoOhkKKwOhPF4yAhXRm1kF4_Kq1VmA"  # Using the provided API key
            }
            
            # Map our language names to Judge0 language IDs
            language_map = {
                'python': 71,  # Python 3
                'javascript': 63,  # Node.js
                'java': 62,  # Java
                'c': 50,  # C (GCC)
                'cpp': 54,  # C++ (GCC)
                'ruby': 72,  # Ruby
                'go': 60,  # Go
                'rust': 73,  # Rust
                'php': 68,  # PHP
                'swift': 83,  # Swift
                'csharp': 51,  # C#
                'kotlin': 78,  # Kotlin
            }
            
            # Get Judge0 language ID
            language_id = language_map.get(language.lower())
            if not language_id:
                return jsonify({
                    'success': False,
                    'error': f"Language '{language}' not supported by Judge0. Falling back to local compilation."
                })
            
            # Prepare submission payload
            payload = {
                "source_code": code,
                "language_id": language_id,
                "stdin": input_data
            }
            
            # Submit code for execution
            response = requests.post(f"{judge0_api_url}/submissions", json=payload, headers=headers)
            if response.status_code != 201:
                raise Exception(f"Judge0 API error: {response.text}")
            
            # Get token from response
            token = response.json().get('token')
            if not token:
                raise Exception("No token received from Judge0")
            
            # Poll for results (with timeout)
            max_attempts = 10
            attempt = 0
            while attempt < max_attempts:
                time.sleep(1)  # Wait before checking status
                status_response = requests.get(f"{judge0_api_url}/submissions/{token}", headers=headers)
                
                if status_response.status_code != 200:
                    raise Exception(f"Error checking submission status: {status_response.text}")
                
                submission = status_response.json()
                status_id = submission.get('status', {}).get('id')
                
                # Status 3 means the code has finished executing
                if status_id == 3:
                    result = submission.get('stdout', '')
                    error = submission.get('stderr', '') or submission.get('compile_output', '')
                    return jsonify({
                        'success': True,
                        'result': result,
                        'error': error
                    })
                
                # Status 4+ means error/timeout/etc.
                if status_id and status_id >= 4:
                    error = submission.get('stderr', '') or submission.get('compile_output', '') or f"Execution error (status {status_id})"
                    return jsonify({
                        'success': False,
                        'error': error
                    })
                
                attempt += 1
            
            raise Exception("Timed out waiting for Judge0 results")
            
        except Exception as e:
            # Fallback to local compilation if Judge0 fails
            print(f"Judge0 error: {str(e)}. Falling back to local compilation.")
            use_judge0 = False
            # Continue to local compilation below
            
    # If not using Judge0 or Judge0 failed, use local compilation
    if not use_judge0:
        # If file_path is provided, use it; otherwise create a temporary file
        if not file_path:
            temp_dir = tempfile.mkdtemp()
            
            # Comprehensive mapping of languages to file extensions
            extensions = {
                # Scripting languages
                'python': '.py',
                'javascript': '.js',
                'typescript': '.ts',
                'ruby': '.rb',
                'php': '.php',
                'perl': '.pl',
                'lua': '.lua',
                'r': '.r',
                'bash': '.sh',
                'powershell': '.ps1',
                'batch': '.bat',
                
                # Compiled languages
                'java': '.java',
                'c': '.c',
                'cpp': '.cpp',
                'csharp': '.cs',
                'go': '.go',
                'rust': '.rs',
                'swift': '.swift',
                'kotlin': '.kt',
                'scala': '.scala',
                'dart': '.dart',
                
                # Transpiled languages
                'coffeescript': '.coffee',
                
                # Data science
                'julia': '.jl',
                'matlab': '.m',
                
                # Functional languages
                'haskell': '.hs',
                'fsharp': '.fs',
                'clojure': '.clj',
                'lisp': '.lisp',
                'elm': '.elm',
                
                # Database
                'sql': '.sql',
                
                # Others
                'assembly': '.asm',
                'groovy': '.groovy',
                'erlang': '.erl',
                'elixir': '.ex',
                'fortran': '.f90'
            }
            
            ext = extensions.get(language.lower(), '.txt')
            if file_name:
                temp_file_name = file_name
            else:
                temp_file_name = f'code{ext}'
            
            file_path = os.path.join(temp_dir, temp_file_name)
            
            # Write code to file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(code)
    
    # Compile and run based on language
    try:
        result = ''
        error = ''
        
        # Define command separator based on OS
        cmd_sep = '&' if sys.platform == 'win32' else ';'
        
        # Non-executable file types
        non_executable = ['html', 'css', 'scss', 'less', 'json', 'xml', 'svg', 
                         'yaml', 'yml', 'toml', 'markdown', 'md', 'tex']
        
        if language.lower() in non_executable:
            message = f"{language.upper()} files are not directly executable. They should be viewed in a browser or appropriate viewer."
            return jsonify({
                'success': True,
                'result': message,
                'error': ''
            })
        
        # Scripting languages (direct execution)
        elif language.lower() == 'python':
            # Debug: Print file path and check if file exists
            print(f"Debug: Executing Python file: {file_path}")
            print(f"Debug: File exists: {os.path.exists(file_path)}")
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    print(f"Debug: File content preview: {f.read()[:100]}...")
            
            # Try different Python executables on Windows
            python_cmd = 'python'
            if sys.platform == 'win32':
                # Try python3 first, then python
                try:
                    subprocess.run(['python3', '--version'], check=True, capture_output=True)
                    python_cmd = 'python3'
                except (subprocess.CalledProcessError, FileNotFoundError):
                    try:
                        subprocess.run(['python', '--version'], check=True, capture_output=True)
                        python_cmd = 'python'
                    except (subprocess.CalledProcessError, FileNotFoundError):
                        python_cmd = 'py'  # Windows Python Launcher
            
            print(f"Debug: Using Python command: {python_cmd}")
            process = subprocess.Popen([python_cmd, file_path], 
                                      stdout=subprocess.PIPE, 
                                      stderr=subprocess.PIPE)
            stdout, stderr = process.communicate(timeout=10)
            result = stdout.decode('utf-8')
            error = stderr.decode('utf-8')
            
        elif language.lower() == 'javascript':
            # Debug: Print file path and check if file exists
            print(f"Debug: Executing JavaScript file: {file_path}")
            print(f"Debug: File exists: {os.path.exists(file_path)}")
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    print(f"Debug: File content preview: {f.read()[:100]}...")
            
            # Check if Node.js is available
            try:
                subprocess.run(['node', '--version'], check=True, capture_output=True)
                print("Debug: Node.js is available")
            except (subprocess.CalledProcessError, FileNotFoundError):
                print("Debug: Node.js not found, trying alternative...")
                return jsonify({
                    'success': False,
                    'error': 'Node.js is not installed or not in PATH. Please install Node.js to run JavaScript code.'
                })
            
            process = subprocess.Popen(['node', file_path], 
                                      stdout=subprocess.PIPE, 
                                      stderr=subprocess.PIPE)
            stdout, stderr = process.communicate(timeout=10)
            result = stdout.decode('utf-8')
            error = stderr.decode('utf-8')
            
        elif language.lower() == 'typescript':
            # First compile TypeScript to JavaScript
            compile_cmd = ['npx', 'tsc', file_path, '--outDir', os.path.dirname(file_path)]
            compile_process = subprocess.Popen(compile_cmd, 
                                            stdout=subprocess.PIPE, 
                                            stderr=subprocess.PIPE)
            _, stderr = compile_process.communicate(timeout=10)
            
            if compile_process.returncode == 0:
                # Run the compiled JavaScript
                js_file = os.path.splitext(file_path)[0] + '.js'
                run_process = subprocess.Popen(['node', js_file], 
                                              stdout=subprocess.PIPE, 
                                              stderr=subprocess.PIPE)
                stdout, run_stderr = run_process.communicate(timeout=10)
                result = stdout.decode('utf-8')
                error = run_stderr.decode('utf-8')
            else:
                error = stderr.decode('utf-8')
                
        elif language.lower() == 'ruby':
            process = subprocess.Popen(['ruby', file_path], 
                                      stdout=subprocess.PIPE, 
                                      stderr=subprocess.PIPE)
            stdout, stderr = process.communicate(timeout=10)
            result = stdout.decode('utf-8')
            error = stderr.decode('utf-8')
            
        elif language.lower() == 'php':
            process = subprocess.Popen(['php', file_path], 
                                      stdout=subprocess.PIPE, 
                                      stderr=subprocess.PIPE)
            stdout, stderr = process.communicate(timeout=10)
            result = stdout.decode('utf-8')
            error = stderr.decode('utf-8')
            
        elif language.lower() == 'perl':
            process = subprocess.Popen(['perl', file_path], 
                                      stdout=subprocess.PIPE, 
                                      stderr=subprocess.PIPE)
            stdout, stderr = process.communicate(timeout=10)
            result = stdout.decode('utf-8')
            error = stderr.decode('utf-8')
            
        elif language.lower() == 'r':
            process = subprocess.Popen(['Rscript', file_path], 
                                      stdout=subprocess.PIPE, 
                                      stderr=subprocess.PIPE)
            stdout, stderr = process.communicate(timeout=10)
            result = stdout.decode('utf-8')
            error = stderr.decode('utf-8')
            
        elif language.lower() == 'lua':
            process = subprocess.Popen(['lua', file_path], 
                                      stdout=subprocess.PIPE, 
                                      stderr=subprocess.PIPE)
            stdout, stderr = process.communicate(timeout=10)
            result = stdout.decode('utf-8')
            error = stderr.decode('utf-8')
            
        elif language.lower() == 'bash':
            if sys.platform == 'win32':
                # Use WSL bash on Windows if available
                process = subprocess.Popen(['bash', file_path], 
                                          stdout=subprocess.PIPE, 
                                          stderr=subprocess.PIPE,
                                          shell=True)
            else:
                process = subprocess.Popen(['bash', file_path], 
                                          stdout=subprocess.PIPE, 
                                          stderr=subprocess.PIPE)
            stdout, stderr = process.communicate(timeout=10)
            result = stdout.decode('utf-8')
            error = stderr.decode('utf-8')
            
        elif language.lower() == 'powershell':
            process = subprocess.Popen(['powershell', '-File', file_path], 
                                      stdout=subprocess.PIPE, 
                                      stderr=subprocess.PIPE)
            stdout, stderr = process.communicate(timeout=10)
            result = stdout.decode('utf-8')
            error = stderr.decode('utf-8')
            
        # Compiled languages
        elif language.lower() == 'java':
            # Extract class name (assuming it matches the filename)
            class_name = os.path.basename(file_path).replace('.java', '')
            compile_process = subprocess.Popen(['javac', file_path], 
                                            stdout=subprocess.PIPE, 
                                            stderr=subprocess.PIPE)
            _, stderr = compile_process.communicate(timeout=10)
            
            if compile_process.returncode == 0:
                # Run the compiled Java class
                run_process = subprocess.Popen(['java', '-cp', os.path.dirname(file_path), class_name], 
                                              stdout=subprocess.PIPE, 
                                              stderr=subprocess.PIPE)
                stdout, run_stderr = run_process.communicate(timeout=10)
                result = stdout.decode('utf-8')
                error = run_stderr.decode('utf-8')
            else:
                error = stderr.decode('utf-8')
                
        elif language.lower() in ['c', 'cpp']:
            # Determine compiler based on language
            compiler = 'gcc' if language.lower() == 'c' else 'g++'
            output_file = os.path.join(os.path.dirname(file_path), 'output')
            
            # Compile
            compile_process = subprocess.Popen([compiler, file_path, '-o', output_file], 
                                            stdout=subprocess.PIPE, 
                                            stderr=subprocess.PIPE)
            _, stderr = compile_process.communicate(timeout=10)
            
            if compile_process.returncode == 0:
                # Run the compiled executable
                run_process = subprocess.Popen([output_file], 
                                              stdout=subprocess.PIPE, 
                                              stderr=subprocess.PIPE)
                stdout, run_stderr = run_process.communicate(timeout=10)
                result = stdout.decode('utf-8')
                error = run_stderr.decode('utf-8')
            else:
                error = stderr.decode('utf-8')
                
        elif language.lower() == 'go':
            process = subprocess.Popen(['go', 'run', file_path], 
                                      stdout=subprocess.PIPE, 
                                      stderr=subprocess.PIPE)
            stdout, stderr = process.communicate(timeout=10)
            result = stdout.decode('utf-8')
            error = stderr.decode('utf-8')
            
        elif language.lower() == 'rust':
            # Compile Rust code
            output_file = os.path.join(os.path.dirname(file_path), 'rustoutput')
            compile_process = subprocess.Popen(['rustc', file_path, '-o', output_file], 
                                            stdout=subprocess.PIPE, 
                                            stderr=subprocess.PIPE)
            _, stderr = compile_process.communicate(timeout=10)
            
            if compile_process.returncode == 0:
                # Run the compiled executable
                run_process = subprocess.Popen([output_file], 
                                              stdout=subprocess.PIPE, 
                                              stderr=subprocess.PIPE)
                stdout, run_stderr = run_process.communicate(timeout=10)
                result = stdout.decode('utf-8')
                error = run_stderr.decode('utf-8')
            else:
                error = stderr.decode('utf-8')
                
        elif language.lower() == 'swift':
            process = subprocess.Popen(['swift', file_path], 
                                      stdout=subprocess.PIPE, 
                                      stderr=subprocess.PIPE)
            stdout, stderr = process.communicate(timeout=10)
            result = stdout.decode('utf-8')
            error = stderr.decode('utf-8')
            
        # For languages not directly supported, provide a helpful message
        else:
            result = f"Compilation for {language} is not directly supported in this environment.\n"
            result += "You may need to install the appropriate compiler or runtime."
        
        return jsonify({
            'success': True,
            'result': result,
            'error': error
        })
    
    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'error': 'Execution timed out (limit: 10 seconds)'
        })
    except FileNotFoundError as e:
        return jsonify({
            'success': False,
            'error': f'Required executable not found: {str(e)}. Please ensure Python/Node.js is installed and in your PATH.'
        })
    except Exception as e:
        print(f"Debug: Execution error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Execution failed: {str(e)}'
        })
    finally:
        # Clean up temporary directory if created
        if not data.get('file_path') and 'temp_dir' in locals():
            shutil.rmtree(temp_dir, ignore_errors=True)

# Server management
@app.route('/api/restart_server', methods=['POST'])
def restart_server():
    print("Server restart requested.")
    # It's crucial to handle server restarts carefully in production.
    # For development, we can use os.execv to restart the current process.
    # This will terminate the current Python process and start a new one.
    python = sys.executable
    os.execl(python, python, *sys.argv)
    return jsonify({'success': True, 'message': 'Server is restarting...'})

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)