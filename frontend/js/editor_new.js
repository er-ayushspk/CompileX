/**
 * Editor Manager Module
 * Manages Monaco Editor instance, tabs, and file operations
 */

class EditorManager {
    constructor() {
        // Wait for Monaco to be available
        if (typeof monaco === 'undefined') {
            console.error('Monaco editor not loaded. Please wait for Monaco to load first.');
            return;
        }

        this.monaco = monaco;
        this.tabs = new Map();
        this.activeTab = null;
        this.editor = null;
        this.tabCounter = 0;
        this.welcomeTabCreated = false;
        
        // Store reference globally
        window.editorManager = this;
        
        // Initialize editor
        this.initEditor();
        
        // Create welcome tab
        this.createWelcomeTab();
    }

    /**
     * Initialize Monaco Editor
     */
    initEditor() {
        // Wait for editor container to be available
        const waitForEditor = (retries = 20) => {
            const editorContainer = document.getElementById('editor');
            if (editorContainer) {
                this.createEditor(editorContainer);
            } else if (retries > 0) {
                setTimeout(() => waitForEditor(retries - 1), 100);
            } else {
                console.error('Editor container not found after waiting');
            }
        };
        waitForEditor();
    }

    /**
     * Create the Monaco editor instance
     */
    createEditor(editorContainer) {

        // Define custom themes
        this.defineThemes();

        // Create editor instance
        this.editor = this.monaco.editor.create(editorContainer, {
            value: '',
            language: 'plaintext',
            theme: this.getTheme(),
            fontSize: 14,
            fontFamily: '"JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace',
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            minimap: {
                enabled: true
            },
            automaticLayout: true
        });

        // Listen for theme changes
        window.addEventListener('themeChanged', () => {
            if (this.editor) {
                this.editor.updateOptions({ theme: this.getTheme() });
            }
        });

        console.log('Monaco Editor initialized');
    }

    /**
     * Get current theme
     */
    getTheme() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || 
                      (!document.documentElement.getAttribute('data-theme') && 
                       window.matchMedia('(prefers-color-scheme: dark)').matches);
        return isDark ? 'compilex-dark' : 'compilex-light';
    }

    /**
     * Define custom themes
     */
    defineThemes() {
        // Dark theme
        this.monaco.editor.defineTheme('compilex-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'C586C0', fontStyle: 'bold' },
                { token: 'string', foreground: 'CE9178' },
                { token: 'number', foreground: 'B5CEA8' },
                { token: 'type', foreground: '4EC9B0' },
                { token: 'function', foreground: 'DCDCAA' },
                { token: 'variable', foreground: '9CDCFE' },
                { token: 'constant', foreground: '569CD6' }
            ],
            colors: {
                'editor.background': '#1e1e1e',
                'editor.foreground': '#d4d4d4',
                'editor.lineHighlightBackground': '#2a2d2e',
                'editor.selectionBackground': '#264f78',
                'editor.inactiveSelectionBackground': '#3a3d41'
            }
        });

        // Light theme
        this.monaco.editor.defineTheme('compilex-light', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '008000', fontStyle: 'italic' },
                { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
                { token: 'string', foreground: 'A31515' },
                { token: 'number', foreground: '098658' },
                { token: 'type', foreground: '267F99' },
                { token: 'function', foreground: '795E26' },
                { token: 'variable', foreground: '001080' },
                { token: 'constant', foreground: '0070C1' }
            ],
            colors: {
                'editor.background': '#ffffff',
                'editor.foreground': '#000000',
                'editor.lineHighlightBackground': '#f0f0f0',
                'editor.selectionBackground': '#add6ff',
                'editor.inactiveSelectionBackground': '#e5ebf1'
            }
        });

        // Set initial theme
        this.monaco.editor.setTheme(this.getTheme());
    }

    /**
     * Create welcome tab
     */
    createWelcomeTab() {
        if (this.welcomeTabCreated) return;
        
        this.welcomeTabCreated = true;
        const welcomeContent = `Welcome to CompileX!

This is your code editor. You can:
- Create new files using the file explorer
- Open existing files by clicking them
- Write and edit code with syntax highlighting
- Run your code using the Run button
- Get AI assistance from the AI Assistant panel

Let's get started!`;

        this.createNewFile('Welcome.txt', 'plaintext', welcomeContent);
    }

    /**
     * Create a new file tab
     * @param {string} fileName - Name of the file
     * @param {string} language - Language identifier
     * @param {string} content - Initial content
     */
    createNewFile(fileName, language = 'plaintext', content = '') {
        const tabId = `tab-${++this.tabCounter}`;
        const tab = {
            id: tabId,
            name: fileName,
            title: fileName,
            path: null,
            language: language || 'plaintext',
            content: content || '',
            viewState: null
        };

        this.tabs.set(tabId, tab);
        this.createTabElement(tabId, fileName);
        this.activateTab(tabId);
        
        return tabId;
    }

    /**
     * Create a tab from file
     * @param {string} fileName - Name of the file
     * @param {string} filePath - Path to the file
     * @param {string} content - File content
     */
    createTab(fileName, filePath, content) {
        // Check if tab already exists for this file
        for (const [tabId, tab] of this.tabs.entries()) {
            if (tab.path === filePath) {
                this.activateTab(tabId);
                return tabId;
            }
        }

        // Detect language from file extension
        const language = this.detectLanguage(fileName);
        const tabId = `tab-${++this.tabCounter}`;
        const tab = {
            id: tabId,
            name: fileName,
            title: fileName,
            path: filePath,
            language: language,
            content: content || '',
            viewState: null
        };

        this.tabs.set(tabId, tab);
        this.createTabElement(tabId, fileName);
        this.activateTab(tabId);
        
        return tabId;
    }

    /**
     * Detect language from file name
     */
    detectLanguage(fileName) {
        if (!fileName || typeof fileName !== 'string') return 'plaintext';
        
        const extension = fileName.split('.').pop().toLowerCase();
        const languageMap = {
            'js': 'javascript',
            'ts': 'typescript',
            'html': 'html',
            'css': 'css',
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
            'json': 'json',
            'xml': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml',
            'txt': 'plaintext'
        };
        
        return languageMap[extension] || 'plaintext';
    }

    /**
     * Create tab element in UI
     */
    createTabElement(tabId, fileName) {
        // Find the ul#tabs-container inside .editor-tabs
        const tabsContainer = document.querySelector('ul#tabs-container') || 
                             document.querySelector('#tabs-container') ||
                             document.querySelector('.editor-tabs');
        if (!tabsContainer) {
            console.error('Tabs container not found');
            return;
        }

        const tabElement = document.createElement('li');
        tabElement.className = 'editor-tab';
        tabElement.dataset.tabId = tabId;
        tabElement.innerHTML = `
            <span class="tab-title">${this.escapeHtml(fileName)}</span>
            <span class="tab-close" data-tab-id="${tabId}">×</span>
        `;

        // Click handler
        tabElement.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tab-close')) {
                this.activateTab(tabId);
            }
        });

        // Close handler
        const closeBtn = tabElement.querySelector('.tab-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeTab(tabId);
            });
        }

        tabsContainer.appendChild(tabElement);
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Activate a tab
     * @param {string} tabId - ID of the tab to activate
     */
    activateTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        // Save current tab state
        if (this.activeTab && this.activeTab !== tabId) {
            const currentTab = this.tabs.get(this.activeTab);
            if (currentTab && this.editor) {
                currentTab.content = this.editor.getValue();
                currentTab.viewState = this.editor.saveViewState();
            }
        }

        // Update active tab
        this.activeTab = tabId;

        // Update UI
        document.querySelectorAll('.editor-tab').forEach(el => {
            el.classList.remove('active');
            if (el.dataset.tabId === tabId) {
                el.classList.add('active');
            }
        });

        // Update editor content
        if (this.editor) {
            const currentContent = (tab.content !== undefined && tab.content !== null) ? tab.content : '';
            const model = this.monaco.editor.createModel(
                currentContent || '',
                tab.language || 'plaintext'
            );
            this.editor.setModel(model);
            tab.content = currentContent;

            // Restore view state
            if (tab.viewState) {
                this.editor.restoreViewState(tab.viewState);
            }

            // Focus editor
            this.editor.focus();
        }
    }

    /**
     * Close a tab
     * @param {string} tabId - ID of the tab to close
     */
    closeTab(tabId) {
        if (this.tabs.size <= 1) {
            // Don't close the last tab
            return;
        }

        const tab = this.tabs.get(tabId);
        if (!tab) return;

        // If closing active tab, switch to another
        if (this.activeTab === tabId) {
            const tabIds = Array.from(this.tabs.keys());
            const currentIndex = tabIds.indexOf(tabId);
            const nextTabId = currentIndex > 0 ? tabIds[currentIndex - 1] : tabIds[currentIndex + 1];
            if (nextTabId) {
                this.activateTab(nextTabId);
            }
        }

        // Remove tab element
        const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (tabElement) {
            tabElement.remove();
        }

        // Dispose model if exists
        if (this.editor) {
            const model = this.editor.getModel();
            if (model && model.uri && model.uri.toString().includes(tabId)) {
                model.dispose();
            }
        }

        // Remove from tabs
        this.tabs.delete(tabId);
    }

    /**
     * Get current file info
     * @returns {Object} File info object
     */
    getCurrentFileInfo() {
        if (!this.activeTab) {
            const tab = this.tabs.values().next().value;
            if (tab) {
                this.activeTab = tab.id;
            }
        }

        const tab = this.tabs.get(this.activeTab);
        if (!tab) return null;

        if (this.editor) {
            tab.content = this.editor.getValue();
        }

        return {
            fileName: tab.name || tab.title || '',
            path: tab.path || null,
            content: tab.content || '',
            language: tab.language || 'plaintext'
        };
    }

    /**
     * Save current file
     */
    saveCurrentFile() {
        const fileInfo = this.getCurrentFileInfo();
        if (!fileInfo) return;

        if (this.editor) {
            fileInfo.content = this.editor.getValue();
            const tab = this.tabs.get(this.activeTab);
            if (tab) {
                tab.content = fileInfo.content;
            }
        }

        if (!fileInfo.path) {
            // New file - just update content in tab
            console.log('File not saved yet (new file)');
            return;
        }

        // Save to disk
        if (window.fileExplorer) {
            window.fileExplorer.saveFile(fileInfo.path, fileInfo.content).then(success => {
                if (success) {
                    console.log('File saved successfully');
                    // Refresh file explorer
                    if (window.fileExplorer && window.fileExplorer.loadDirectory) {
                        const directoryToRefresh = window.fileExplorer.currentDirectory || '.';
                        setTimeout(() => {
                            window.fileExplorer.loadDirectory(directoryToRefresh);
                        }, 100);
                    }
                }
            });
        }
    }

    /**
     * Update tab title
     * @param {string} tabId - ID of the tab
     */
    updateTabTitle(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        const tabElement = document.querySelector(`[data-tab-id="${tabId}"] .tab-title`);
        if (tabElement) {
            tabElement.textContent = tab.title || tab.name;
        }
    }

    /**
     * Clear editor markers
     */
    clearMarkers() {
        if (this.editor) {
            const model = this.editor.getModel();
            if (model) {
                this.monaco.editor.setModelMarkers(model, 'compiler', []);
            }
        }
    }

    /**
     * Set editor markers
     * @param {Array} markers - Array of marker objects
     */
    setEditorMarkers(markers) {
        if (this.editor) {
            const model = this.editor.getModel();
            if (model) {
                this.monaco.editor.setModelMarkers(model, 'compiler', markers);
            }
        }
    }

    /**
     * Update editor layout
     */
    layout() {
        if (this.editor) {
            setTimeout(() => {
                this.editor.layout();
            }, 0);
        }
    }

    /**
     * Rename tab
     * @param {string} oldPath - Old file path
     * @param {string} newPath - New file path
     * @param {string} newFileName - New file name
     */
    renameTab(oldPath, newPath, newFileName) {
        for (const [tabId, tab] of this.tabs.entries()) {
            if (tab.path === oldPath) {
                tab.path = newPath;
                tab.title = newFileName;
                tab.name = newFileName;
                this.updateTabTitle(tabId);
                break;
            }
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    // Wait for Monaco to be loaded before creating instance
    // The instance will be created in index.html after Monaco loads
    window.EditorManager = EditorManager;
}
