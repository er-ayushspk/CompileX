// IDE State Management
class IDEState {
    constructor() {
        this.files = new Map();
        this.activeFile = null;
        this.editor = null;
        this.recentFiles = JSON.parse(localStorage.getItem('recentFiles') || '[]');
        this.fileCounter = 1;
        this.isResizing = false;
        this.aiMessages = [];
    }

    addFile(name, content = '', language = 'javascript') {
        const file = {
            id: Date.now() + Math.random(),
            name,
            content,
            language,
            modified: false,
            path: name
        };
        this.files.set(file.id, file);
        this.updateRecentFiles(name);
        return file;
    }

    updateRecentFiles(fileName) {
        this.recentFiles = this.recentFiles.filter(f => f !== fileName);
        this.recentFiles.unshift(fileName);
        this.recentFiles = this.recentFiles.slice(0, 10);
        localStorage.setItem('recentFiles', JSON.stringify(this.recentFiles));
        this.renderRecentFiles();
    }

    renderRecentFiles() {
        const recentContainer = document.getElementById('recentFiles');
        if (this.recentFiles.length === 0) {
            recentContainer.innerHTML = '<p class="no-recent">No recent files</p>';
            return;
        }

        recentContainer.innerHTML = this.recentFiles.map(fileName => 
            `<div class="recent-file" onclick="ideState.openRecentFile('${fileName}')">
                <i class="fas fa-file"></i>
                <span>${fileName}</span>
            </div>`
        ).join('');
    }

    openRecentFile(fileName) {
        // Check if file already exists
        for (let [id, file] of this.files) {
            if (file.name === fileName) {
                this.setActiveFile(id);
                return;
            }
        }
        
        // Create new file if it doesn't exist
        const file = this.addFile(fileName);
        this.setActiveFile(file.id);
        this.renderTabs();
        this.renderFileTree();
    }

    deleteFile(fileId) {
        const file = this.files.get(fileId);
        if (file) {
            this.files.delete(fileId);
            if (this.activeFile === fileId) {
                this.activeFile = null;
                this.showWelcomeTab();
            }
            this.renderTabs();
            this.renderFileTree();
        }
    }

    setActiveFile(fileId) {
        if (this.activeFile && this.editor) {
            // Save current file content
            const currentFile = this.files.get(this.activeFile);
            if (currentFile) {
                currentFile.content = this.editor.getValue();
            }
        }

        this.activeFile = fileId;
        const file = this.files.get(fileId);
        
        if (file) {
            this.hideWelcomeTab();
            this.showEditor();
            
            if (this.editor) {
                this.editor.setValue(file.content);
                this.setEditorLanguage(file.language);
                updateStatusBarLanguage(file.language);
            }
            
            this.updateActiveTab();
            this.updateActiveFileInTree();
        }
    }

    showWelcomeTab() {
        document.getElementById('welcomeTab').style.display = 'block';
        document.getElementById('monacoEditor').style.display = 'none';
    }

    hideWelcomeTab() {
        document.getElementById('welcomeTab').style.display = 'none';
    }

    showEditor() {
        document.getElementById('monacoEditor').style.display = 'block';
    }

    setEditorLanguage(language) {
        if (this.editor) {
            const model = this.editor.getModel();
            if (model) {
                monaco.editor.setModelLanguage(model, language);
            }
        }
    }

    getLanguageFromExtension(fileName) {
        const ext = fileName.split('.').pop()?.toLowerCase();
        const languageMap = {
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
            'txt': 'plaintext',
            'cpp': 'cpp',
            'c': 'c',
            'java': 'java',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust'
        };
        return languageMap[ext] || 'plaintext';
    }

    renderTabs() {
        const tabBar = document.getElementById('tabBar');
        if (this.files.size === 0) {
            tabBar.innerHTML = '';
            return;
        }

        tabBar.innerHTML = Array.from(this.files.values()).map(file => 
            `<div class="tab ${this.activeFile === file.id ? 'active' : ''}" data-file-id="${file.id}">
                <i class="fas fa-file tab-icon"></i>
                <span class="tab-name">${file.name}${file.modified ? ' •' : ''}</span>
                <i class="fas fa-times tab-close" onclick="event.stopPropagation(); ideState.closeTab(${file.id})"></i>
            </div>`
        ).join('');

        // Add click listeners to tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                if (!e.target.classList.contains('tab-close')) {
                    const fileId = parseInt(tab.dataset.fileId);
                    this.setActiveFile(fileId);
                }
            });
        });
    }

    closeTab(fileId) {
        this.deleteFile(fileId);
    }

    updateActiveTab() {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
            if (parseInt(tab.dataset.fileId) === this.activeFile) {
                tab.classList.add('active');
            }
        });
    }

    renderFileTree() {
        const fileTree = document.getElementById('fileTree');
        if (this.files.size === 0) {
            fileTree.innerHTML = '<div class="file-item empty">No files open</div>';
            return;
        }

        fileTree.innerHTML = Array.from(this.files.values()).map(file => {
            const extension = file.name.split('.').pop()?.toLowerCase() || 'txt';
            return `<div class="file-item ${this.activeFile === file.id ? 'active' : ''}" 
                         data-file-id="${file.id}" 
                         data-extension="${extension}"
                         oncontextmenu="showFileContextMenu(event, ${file.id})">
                <i class="fas fa-file file-icon"></i>
                <span>${file.name}${file.modified ? ' •' : ''}</span>
            </div>`;
        }).join('');

        // Add click listeners
        document.querySelectorAll('.file-item[data-file-id]').forEach(item => {
            item.addEventListener('click', () => {
                const fileId = parseInt(item.dataset.fileId);
                this.setActiveFile(fileId);
            });
        });
    }

    updateActiveFileInTree() {
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.fileId && parseInt(item.dataset.fileId) === this.activeFile) {
                item.classList.add('active');
            }
        });
    }
}

// Initialize IDE State
const ideState = new IDEState();

// Monaco Editor Setup
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }});

require(['vs/editor/editor.main'], function() {
    ideState.editor = monaco.editor.create(document.getElementById('monacoEditor'), {
        value: '',
        language: 'javascript',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 14,
        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        readOnly: false,
        cursorStyle: 'line',
        minimap: { enabled: true },
        folding: true,
        wordWrap: 'on',
        formatOnPaste: true,
        formatOnType: true,
        autoIndent: 'full',
        tabSize: 4,
        insertSpaces: true
    });

    // Listen for content changes
    ideState.editor.onDidChangeModelContent(() => {
        if (ideState.activeFile) {
            const file = ideState.files.get(ideState.activeFile);
            if (file) {
                file.modified = true;
                ideState.renderTabs();
                ideState.renderFileTree();
            }
        }
    });

    // Listen for cursor position changes
    ideState.editor.onDidChangeCursorPosition((e) => {
        updateStatusBar(e.position);
    });

    // Listen for selection changes
    ideState.editor.onDidChangeCursorSelection((e) => {
        updateStatusBarSelection(e.selection);
    });

    // Keyboard shortcuts
    ideState.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        saveCurrentFile();
    });

    ideState.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN, () => {
        showNewFileModal();
    });
});

// File Operations
function showNewFileModal() {
    const modal = document.getElementById('newFileModal');
    const input = document.getElementById('newFileName');
    modal.classList.add('active');
    input.focus();
    input.value = `untitled-${ideState.fileCounter}.js`;
    input.select();
}

function hideNewFileModal() {
    document.getElementById('newFileModal').classList.remove('active');
}

function createNewFile() {
    const fileName = document.getElementById('newFileName').value.trim();
    if (!fileName) return;

    const language = ideState.getLanguageFromExtension(fileName);
    const file = ideState.addFile(fileName, '', language);
    ideState.fileCounter++;
    
    ideState.setActiveFile(file.id);
    ideState.renderTabs();
    ideState.renderFileTree();
    hideNewFileModal();
}

function saveCurrentFile() {
    if (ideState.activeFile && ideState.editor) {
        const file = ideState.files.get(ideState.activeFile);
        if (file) {
            file.content = ideState.editor.getValue();
            file.modified = false;
            ideState.renderTabs();
            ideState.renderFileTree();
            
            // Show save confirmation in output
            addToOutput(`File saved: ${file.name}`, 'success');
        }
    }
}

// Context Menu
let contextMenuTarget = null;

function showFileContextMenu(event, fileId) {
    event.preventDefault();
    contextMenuTarget = fileId;
    
    const contextMenu = document.getElementById('fileContextMenu');
    contextMenu.style.display = 'block';
    contextMenu.style.left = event.pageX + 'px';
    contextMenu.style.top = event.pageY + 'px';
}

function hideContextMenu() {
    document.getElementById('fileContextMenu').style.display = 'none';
    contextMenuTarget = null;
}

function handleContextAction(action) {
    if (!contextMenuTarget) return;
    
    const file = ideState.files.get(contextMenuTarget);
    if (!file) return;
    
    switch (action) {
        case 'rename':
            showRenameModal(file);
            break;
        case 'delete':
            if (confirm(`Delete ${file.name}?`)) {
                ideState.deleteFile(contextMenuTarget);
            }
            break;
        case 'duplicate':
            const newName = file.name.replace(/(\.[^.]+)?$/, '_copy$1');
            const duplicatedFile = ideState.addFile(newName, file.content, file.language);
            ideState.renderTabs();
            ideState.renderFileTree();
            break;
    }
    
    hideContextMenu();
}

function showRenameModal(file) {
    const modal = document.getElementById('renameModal');
    const input = document.getElementById('renameInput');
    modal.classList.add('active');
    input.value = file.name;
    input.focus();
    input.select();
    
    // Store the file ID for renaming
    modal.dataset.fileId = file.id;
}

function hideRenameModal() {
    document.getElementById('renameModal').classList.remove('active');
}

function renameFile() {
    const modal = document.getElementById('renameModal');
    const newName = document.getElementById('renameInput').value.trim();
    const fileId = parseInt(modal.dataset.fileId);
    
    if (!newName || !fileId) return;
    
    const file = ideState.files.get(fileId);
    if (file) {
        file.name = newName;
        file.language = ideState.getLanguageFromExtension(newName);
        
        if (ideState.activeFile === fileId) {
            ideState.setEditorLanguage(file.language);
            updateStatusBarLanguage(file.language);
        }
        
        ideState.renderTabs();
        ideState.renderFileTree();
    }
    
    hideRenameModal();
}

// Bottom Panel Management
function switchBottomPanel(panelName) {
    // Update tab states
    document.querySelectorAll('.bottom-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.panel === panelName) {
            tab.classList.add('active');
        }
    });
    
    // Update panel visibility
    document.querySelectorAll('.bottom-panel-content').forEach(panel => {
        panel.classList.remove('active');
    });
    
    const targetPanel = document.getElementById(panelName + 'Panel');
    if (targetPanel) {
        targetPanel.classList.add('active');
    }
}

// Output Management
function addToOutput(message, type = 'info') {
    const outputContent = document.getElementById('outputContent');
    const placeholder = outputContent.querySelector('.output-placeholder');
    
    if (placeholder) {
        placeholder.remove();
    }
    
    const timestamp = new Date().toLocaleTimeString();
    const messageElement = document.createElement('div');
    messageElement.className = `output-line ${type}`;
    messageElement.innerHTML = `<span class="output-time">[${timestamp}]</span> ${message}`;
    
    outputContent.appendChild(messageElement);
    outputContent.scrollTop = outputContent.scrollHeight;
}

// Status Bar Management
function updateStatusBar(position) {
    const statusCursor = document.getElementById('statusCursor');
    if (statusCursor && position) {
        statusCursor.textContent = `Ln ${position.lineNumber}, Col ${position.column}`;
    }
}

function updateStatusBarSelection(selection) {
    const statusSelection = document.getElementById('statusSelection');
    if (statusSelection && selection) {
        const startLine = selection.startLineNumber;
        const endLine = selection.endLineNumber;
        const startCol = selection.startColumn;
        const endCol = selection.endColumn;
        
        if (startLine === endLine && startCol === endCol) {
            statusSelection.textContent = '';
        } else {
            const selectedLines = endLine - startLine + 1;
            const selectedChars = ideState.editor.getModel().getValueInRange(selection).length;
            statusSelection.textContent = `(${selectedChars} selected)`;
        }
    }
}

function updateStatusBarLanguage(language) {
    const statusLanguage = document.getElementById('statusLanguage');
    if (statusLanguage) {
        const languageNames = {
            'javascript': 'JavaScript',
            'typescript': 'TypeScript',
            'python': 'Python',
            'html': 'HTML',
            'css': 'CSS',
            'json': 'JSON',
            'markdown': 'Markdown',
            'plaintext': 'Plain Text',
            'cpp': 'C++',
            'c': 'C',
            'java': 'Java',
            'php': 'PHP',
            'ruby': 'Ruby',
            'go': 'Go',
            'rust': 'Rust'
        };
        statusLanguage.textContent = languageNames[language] || language;
    }
}

// Code Execution
function runCode() {
    if (!ideState.activeFile || !ideState.editor) {
        addToOutput('No active file to run', 'error');
        return;
    }
    
    const file = ideState.files.get(ideState.activeFile);
    if (!file) return;
    
    const code = ideState.editor.getValue();
    
    // Switch to output panel
    switchBottomPanel('output');
    
    addToOutput(`Running ${file.name}...`, 'info');
    
    try {
        // Simple code execution for JavaScript
        if (file.language === 'javascript') {
            // Capture console.log output
            const originalLog = console.log;
            const logs = [];
            
            console.log = (...args) => {
                logs.push(args.join(' '));
                originalLog(...args);
            };
            
            // Execute the code
            const result = eval(code);
            
            // Restore console.log
            console.log = originalLog;
            
            // Display logs
            logs.forEach(log => addToOutput(log, 'success'));
            
            if (result !== undefined) {
                addToOutput(`Result: ${result}`, 'success');
            }
            
        } else if (file.language === 'python') {
            addToOutput('Python execution not supported in browser environment', 'warning');
            addToOutput('Consider using a Python runtime or server-side execution', 'info');
        } else {
            addToOutput(`Execution not supported for ${file.language} files`, 'warning');
        }
        
    } catch (error) {
        addToOutput(`Error: ${error.message}`, 'error');
    }
}

// AI Assistant
function sendAIMessage() {
    const input = document.getElementById('aiInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    addAIMessage(message, 'user');
    input.value = '';
    
    // Simulate AI response (replace with actual AI integration)
    setTimeout(() => {
        const responses = [
            "I can help you with that! Could you provide more details about what you're trying to achieve?",
            "That's an interesting question. Let me think about the best approach for your code.",
            "I see you're working on some code. What specific issue are you facing?",
            "Great question! Here are a few suggestions that might help you.",
            "I'd be happy to help you debug that. Can you share the error message you're seeing?"
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addAIMessage(randomResponse, 'assistant');
    }, 1000);
}

function addAIMessage(message, sender) {
    const messagesContainer = document.getElementById('aiMessages');
    const messageElement = document.createElement('div');
    messageElement.className = `ai-message ${sender}`;
    
    messageElement.innerHTML = `
        <div class="message-bubble">
            <p>${message}</p>
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    ideState.aiMessages.push({ message, sender, timestamp: Date.now() });
}

// Panel Resizing
function initializeResizing() {
    const leftResize = document.getElementById('leftResize');
    const rightResize = document.getElementById('rightResize');
    const bottomResize = document.getElementById('bottomResize');
    const leftSidebar = document.getElementById('fileExplorer');
    const rightSidebar = document.getElementById('aiAssistant');
    const bottomPanel = document.querySelector('.bottom-panel');
    
    let isResizing = false;
    let currentHandle = null;
    
    function startResize(handle, cursor) {
        isResizing = true;
        currentHandle = handle;
        document.body.style.cursor = cursor;
        document.body.style.userSelect = 'none';
    }
    
    function stopResize() {
        isResizing = false;
        currentHandle = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
    
    leftResize.addEventListener('mousedown', () => startResize('left', 'col-resize'));
    rightResize.addEventListener('mousedown', () => startResize('right', 'col-resize'));
    bottomResize.addEventListener('mousedown', () => startResize('bottom', 'row-resize'));
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        if (currentHandle === 'left') {
            const newWidth = Math.max(200, Math.min(400, e.clientX));
            leftSidebar.style.width = newWidth + 'px';
        } else if (currentHandle === 'right') {
            const newWidth = Math.max(250, Math.min(500, window.innerWidth - e.clientX));
            rightSidebar.style.width = newWidth + 'px';
        } else if (currentHandle === 'bottom') {
            const newHeight = Math.max(100, Math.min(400, window.innerHeight - e.clientY));
            bottomPanel.style.height = newHeight + 'px';
        }
    });
    
    document.addEventListener('mouseup', stopResize);
}

// AI Panel Collapse
function toggleAIPanel() {
    const aiAssistant = document.getElementById('aiAssistant');
    const collapseBtn = document.getElementById('collapseAI');
    const icon = collapseBtn.querySelector('i');
    
    aiAssistant.classList.toggle('collapsed');
    
    if (aiAssistant.classList.contains('collapsed')) {
        icon.classList.remove('fa-chevron-right');
        icon.classList.add('fa-chevron-left');
    } else {
        icon.classList.remove('fa-chevron-left');
        icon.classList.add('fa-chevron-right');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize resizing
    initializeResizing();
    
    // File operations
    document.getElementById('newFileBtn').addEventListener('click', showNewFileModal);
    document.getElementById('welcomeNewFile').addEventListener('click', showNewFileModal);
    document.getElementById('confirmNewFile').addEventListener('click', createNewFile);
    document.getElementById('cancelNewFile').addEventListener('click', hideNewFileModal);
    
    // Rename operations
    document.getElementById('confirmRename').addEventListener('click', renameFile);
    document.getElementById('cancelRename').addEventListener('click', hideRenameModal);
    
    // Enter key handlers
    document.getElementById('newFileName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createNewFile();
        if (e.key === 'Escape') hideNewFileModal();
    });
    
    document.getElementById('renameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') renameFile();
        if (e.key === 'Escape') hideRenameModal();
    });
    
    // Run button
    document.getElementById('runBtn').addEventListener('click', runCode);
    
    // Bottom panel tabs
    document.querySelectorAll('.bottom-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchBottomPanel(tab.dataset.panel);
        });
    });
    
    // Context menu
    document.addEventListener('click', hideContextMenu);
    document.querySelectorAll('.context-item').forEach(item => {
        item.addEventListener('click', () => {
            handleContextAction(item.dataset.action);
        });
    });
    
    // AI Assistant
    document.getElementById('sendAI').addEventListener('click', sendAIMessage);
    document.getElementById('aiInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendAIMessage();
    });
    document.getElementById('collapseAI').addEventListener('click', toggleAIPanel);
    
    // Welcome tab actions
    document.getElementById('welcomeOpenRecent').addEventListener('click', () => {
        // Focus on recent files section
        document.querySelector('.recent-files').scrollIntoView({ behavior: 'smooth' });
    });
    
    document.getElementById('welcomeRunGuide').addEventListener('click', () => {
        addAIMessage("Welcome to CodeStudio! Here's a quick guide:\n\n1. Create new files using the '+' button or Ctrl+N\n2. Use the Run button to execute JavaScript code\n3. Ask me questions about your code anytime!\n4. All panels are resizable by dragging the borders\n5. Your recent files are automatically saved", 'assistant');
        
        // Switch to AI assistant
        if (document.getElementById('aiAssistant').classList.contains('collapsed')) {
            toggleAIPanel();
        }
    });
    
    // Initialize recent files
    ideState.renderRecentFiles();
    
    // Create a sample file to get started
    const sampleFile = ideState.addFile('welcome.js', `// Welcome to CodeStudio!
// This is a modern, VS Code-inspired online IDE

console.log("Hello, CodeStudio!");

// Try these features:
// 1. Create new files with Ctrl+N
// 2. Run JavaScript code with the Run button
// 3. Ask the AI assistant for help
// 4. Resize panels by dragging borders

function greet(name) {
    return \`Hello, \${name}! Welcome to coding!\`;
}

const message = greet("Developer");
console.log(message);

// You can also try:
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log("Doubled numbers:", doubled);
`, 'javascript');
    
    ideState.setActiveFile(sampleFile.id);
    ideState.renderTabs();
    ideState.renderFileTree();
    
    // Add welcome message to AI
    setTimeout(() => {
        addAIMessage("Welcome to CodeStudio! I'm here to help you with your coding. Feel free to ask me questions about your code, debugging, or programming concepts. What would you like to work on today?", 'assistant');
    }, 1000);
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 's':
                e.preventDefault();
                saveCurrentFile();
                break;
            case 'n':
                e.preventDefault();
                showNewFileModal();
                break;
            case 'r':
                e.preventDefault();
                runCode();
                break;
        }
    }
    
    if (e.key === 'Escape') {
        hideContextMenu();
        hideNewFileModal();
        hideRenameModal();
    }
});

// Prevent context menu on right-click (except for file items)
document.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('.file-item')) {
        e.preventDefault();
    }
});