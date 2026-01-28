/**
 * Compiler Module
 * Handles code compilation and execution
 */

class Compiler {
    constructor() {
        this.outputElement = document.getElementById('output');
        this.runButton = document.getElementById('run-btn');
        this.clearOutputButton = document.getElementById('clear-output-btn');

        // Initialize event listeners
        this.initEventListeners();
    }

    initEventListeners() {
        // Run button
        if (this.runButton) {
            this.runButton.addEventListener('click', () => {
                this.runCode();
            });
        }

        // Create or update output panel buttons
        this.setupOutputPanelButtons();

        // Panel tabs
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-target');

                // Update active tab
                document.querySelectorAll('.panel-tab').forEach(t => {
                    t.classList.remove('active');
                });
                tab.classList.add('active');

                // Update active panel section
                document.querySelectorAll('.panel-section').forEach(section => {
                    section.classList.remove('active');
                });
                document.getElementById(target).classList.add('active');
            });
        });
    }
    
    /**
     * Setup output panel buttons (Clear, Copy, Download)
     */
    setupOutputPanelButtons() {
        const panelActions = document.querySelector('.panel-actions');
        if (!panelActions) return;
        
        // Clear output button
        this.clearOutputButton = document.getElementById('clear-output-btn') || document.createElement('button');
        this.clearOutputButton.id = 'clear-output-btn';
        this.clearOutputButton.title = 'Clear Output';
        this.clearOutputButton.innerHTML = '<i class="fas fa-trash"></i> Clear';
        this.clearOutputButton.addEventListener('click', () => {
            this.clearOutput();
        });
        if (!document.getElementById('clear-output-btn')) {
            panelActions.appendChild(this.clearOutputButton);
        }
        
        // Copy output button
        this.copyOutputButton = document.getElementById('copy-output-btn') || document.createElement('button');
        this.copyOutputButton.id = 'copy-output-btn';
        this.copyOutputButton.title = 'Copy Output';
        this.copyOutputButton.innerHTML = '<i class="fas fa-copy"></i> Copy';
        this.copyOutputButton.addEventListener('click', () => {
            this.copyOutput();
        });
        if (!document.getElementById('copy-output-btn')) {
            panelActions.appendChild(this.copyOutputButton);
        }
        
        // Download output button
        this.downloadOutputButton = document.getElementById('download-output-btn') || document.createElement('button');
        this.downloadOutputButton.id = 'download-output-btn';
        this.downloadOutputButton.title = 'Download Output';
        this.downloadOutputButton.innerHTML = '<i class="fas fa-download"></i> Download Output';
        this.downloadOutputButton.addEventListener('click', () => {
            this.downloadOutput();
        });
        if (!document.getElementById('download-output-btn')) {
            panelActions.appendChild(this.downloadOutputButton);
        }
    }

    /**
     * Copy output content to clipboard
     */
    copyOutput() {
        if (!this.outputElement) return;
        
        // Get text content from output panel
        const outputText = Array.from(this.outputElement.querySelectorAll('.output-line'))
            .map(line => line.textContent)
            .join('\n');
            
        // Copy to clipboard
        navigator.clipboard.writeText(outputText)
            .then(() => {
                this.appendOutput('Output copied to clipboard', 'success');
            })
            .catch(err => {
                this.appendOutput('Failed to copy output: ' + err, 'error');
            });
    }
    
    /**
     * Download output content as a text file
     */
    downloadOutput() {
        if (!this.outputElement) return;
        
        // Get text content from output panel
        const outputText = Array.from(this.outputElement.querySelectorAll('.output-line'))
            .map(line => line.textContent)
            .join('\n');
            
        // Create blob and download link
        const blob = new Blob([outputText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'output.txt';
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
        
        this.appendOutput('Output downloaded as output.txt', 'success');
    }
    
    /**
     * Clear the output panel
     */
    clearOutput() {
        if (this.outputElement) {
            this.outputElement.innerHTML = '';
            // Add welcome message
            this.showWelcomeMessage();
        }
    }
    
    /**
     * Show welcome message in output panel
     */
    showWelcomeMessage() {
        if (this.outputElement) {
            const welcomeHtml = `
                <div class="welcome-panel">
                    <h3>Welcome to CompileX!</h3>
                    <div class="shortcuts-section">
                        <h4>Keyboard Shortcuts</h4>
                        <ul>
                            <li><strong>F5</strong> - Run code</li>
                            <li><strong>Ctrl+S</strong> - Save file</li>
                            <li><strong>Ctrl+N</strong> - New file</li>
                            <li><strong>Ctrl+Tab</strong> - Switch tabs</li>
                            <li><strong>Ctrl+/</strong> - Comment/uncomment</li>
                            <li><strong>Ctrl+Space</strong> - Trigger suggestions</li>
                            <li><strong>Ctrl+Shift+F</strong> - Format document</li>
                            <li><strong>Ctrl+Enter</strong> - Run code</li>
                        </ul>
                    </div>
                    <div class="about-section">
                        <h4>About CompileX</h4>
                        <p>CompileX is a lightweight code editor and compiler that supports multiple programming languages.</p>
                        <p>Features include syntax highlighting, code completion, and real-time error checking.</p>
                    </div>
                </div>
            `;
            this.outputElement.innerHTML = welcomeHtml;
        }
    }
    
    /**
     * Append text to the output panel
     * @param {string} text - Text to append
     * @param {string} type - Type of output (info, error, success, warning)
     */
    appendOutput(text, type = 'info') {
        if (!this.outputElement) return;
        
        const outputLine = document.createElement('div');
        outputLine.className = `output-line ${type}`;
        
        // Add appropriate icon based on message type
        let icon = '';
        switch(type) {
            case 'success':
                icon = '🟩 ';
                break;
            case 'warning':
                icon = '🟨 ';
                break;
            case 'error':
                icon = '🟥 ';
                break;
            default:
                icon = '';
        }
        
        outputLine.textContent = icon + text;
        this.outputElement.appendChild(outputLine);
        
        // Scroll to bottom
        this.outputElement.scrollTop = this.outputElement.scrollHeight;
    }

    /**
     * Run the code in the current editor
     */
    runCode() {
        // Get current file info
        const fileInfo = window.editorManager.getCurrentFileInfo();
        if (!fileInfo) {
            this.appendOutput('Error: No file is open', 'error');
            return;
        }
        
        // Get the current tab info
        const activeTab = window.editorManager.activeTab;
        const tab = window.editorManager.tabs.get(activeTab);
        
        // Determine language from file extension or tab language
        const fileName = tab ? (tab.name || tab.title || '') : (fileInfo.fileName || fileInfo.path || '');
        
        // Safely get file extension
        let fileExtension = 'txt';
        if (fileName && typeof fileName === 'string' && fileName.includes('.')) {
            fileExtension = fileName.split('.').pop().toLowerCase();
        }
        
        let language = tab ? tab.language : (fileInfo.language || 'python'); // Default to python for new files
        
        // If no language detected, try to detect from extension
        if (!language && fileExtension) {
            language = this.getLanguageFromExtension(fileExtension);
        }

        // Comprehensive mapping of file extensions to language names
        const extensionToLanguage = {
            // Web Development
            'js': 'javascript',
            'ts': 'typescript',
            'jsx': 'javascript',
            'tsx': 'typescript',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'less': 'less',
            'json': 'json',
            'xml': 'xml',
            'svg': 'svg',
            
            // Backend/Systems
            'py': 'python',
            'java': 'java',
            'c': 'c',
            'h': 'c',
            'cpp': 'cpp',
            'hpp': 'cpp',
            'cs': 'csharp',
            'go': 'go',
            'rs': 'rust',
            'rb': 'ruby',
            'php': 'php',
            'pl': 'perl',
            'swift': 'swift',
            'kt': 'kotlin',
            'scala': 'scala',
            'dart': 'dart',
            'lua': 'lua',
            
            // Scripting
            'sh': 'bash',
            'bash': 'bash',
            'ps1': 'powershell',
            'bat': 'batch',
            'cmd': 'batch',
            
            // Data Science
            'r': 'r',
            'jl': 'julia',
            'matlab': 'matlab',
            'm': 'matlab',
            
            // Functional
            'hs': 'haskell',
            'fs': 'fsharp',
            'clj': 'clojure',
            'lisp': 'lisp',
            'elm': 'elm',
            
            // Database
            'sql': 'sql',
            
            // Configuration
            'yaml': 'yaml',
            'yml': 'yaml',
            'toml': 'toml',
            
            // Markup
            'md': 'markdown',
            'tex': 'latex',
            
            // Others
            'asm': 'assembly',
            'vb': 'vb',
            'groovy': 'groovy',
            'coffee': 'coffeescript',
            'erl': 'erlang',
            'ex': 'elixir',
            'f': 'fortran',
            'f90': 'fortran'
        };
        
        if (extensionToLanguage[fileExtension]) {
            language = extensionToLanguage[fileExtension];
        } else if (fileInfo.language) {
            language = fileInfo.language;
        }

        // Messages for non-executable file types
        const nonExecutableMessages = {
            'html': 'HTML files are not directly executable. They should be opened in a browser.',
            'css': 'CSS files are not directly executable. They should be linked with HTML and opened in a browser.',
            'scss': 'SCSS files need to be compiled to CSS first.',
            'less': 'LESS files need to be compiled to CSS first.',
            'json': 'JSON files are data files and not directly executable.',
            'xml': 'XML files are data/configuration files and not directly executable.',
            'svg': 'SVG files are vector graphics and should be viewed in a browser or image viewer.',
            'yaml': 'YAML files are configuration files and not directly executable.',
            'yml': 'YAML files are configuration files and not directly executable.',
            'toml': 'TOML files are configuration files and not directly executable.',
            'markdown': 'Markdown files should be rendered to HTML or viewed in a markdown viewer.',
            'md': 'Markdown files should be rendered to HTML or viewed in a markdown viewer.',
            'tex': 'LaTeX files need to be compiled to PDF or other formats.'
        };

        // Check if the file type is non-executable
        if (nonExecutableMessages[language] || nonExecutableMessages[fileExtension]) {
            const message = nonExecutableMessages[language] || nonExecutableMessages[fileExtension];
            this.appendOutput(message, 'info');
            return;
        }

        // Show loading indicator
        this.appendOutput('Running code...', 'info');

        // Make sure output panel is visible
        document.querySelector('.panel-tab[data-target="output"]').click();

        // Fix JavaScript code if needed
        let processedCode = fileInfo.content;
        if (language === 'javascript' || language === 'typescript') {
            // Replace print() with console.log() for JavaScript/TypeScript files
            processedCode = fileInfo.content.replace(/print\s*\(\s*([^)]*)\s*\)/g, 'console.log($1)');
        }
        
        // Check if code requires input
        const requiresInput = this.codeRequiresInput(processedCode, language);
        
        // For new files without paths, we'll run directly without saving
        // For existing files, save first
        let savePromise = Promise.resolve();
        if (fileInfo.path) {
            savePromise = window.fileExplorer.saveFile(fileInfo.path, fileInfo.content);
        }

        // After saving (or immediately for new files), compile and run
        savePromise.then(() => {
            if (requiresInput) {
                // Show enhanced input prompt with better UI
                this.showInputPrompt(processedCode, language, fileName, fileInfo.path || null);
            } else {
                // Run without input - pass null for filePath if it doesn't exist on disk
                this.compileAndRun(processedCode, language, fileName, fileInfo.path || null);
            }
        }).catch(error => {
            console.error('Error saving file:', error);
            // Even if saving fails, try to run the code
            if (requiresInput) {
                this.showInputPrompt(processedCode, language, fileName, fileInfo.path || null);
            } else {
                this.compileAndRun(processedCode, language, fileName, fileInfo.path || null);
            }
        });
    }
    
    /**
     * Check if code requires input
     */
    codeRequiresInput(code, language) {
        const inputPatterns = {
            'python': /input\s*\(/i,
            'java': /Scanner|System\.in\.read|BufferedReader/i,
            'c': /scanf|getchar|fgets/i,
            'cpp': /cin|scanf|getchar|fgets/i,
            'javascript': /prompt\s*\(/i,
            'typescript': /prompt\s*\(/i,
            'ruby': /gets|readline/i,
            'php': /fgets\s*\(\s*STDIN/i,
            'go': /fmt\.Scan|bufio\.NewScanner/i
        };
        
        return inputPatterns[language] && inputPatterns[language].test(code);
    }
    
    /**
     * Show input prompt for programs that require input
     */
    showInputPrompt(code, language, fileName, filePath) {
        // Create input container if it doesn't exist
        if (!document.getElementById('input-container')) {
            const inputContainer = document.createElement('div');
            inputContainer.id = 'input-container';
            inputContainer.className = 'input-container';
            
            const inputHeader = document.createElement('div');
            inputHeader.className = 'input-header';
            inputHeader.innerHTML = '<h3>Program Input</h3>';
            
            const inputTextarea = document.createElement('textarea');
            inputTextarea.id = 'program-input';
            inputTextarea.className = 'program-input';
            inputTextarea.placeholder = 'Enter input for your program (one value per line)';
            
            const inputActions = document.createElement('div');
            inputActions.className = 'input-actions';
            
            const runButton = document.createElement('button');
            runButton.id = 'run-with-input-btn';
            runButton.className = 'btn btn-primary';
            runButton.innerHTML = '<i class="fas fa-play"></i> Run with Input';
            
            const cancelButton = document.createElement('button');
            cancelButton.id = 'cancel-input-btn';
            cancelButton.className = 'btn btn-secondary';
            cancelButton.innerHTML = '<i class="fas fa-times"></i> Cancel';
            
            inputActions.appendChild(runButton);
            inputActions.appendChild(cancelButton);
            
            inputContainer.appendChild(inputHeader);
            inputContainer.appendChild(inputTextarea);
            inputContainer.appendChild(inputActions);
            
            this.outputElement.appendChild(inputContainer);
            
            // Add event listeners
            runButton.addEventListener('click', () => {
                const input = inputTextarea.value;
                this.compileAndRunWithInput(code, language, fileName, filePath, input);
                inputContainer.style.display = 'none';
            });
            
            cancelButton.addEventListener('click', () => {
                inputContainer.style.display = 'none';
                this.clearOutput();
                this.appendOutput('Execution canceled by user', 'info');
            });
        } else {
            const inputContainer = document.getElementById('input-container');
            inputContainer.style.display = 'block';
            document.getElementById('program-input').value = '';
            
            // Update event listener for the run button
            document.getElementById('run-with-input-btn').onclick = () => {
                const input = document.getElementById('program-input').value;
                this.compileAndRunWithInput(code, language, fileName, filePath, input);
                inputContainer.style.display = 'none';
            };
        }
    }
    
    /**
     * Compile and run code with input
     */
    compileAndRunWithInput(code, language, fileName, filePath, input) {
        fetch('/api/compile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                language: language,
                code: code,
                file_path: filePath,
                fileName: fileName,
                input: input
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            } else {
                throw new Error('⚠️ Code execution failed - Server returned non-JSON response');
            }
        })
        .then(data => this.handleCompileResponse(data))
        .catch(error => {
            console.error('Error running code:', error);
            this.appendOutput(`⚠️ Code execution failed - ${error.message}`, 'error');
            // Show a clean error popup
            this.showErrorPopup('Code execution failed', 'Please check your code and try again.');
        });
    }
    
    /**
     * Compile and run code without input
     */
    compileAndRun(code, language, fileName, filePath) {
        fetch('/api/compile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                language: language,
                code: code,
                file_path: filePath,
                fileName: fileName
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            } else {
                throw new Error('⚠️ Code execution failed - Server returned non-JSON response');
            }
        })
        .then(data => this.handleCompileResponse(data))
        .catch(error => {
            console.error('Error running code:', error);
            this.appendOutput(`⚠️ Code execution failed - ${error.message}`, 'error');
            // Show a clean error popup
            this.showErrorPopup('Code execution failed', 'Please check your code and try again.');
        });
    }
    
    /**
     * Show error popup
     * @param {string} title - Error title
     * @param {string} message - Error message
     */
    showErrorPopup(title, message) {
        // Create popup element if it doesn't exist
        let errorPopup = document.getElementById('error-popup');
        if (!errorPopup) {
            errorPopup = document.createElement('div');
            errorPopup.id = 'error-popup';
            errorPopup.className = 'error-popup';
            document.body.appendChild(errorPopup);
            
            // Add styles if not already in CSS
            if (!document.getElementById('error-popup-styles')) {
                const style = document.createElement('style');
                style.id = 'error-popup-styles';
                style.textContent = `
                    .error-popup {
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        background-color: #ff3333;
                        color: white;
                        padding: 15px 20px;
                        border-radius: 5px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        z-index: 9999;
                        max-width: 350px;
                        opacity: 0;
                        transform: translateY(20px);
                        transition: opacity 0.3s, transform 0.3s;
                    }
                    .error-popup.show {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    .error-popup-title {
                        font-weight: bold;
                        margin-bottom: 5px;
                        display: flex;
                        justify-content: space-between;
                    }
                    .error-popup-close {
                        cursor: pointer;
                        font-size: 18px;
                        line-height: 14px;
                    }
                    .error-popup-message {
                        font-size: 14px;
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        // Set content
        errorPopup.innerHTML = `
            <div class="error-popup-title">
                <span>❌ ${title}</span>
                <span class="error-popup-close">&times;</span>
            </div>
            <div class="error-popup-message">${message}</div>
        `;
        
        // Show popup
        setTimeout(() => {
            errorPopup.classList.add('show');
        }, 10);
        
        // Add close button event
        errorPopup.querySelector('.error-popup-close').addEventListener('click', () => {
            errorPopup.classList.remove('show');
            setTimeout(() => {
                errorPopup.remove();
            }, 300);
        });
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            if (errorPopup && document.body.contains(errorPopup)) {
                errorPopup.classList.remove('show');
                setTimeout(() => {
                    if (errorPopup && document.body.contains(errorPopup)) {
                        errorPopup.remove();
                    }
                }, 300);
            }
        }, 5000);
    }

    /**
     * Handle compile response
     */
    handleCompileResponse(data) {
        // Clear previous output - don't show welcome message
        if (this.outputElement) {
            this.outputElement.innerHTML = '';
        }

        // Clear previous editor markers
        if (window.editorManager) {
            window.editorManager.clearMarkers();
        }

        if (data.success) {
            // Show result - properly handle multiline output
            if (data.result) {
                const resultLines = typeof data.result === 'string' ? data.result.split('\n') : [String(data.result)];
                resultLines.forEach(line => {
                    if (line.trim() !== '' || resultLines.length === 1) {
                        this.appendOutput(line, 'output');
                    }
                });
            }

            // Show error if any and set editor markers
            if (data.error && data.error.trim()) {
                const errorLines = typeof data.error === 'string' ? data.error.split('\n') : [String(data.error)];
                errorLines.forEach(line => {
                    if (line.trim() !== '') {
                        this.appendOutput(line, 'error');
                    }
                });
                this.displayErrorsInEditor(data.error);
            }

            // If no output and no error
            if (!data.result && (!data.error || !data.error.trim())) {
                this.appendOutput('Code executed successfully with no output.', 'success');
            }
            
            // Show Judge0 execution stats if available
            if (data.stats) {
                this.appendOutput(`Execution time: ${data.stats.time}s | Memory: ${data.stats.memory}KB`, 'info');
                
                // Add additional Judge0 metrics if available
                if (data.stats.cpu) {
                    this.appendOutput(`CPU usage: ${data.stats.cpu}%`, 'info');
                }
            }
        } else {
            // Show error and set editor markers
            const errorMessage = data.error || 'Unknown error occurred';
            if (errorMessage && typeof errorMessage === 'string') {
                const errorLines = errorMessage.split('\n');
                errorLines.forEach(line => {
                    if (line.trim() !== '') {
                        this.appendOutput(line, 'error');
                    }
                });
                this.displayErrorsInEditor(errorMessage);
            } else {
                this.appendOutput('Code execution failed: Unknown error', 'error');
            }
        }
    }

    /**
     * Append output to the output panel
     * @param {string} text - Text to append
     * @param {string} type - Type of output (output, error, info)
     */
    appendOutput(text, type = 'output') {
        const outputDiv = document.createElement('div');
        outputDiv.className = `output-line ${type}`;
        outputDiv.textContent = text;

        this.outputElement.appendChild(outputDiv);

        // Scroll to bottom
        this.outputElement.scrollTop = this.outputElement.scrollHeight;
    }

    /**
     * Clear the output panel
     */
    clearOutput() {
        if (this.outputElement) {
            this.outputElement.innerHTML = '';
            // Don't show welcome message - just clear the output
        }
    }

    /**
     * Display compilation errors in the editor using Monaco's setModelMarkers
     * @param {string} errorText - The raw error text from the compiler
     */
    displayErrorsInEditor(errorText) {
        if (!errorText || typeof errorText !== 'string') return;
        
        const markers = [];
        const lines = errorText.split('\n');
        
        if (!window.editorManager || !window.editorManager.monaco) return;

        lines.forEach(line => {
            // Attempt to parse common error formats
            let match;

            // Python errors (e.g., File "<stdin>", line 1, in <module>\n    print(x)) - We are interested in the line number where the actual error occurred
            if (match = line.match(/File ".*", line (\d+)/)) {
                const lineNumber = parseInt(match[1]);
                markers.push({
                    severity: window.editorManager.monaco.MarkerSeverity.Error,
                    startLineNumber: lineNumber,
                    startColumn: 1,
                    endLineNumber: lineNumber,
                    endColumn: 1000, // Extend to end of line
                    message: line
                });
            }
            // JavaScript/Node.js errors (e.g., /path/to/code.js:1:10 - Error message)
            else if (match = line.match(/(.+):(\d+):(\d+) - (.*)/)) {
                const [_, filePath, lineNumber, column, message] = match;
                markers.push({
                    severity: window.editorManager.monaco.MarkerSeverity.Error,
                    startLineNumber: parseInt(lineNumber),
                    startColumn: parseInt(column),
                    endLineNumber: parseInt(lineNumber),
                    endColumn: parseInt(column) + 1,
                    message: message.trim()
                });
            }
            // General errors: If no specific format is matched, add a general marker on the first line
            else if (line.trim() !== '') {
                markers.push({
                    severity: window.editorManager.monaco.MarkerSeverity.Error,
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: 1000,
                    message: line.trim()
                });
            }
        });

        if (markers.length > 0) {
            window.editorManager.setEditorMarkers(markers);
            if (window.updateProblemsPanel) {
                window.updateProblemsPanel();
            }
        }
    }

    /**
     * Get language ID from file extension
     * @param {string} extension - File extension
     * @returns {string} - Language ID for compiler API
     */
    getLanguageFromExtension(extension) {
        const languageMap = {
            'js': 'javascript',
            'ts': 'typescript',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'py': 'python',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cs': 'csharp',
            'go': 'go',
            'php': 'php',
            'rb': 'ruby',
            'rs': 'rust',
            'swift': 'swift',
            'md': 'markdown',
            'xml': 'xml',
            'sql': 'sql',
            'sh': 'shell',
            'bat': 'bat',
            'ps1': 'powershell',
            'yaml': 'yaml',
            'yml': 'yaml',
            'txt': 'plaintext'
        };

        return languageMap[extension] || 'plaintext';
    }
}

// Export for use in other modules
// Don't auto-initialize - let index.html handle it to avoid double initialization
// window.compiler = new Compiler();