/**
 * Agent Module
 * Provides AI-assisted code editing and suggestions
 */

class CodeAgent {
    constructor() {
        this.isActive = false;
        this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
        this.apiKey = 'YOUR_API_KEY_HERE'; // Replace with your actual API key

        // Initialize UI elements
        this.initUI();

        // Initialize event listeners
        this.initEventListeners();
    }

    /**
     * Initialize UI elements for the agent panel
     */
    initUI() {
        // Add CSS styles for agent messages and chat layout
        const style = document.createElement('style');
        style.textContent = `
            /* Agent panel styles are now in style.css */
        `;
        document.head.appendChild(style);

        // Add welcome message
        this.addMessage("👋 Hello! I'm your AI coding assistant. How can I help you today?", 'assistant');
    }

    /**
     * Initialize event listeners for the agent panel
     */
    initEventListeners() {
        const sendBtn = document.getElementById('agent-send');
        const promptEl = document.getElementById('agent-prompt');
        const clearBtn = document.getElementById('agent-clear');

        // Send button click event
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendPrompt());
        }

        // Enter key: send on Enter, newline with Shift+Enter
        if (promptEl) {
            promptEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendPrompt();
                }
            });
            
            // Auto-resize textarea as user types
            const autoResize = () => {
                promptEl.style.height = 'auto';
                promptEl.style.height = Math.min(promptEl.scrollHeight, 160) + 'px';
            };
            ['input', 'change'].forEach(evt => promptEl.addEventListener(evt, autoResize));
            autoResize();
        }

        // Clear chat button click event
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearChat());
        }
    }

    /**
     * Send a prompt to the agent
     */
    async sendPrompt() {
        const promptInput = document.getElementById('agent-prompt');
        const sendBtn = document.getElementById('agent-send');
        const prompt = promptInput.value.trim();

        if (!prompt) return;

        // Prevent multiple simultaneous requests
        if (sendBtn.disabled) return;

        // Add user message to chat
        this.addMessage(prompt, 'user');

        // Clear input and reset height
        promptInput.value = '';
        promptInput.style.height = 'auto';

        // Get current file info (path, content, language)
        const fileInfo = window.editorManager.getCurrentFileInfo();

        // Add typing indicator
        const typingIndicator = this.addTypingIndicator();

        // Disable send button
        sendBtn.disabled = true;
        sendBtn.classList.add('loading');

        // Send the prompt and file context to the backend AI endpoint
        try {
            // Use local API endpoint instead of OpenAI directly
            const response = await fetch('/api/agent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt,
                    fileInfo: fileInfo
                })
            });

            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            const responseData = await response.json();
            
            // Remove typing indicator
            this.removeTypingIndicator(typingIndicator);
            
            // Display response
            if (responseData.success) {
                this.addMessage(responseData.response, 'assistant');
            } else {
                throw new Error(responseData.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Error communicating with AI backend:', error);

            // Remove typing indicator
            this.removeTypingIndicator(typingIndicator);

            this.addMessage(`An error occurred while contacting the AI: ${error.message}`, 'assistant');
        } finally {
            // Re-enable send button
            sendBtn.disabled = false;
            sendBtn.classList.remove('loading');
            promptInput.focus();
        }
    }

    /**
     * Add a message to the chat
     * @param {string} text - Message text
     * @param {string} sender - Message sender ('user' or 'assistant')
     */
    addMessage(text, sender) {
        const chatContainer = document.getElementById('agent-chat');

        const messageElement = document.createElement('div');
        messageElement.className = `agent-message ${sender}`;

        // Remove avatars for cleaner UI

        let processedText = text;

        // Enhance AI responses with emojis for better engagement
        if (sender === 'assistant') {
            processedText = processedText
                .replace(/^Hello/i, '👋 Hello')
                .replace(/^Hi/i, '👋 Hi')
                .replace(/error/gi, '❌ error')
                .replace(/success/gi, '✅ success')
                .replace(/fixed/gi, '🔧 fixed')
                .replace(/improved/gi, '🚀 improved')
                .replace(/created/gi, '✨ created')
                .replace(/added/gi, '➕ added')
                .replace(/removed/gi, '➖ removed')
                .replace(/updated/gi, '🔄 updated');
        }

        // Special handling for refactoring suggestions
        if (sender === 'assistant' && text.includes("**Refactoring Suggestion:")) {
            messageElement.classList.add('agent-refactoring-suggestion');
            // Optionally, we could parse the suggestion more formally here
        }

        // Process markdown-like code blocks - display line by line
        processedText = processedText.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, language, code) => {
            // Ensure code is a string and handle undefined/null cases
            if (!code || typeof code !== 'string') {
                return match; // Return original match if code is invalid
            }
            
            const trimmedCode = code.trim();
            const escapedCode = this.escapeHtml(trimmedCode);
            
            // Safely split code into lines
            const lines = escapedCode ? escapedCode.split('\n') : [''];
            
            // Create line-by-line display with insert to editor button
            const lineByLineHtml = lines.map((line, index) => {
                return `<div class="code-line" data-line-number="${index + 1}">
                    <span class="line-number">${index + 1}</span>
                    <span class="line-content">${line || ' '}</span>
                </div>`;
            }).join('');
            
            // Double escape for data attributes
            const safeCode = this.escapeHtml(escapedCode.replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
            
            return `
                <div class="code-block-container">
                    <div class="code-block-header">
                        <span class="code-language">${language || 'text'}</span>
                        <div class="code-actions">
                            <button class="insert-code-btn" data-code="${safeCode}">Insert to Editor</button>
                            <button class="copy-code-btn" data-code="${safeCode}">Copy</button>
                        </div>
                    </div>
                    <div class="code-block-content">
                        <div class="code-lines">${lineByLineHtml}</div>
                    </div>
                </div>
            `;
        });

        // Process inline code
        processedText = processedText.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Process newlines - only for text outside code blocks or if not already handled by pre-wrap
        // This line might need adjustment if it interferes with pre-wrap in code blocks.
        // For now, let's assume pre-wrap handles newlines in code blocks and this is for general text.
        processedText = processedText.replace(/\n/g, '<br>');

        // Create message content with improved styling
        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';
        contentElement.innerHTML = processedText;

        // Add timestamp
        const timestampElement = document.createElement('div');
        timestampElement.className = 'message-timestamp';
        const now = new Date();
        timestampElement.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        // Add typing animation for agent messages
        if (sender === 'assistant') {
            messageElement.classList.add('typing-animation');
            setTimeout(() => {
                messageElement.classList.remove('typing-animation');
            }, 500);

            // Handle code block buttons
            contentElement.querySelectorAll('.code-block-container').forEach(container => {
                const copyButton = container.querySelector('.copy-code-btn');
                const insertButton = container.querySelector('.insert-code-btn');
                
                if (copyButton) {
                    copyButton.addEventListener('click', () => {
                        // Decode HTML entities from the data attribute
                        const codeDiv = document.createElement('div');
                        codeDiv.innerHTML = copyButton.getAttribute('data-code');
                        const code = codeDiv.textContent || codeDiv.innerText || '';
                        
                        navigator.clipboard.writeText(code)
                            .then(() => {
                                this.showNotification('Code copied to clipboard!');
                            })
                            .catch(err => { console.error('Failed to copy code: ', err); });
                    });
                }
                
                if (insertButton) {
                    insertButton.addEventListener('click', () => {
                        // Decode HTML entities from the data attribute
                        const codeDiv = document.createElement('div');
                        codeDiv.innerHTML = insertButton.getAttribute('data-code');
                        const code = codeDiv.textContent || codeDiv.innerText || '';
                        
                        if (window.editorManager && window.editorManager.editor) {
                            const editor = window.editorManager.editor;
                            const selection = editor.getSelection();
                            const id = { major: 1, minor: 1 };
                            const op = {
                                identifier: id,
                                range: selection,
                                text: code,
                                forceMoveMarkers: true
                            };
                            editor.executeEdits("insert-code", [op]);
                            this.showNotification('Code inserted into editor!');
                        } else {
                            this.showNotification('Editor not available');
                        }
                    });
                }
            });

            contentElement.querySelectorAll('code').forEach(codeElement => {
                // This part now primarily handles inline code, as block code is handled above.
                codeElement.classList.add('agent-suggestion'); // Keep for visual indication of clickable inline code
                codeElement.addEventListener('click', () => {
                    const code = codeElement.textContent;
                    if (window.editorManager && window.editorManager.editor) {
                        window.editorManager.editor.trigger('keyboard', 'type', { text: code });
                    }
                });
            });
        }

        messageElement.appendChild(contentElement);
        messageElement.appendChild(timestampElement);
        chatContainer.appendChild(messageElement);

        // Only auto-scroll if user is already at the bottom
        const isAtBottom = chatContainer.scrollHeight - chatContainer.clientHeight <= chatContainer.scrollTop + 50;

        if (isAtBottom) {
            // Scroll to bottom
            setTimeout(() => {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }, 10);

            // Add a second scroll attempt for reliability
            setTimeout(() => {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }, 100);
        }
    }

/**
 * Show notification
 * @param {string} message - Notification message
 */
showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'ai-notification';
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => { 
        notification.classList.add('show'); 
        setTimeout(() => { 
            notification.classList.remove('show'); 
            setTimeout(() => { 
                notification.remove(); 
            }, 300); 
        }, 2000); 
    }, 10); 
}
 
/** 
 * Escape HTML special characters 
 * @param {string} html - HTML string to escape 
 * @returns {string} - Escaped HTML string 
 */ 
escapeHtml(html) { 
    const div = document.createElement('div'); 
    div.textContent = html; 
    return div.innerHTML; 
} 
     
/** 
 * Clear the chat history 
 */ 
clearChat() { 
    const chatContainer = document.getElementById('agent-chat'); 
    chatContainer.innerHTML = ''; 
     
    // Add welcome message after clearing 
    this.addMessage("👋 Chat cleared! How can I help you today?", 'assistant'); 
     
    // Focus on prompt input 
    document.getElementById('agent-prompt').focus(); 
}
    
    /**
     * Add typing indicator to show AI is responding 
     * @returns {HTMLElement} The typing indicator element 
     */ 
    addTypingIndicator() { 
        const chat = document.getElementById('agent-chat'); 
        const typingElement = document.createElement('div'); 
        typingElement.className = 'agent-message assistant typing-indicator'; 
        typingElement.innerHTML = '<span></span><span></span><span></span>'; 
        chat.appendChild(typingElement); 
        chat.scrollTop = chat.scrollHeight; 
        return typingElement; 
    } 
 
    /** 
     * Remove typing indicator when AI response is ready 
     * @param {HTMLElement} typingElement - The typing indicator element to remove 
     */ 
    removeTypingIndicator(typingElement) { 
        if (typingElement && typingElement.parentNode) { 
            typingElement.parentNode.removeChild(typingElement); 
        } 
    } 
 
}

// Initialize agent when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.codeAgent = new CodeAgent();

    // Add welcome message consistently
    setTimeout(() => {
        const welcomeMessage = "Welcome to CompileX! I'm your AI assistant. How can I help you with your coding today?";
        window.codeAgent.addMessage(welcomeMessage, 'assistant');
    }, 500);
});