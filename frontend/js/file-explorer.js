/**
 * File Explorer Module
 * Handles file system operations and displays file tree
 */

class FileExplorer {
    constructor() {
        this.currentDirectory = '';
        this.fileExplorerElement = document.getElementById('file-explorer');
        this.openFiles = new Map(); // Map of open file paths to their content
        this.pathSeparator = navigator.platform.indexOf('Win') === 0 ? '\\' : '/'; // Determine path separator based on OS

        // Initialize event listeners
        this.initEventListeners();
    }

    initEventListeners() {
        // New file button
        document.getElementById('new-file-btn').addEventListener('click', () => {
            this.showNewFileModal();
        });

        // New folder button
        document.getElementById('new-folder-btn').addEventListener('click', () => {
            this.showNewFolderModal();
        });

        // Open folder button
        document.getElementById('open-folder-btn').addEventListener('click', () => {
            this.showOpenFolderModal();
        });
    }

    /**
     * Open a folder dialog and load its contents
     */
    openFolderDialog() {
        // This function will now simply trigger the modal to open a folder.
        this.showOpenFolderModal();
    }

    /**
     * Load directory contents and display in file explorer
     * @param {string} directoryPath - Path to the directory
     */
    loadDirectory(directoryPath) {
        fetch('/api/files/list', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ directory: directoryPath })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Persist the directory we just loaded so new files/folders use it
                    this.currentDirectory = directoryPath || this.currentDirectory;
                    this.renderFileTree(data.files, directoryPath);
                } else {
                    console.error('Error loading directory:', data.error);
                    alert(`Error loading directory: ${data.error}`);
                }
            })
            .catch(error => {
                console.error('Error loading directory:', error);
                alert(`Error loading directory: ${error.message}`);
            });
    }

    /**
     * Render file tree in the explorer panel
     * @param {Array} files - Array of file objects with nested 'contents' for directories
     * @param {string} basePath - Base directory path
     */
    renderFileTree(files, basePath) {
        // Clear current file explorer
        this.fileExplorerElement.innerHTML = '';

        // Create a root element for the file tree
        const rootElement = document.createElement('div');
        rootElement.id = 'file-tree-root';
        this.fileExplorerElement.appendChild(rootElement);

        // Display current directory path at the top
        const currentPathDisplay = document.createElement('div');
        currentPathDisplay.className = 'current-path-display';
        currentPathDisplay.textContent = `Current: ${basePath || '/'}`;
        rootElement.appendChild(currentPathDisplay);

        // Add parent directory option only at the top level if not at the root of the file system
        const isWindowsRoot = /^[a-zA-Z]:\\?$/.test(basePath);
        const isUnixRoot = basePath === '/';

        if (basePath && basePath !== '' && !isWindowsRoot && !isUnixRoot) {
            const parentDir = document.createElement('div');
            parentDir.className = 'file-item';
            parentDir.innerHTML = '<i class="fas fa-level-up-alt"></i> <span>..</span>';
            parentDir.addEventListener('click', () => {
                const parentPath = basePath.substring(0, basePath.lastIndexOf(this.pathSeparator));
                // Handle navigating up from a top-level directory (e.g., C:/myfolder to C:/)
                const newPath = parentPath === '' && isWindowsRoot ? basePath.substring(0, basePath.indexOf(this.pathSeparator) + 1) : parentPath;
                this.currentDirectory = newPath;
                this.loadDirectory(newPath);
            });
            rootElement.appendChild(parentDir);
        }

        this._renderTree(files, basePath, rootElement);

        // After rendering, activate the current directory or file if it exists in the tree
        const activeElement = rootElement.querySelector(`[data-path="${this.currentDirectory}"]`);
        if (activeElement) {
            activeElement.classList.add('active');
            // If an active file is in a collapsed folder, expand the parent folders
            let currentParent = activeElement.parentElement;
            while (currentParent && currentParent.classList.contains('folder-contents')) {
                const parentFolderItem = currentParent.closest('.folder-item.collapsed');
                if (parentFolderItem) {
                    this.toggleFolder(parentFolderItem, parentFolderItem.dataset.path); // Expand without reloading
                }
                currentParent = currentParent.parentElement;
            }
        }

        // Add context menu event listener
        this.addContextMenuListeners(rootElement); // Add to the root element once
        
        // Add drag and drop support
        this.addDragAndDropSupport(rootElement);
    }

    /**
     * Recursively renders the file tree.
     * @param {Array} files - Array of file objects with nested 'contents' for directories.
     * @param {string} basePath - Base directory path.
     * @param {HTMLElement} parentElement - The DOM element to append files/folders to.
     */
    _renderTree(files, basePath, parentElement) {
        // Sort files: directories first, then files
        const sortedFiles = [...files].sort((a, b) => {
            if (a.type === 'directory' && b.type !== 'directory') return -1;
            if (a.type !== 'directory' && b.type === 'directory') return 1;
            return a.name.localeCompare(b.name);
        });

        // Add files and directories to explorer
        sortedFiles.forEach(file => {
            const fileElement = document.createElement('div');
            fileElement.className = file.type === 'directory' ? 'folder-item' : 'file-item';
            fileElement.dataset.path = file.path; // Store path for easy access

            // Icon based on file type with enhanced styling
            let icon;
            if (file.type === 'directory') {
                icon = '<i class="fas fa-chevron-right folder-toggle-icon"></i><i class="fas fa-folder folder-icon"></i>'; // Added chevron icon
            } else {
                // Determine icon based on file extension with enhanced colors
                const extension = file.name.split('.').pop().toLowerCase();
                switch (extension) {
                    case 'js':
                        icon = '<i class="fab fa-js-square" style="color: #f7df1e;"></i>';
                        break;
                    case 'html':
                        icon = '<i class="fab fa-html5" style="color: #e34c26;"></i>';
                        break;
                    case 'css':
                        icon = '<i class="fab fa-css3-alt" style="color: #264de4;"></i>';
                        break;
                    case 'py':
                        icon = '<i class="fab fa-python" style="color: #3776ab;"></i>';
                        break;
                    case 'java':
                        icon = '<i class="fab fa-java" style="color: #e51f23;"></i>';
                        break;
                    case 'ts':
                    case 'tsx':
                        icon = '<i class="fab fa-node-js" style="color: #007acc;"></i>';
                        break;
                    case 'json':
                        icon = '<i class="fas fa-file-code" style="color: #f7df1e;"></i>';
                        break;
                    case 'md':
                        icon = '<i class="fab fa-markdown" style="color: #086b97;"></i>';
                        break;
                    case 'xml':
                        icon = '<i class="fas fa-file-code" style="color: #a67f59;"></i>';
                        break;
                    case 'yml':
                    case 'yaml':
                        icon = '<i class="fas fa-file-code" style="color: #a67f59;"></i>';
                        break;
                    case 'txt':
                        icon = '<i class="fas fa-file-alt" style="color: #9fa6ad;"></i>';
                        break;
                    case 'png':
                    case 'jpg':
                    case 'jpeg':
                    case 'gif':
                    case 'svg':
                        icon = '<i class="fas fa-image" style="color: #89b4f6;"></i>';
                        break;
                    case 'pdf':
                        icon = '<i class="fas fa-file-pdf" style="color: #e62325;"></i>';
                        break;
                    case 'zip':
                    case 'rar':
                    case '7z':
                        icon = '<i class="fas fa-file-archive" style="color: #c9c9c9;"></i>';
                        break;
                    case 'sql':
                        icon = '<i class="fas fa-database" style="color: #336791;"></i>';
                        break;
                    case 'sh':
                    case 'bash':
                        icon = '<i class="fas fa-terminal" style="color: #4a4a4a;"></i>';
                        break;
                    case 'ps1':
                        icon = '<i class="fab fa-windows" style="color: #0078d4;"></i>';
                        break;
                    case 'bat':
                    case 'cmd':
                        icon = '<i class="fas fa-terminal" style="color: #4a4a4a;"></i>';
                        break;
                    case 'go':
                        icon = '<i class="fab fa-golang" style="color: #00add8;"></i>';
                        break;
                    case 'rs':
                        icon = '<i class="fas fa-cog" style="color: #ce422b;"></i>';
                        break;
                    case 'php':
                        icon = '<i class="fab fa-php" style="color: #777bb4;"></i>';
                        break;
                    case 'rb':
                        icon = '<i class="fab fa-ruby" style="color: #cc342d;"></i>';
                        break;
                    case 'swift':
                        icon = '<i class="fab fa-swift" style="color: #fa7343;"></i>';
                        break;
                    case 'kt':
                        icon = '<i class="fab fa-kotlin" style="color: #7f52ff;"></i>';
                        break;
                    case 'cpp':
                    case 'c':
                        icon = '<i class="fas fa-file-code" style="color: #00599c;"></i>';
                        break;
                    case 'cs':
                        icon = '<i class="fab fa-microsoft" style="color: #239120;"></i>';
                        break;
                    case 'r':
                        icon = '<i class="fab fa-r-project" style="color: #276dc3;"></i>';
                        break;
                    case 'jl':
                        icon = '<i class="fas fa-file-code" style="color: #9558b2;"></i>';
                        break;
                    case 'hs':
                        icon = '<i class="fas fa-file-code" style="color: #5d4f85;"></i>';
                        break;
                    case 'clj':
                        icon = '<i class="fas fa-file-code" style="color: #5881d8;"></i>';
                        break;
                    case 'elm':
                        icon = '<i class="fas fa-file-code" style="color: #60b5cc;"></i>';
                        break;
                    case 'ex':
                        icon = '<i class="fas fa-file-code" style="color: #4b275f;"></i>';
                        break;
                    case 'erl':
                        icon = '<i class="fas fa-file-code" style="color: #a90533;"></i>';
                        break;
                    case 'scala':
                        icon = '<i class="fas fa-file-code" style="color: #dc322f;"></i>';
                        break;
                    case 'dart':
                        icon = '<i class="fab fa-dart" style="color: #0175c2;"></i>';
                        break;
                    case 'lua':
                        icon = '<i class="fas fa-file-code" style="color: #000080;"></i>';
                        break;
                    case 'asm':
                        icon = '<i class="fas fa-file-code" style="color: #6e4c13;"></i>';
                        break;
                    case 'groovy':
                        icon = '<i class="fas fa-file-code" style="color: #4298b8;"></i>';
                        break;
                    case 'coffee':
                        icon = '<i class="fab fa-coffeescript" style="color: #244776;"></i>';
                        break;
                    case 'f90':
                    case 'f':
                        icon = '<i class="fas fa-file-code" style="color: #4d41b1;"></i>';
                        break;
                    case 'matlab':
                    case 'm':
                        icon = '<i class="fas fa-file-code" style="color: #e16737;"></i>';
                        break;
                    case 'tex':
                        icon = '<i class="fas fa-file-code" style="color: #008080;"></i>';
                        break;
                    case 'toml':
                        icon = '<i class="fas fa-file-code" style="color: #9c4221;"></i>';
                        break;
                    case 'ini':
                        icon = '<i class="fas fa-file-code" style="color: #6c757d;"></i>';
                        break;
                    case 'log':
                        icon = '<i class="fas fa-file-alt" style="color: #6c757d;"></i>';
                        break;
                    case 'lock':
                        icon = '<i class="fas fa-lock" style="color: #6c757d;"></i>';
                        break;
                    case 'gitignore':
                    case 'gitattributes':
                        icon = '<i class="fab fa-git-alt" style="color: #f14c28;"></i>';
                        break;
                    case 'dockerfile':
                        icon = '<i class="fab fa-docker" style="color: #2496ed;"></i>';
                        break;
                    case 'yml':
                    case 'yaml':
                        icon = '<i class="fas fa-file-code" style="color: #a67f59;"></i>';
                        break;
                    default:
                        icon = '<i class="fas fa-file" style="color: #808080;"></i>';
                }
            }

            fileElement.innerHTML = `${icon} <span>${file.name}</span>`;

            // Add click event
            if (file.type === 'directory') {
                fileElement.addEventListener('click', (e) => {
                    // Toggle folder expanded state only if the click is on the folder item itself, not its children
                    if (e.target === fileElement || e.target.closest('.folder-item') === fileElement) {
                        this.toggleFolder(fileElement, file.path); // Call toggleFolder without reload parameter
                    }
                });
                // Set initial collapsed state
                fileElement.classList.add('collapsed');

                const folderContentsElement = document.createElement('div');
                folderContentsElement.className = 'folder-contents';
                fileElement.appendChild(folderContentsElement);
                // No longer recursively render children here. They will be fetched on demand.
                // if (file.contents && file.contents.length > 0) {
                //     this._renderTree(file.contents, file.path, folderContentsElement);
                // }
            } else {
                fileElement.addEventListener('click', () => {
                    this.openFile(file.path);
                });
            }

            parentElement.appendChild(fileElement);
        });
    }

    /**
     * Add context menu listeners to file/folder elements.
     * @param {HTMLElement} containerElement - The container to add listeners to.
     */
    addContextMenuListeners(containerElement) {
        // Delegated event listener for context menu on file/folder items
        containerElement.addEventListener('contextmenu', (e) => {
            const targetItem = e.target.closest('.file-item, .folder-item');
            if (targetItem) {
                e.preventDefault(); // Prevent default browser context menu
                this.showContextMenu(e.clientX, e.clientY, targetItem.dataset.path, targetItem.classList.contains('folder-item'));
            }
        });

        // Hide context menu when clicking anywhere else
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });
    }

    /**
     * Show the custom context menu.
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate.
     * @param {string} itemPath - Path of the file/folder right-clicked.
     * @param {boolean} isFolder - True if the item is a folder, false otherwise.
     */
    showContextMenu(x, y, itemPath, isFolder) {
        let contextMenu = document.getElementById('context-menu');
        if (!contextMenu) {
            contextMenu = document.createElement('div');
            contextMenu.id = 'context-menu';
            contextMenu.className = 'context-menu';
            document.body.appendChild(contextMenu);
        }

        let menuItems = `
            <div class="context-menu-item" id="rename-item">Rename</div>
            <div class="context-menu-item" id="delete-item">Delete</div>
        `;

        if (isFolder) {
            menuItems += `
                <div class="context-menu-item" id="new-file-in-folder">New File</div>
                <div class="context-menu-item" id="new-folder-in-folder">New Folder</div>
            `;
        }

        contextMenu.innerHTML = menuItems;

        // Position the menu
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.style.display = 'block';

        // Add event listeners for menu items
        document.getElementById('rename-item').onclick = () => {
            this.showRenameModal(itemPath, isFolder);
            this.hideContextMenu();
        };
        document.getElementById('delete-item').onclick = () => {
            this.deleteFileOrFolder(itemPath);
            this.hideContextMenu();
        };

        if (isFolder) {
            document.getElementById('new-file-in-folder').onclick = () => {
                this.showNewFileModal(itemPath);
                this.hideContextMenu();
            };
            document.getElementById('new-folder-in-folder').onclick = () => {
                this.showNewFolderModal(itemPath);
                this.hideContextMenu();
            };
        }
    }

    /**
     * Hide the custom context menu.
     */
    hideContextMenu() {
        const contextMenu = document.getElementById('context-menu');
        if (contextMenu) {
            contextMenu.style.display = 'none';
        }
    }

    /**
     * Delete a file or folder.
     * @param {string} filePath - Path of the file/folder to delete.
     */
    deleteFileOrFolder(filePath) {
        if (!confirm(`Are you sure you want to delete ${filePath}?`)) {
            return;
        }

        fetch('/api/files/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ path: filePath })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(`${filePath} deleted successfully.`);
                    this.loadDirectory(this.currentDirectory); // Refresh file explorer
                } else {
                    console.error('Error deleting file/folder:', data.error);
                    alert(`Error deleting file/folder: ${data.error}`);
                }
            })
            .catch(error => {
                console.error('Error deleting file/folder:', error);
                alert(`Error deleting file/folder: ${error.message}`);
            });
    }

    /**
     * Toggle a folder's expanded/collapsed state.
     * @param {HTMLElement} folderElement - The folder item's DOM element.
     * @param {string} folderPath - The path of the folder.
     * @param {boolean} [reload=true] - Whether to reload the directory after toggling.
     */
    toggleFolder(folderElement, folderPath) {
        const isCollapsed = folderElement.classList.contains('collapsed');
        const chevronIcon = folderElement.querySelector('.folder-toggle-icon');
        const folderIcon = folderElement.querySelector('.folder-icon');
        const folderContentsElement = folderElement.querySelector('.folder-contents');

        if (isCollapsed) {
            // Expand folder
            folderElement.classList.remove('collapsed');
            folderElement.classList.add('expanded');
            if (chevronIcon) chevronIcon.classList.replace('fa-chevron-right', 'fa-chevron-down');
            if (folderIcon) folderIcon.classList.replace('fa-folder', 'fa-folder-open');
            if (folderContentsElement) folderContentsElement.style.display = 'block';

            // Fetch and render contents if not already loaded
            if (folderContentsElement && folderContentsElement.children.length === 0) {
                fetch('/api/files/get_folder_contents', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ path: folderPath })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            this._renderTree(data.contents, folderPath, folderContentsElement);
                            this.addContextMenuListeners(folderContentsElement); // Add listeners to new elements
                        } else {
                            console.error('Error loading folder contents:', data.error);
                            alert(`Error loading folder contents: ${data.error}`);
                        }
                    })
                    .catch(error => {
                        console.error('Error loading folder contents:', error);
                        alert(`Error loading folder contents: ${error.message}`);
                    });
            }
        } else {
            // Collapse folder
            folderElement.classList.remove('expanded');
            folderElement.classList.add('collapsed');
            if (folderIcon) folderIcon.classList.replace('fa-folder-open', 'fa-folder');
            if (folderContentsElement) folderContentsElement.style.display = 'none';
        }
    }

    /**
     * Open a file and display in editor
     * @param {string} filePath - Path to the file
     */
    openFile(filePath) {
        fetch('/api/files/read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ path: filePath })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Get file name from path
                    const fileName = filePath.split(this.pathSeparator).pop();

                    // Add to open files map
                    this.openFiles.set(filePath, data.content);

                    // Create a new tab and set editor content
                    window.editorManager.createTab(fileName, filePath, data.content);
                } else {
                    console.error('Error opening file:', data.error);
                    alert(`Error opening file: ${data.error}`);
                }
            })
            .catch(error => {
                console.error('Error opening file:', error);
                alert(`Error opening file: ${error.message}`);
            });
    }

    /**
     * Save a file
     * @param {string} filePath - Path to the file
     * @param {string} content - File content
     * @returns {Promise} - Promise that resolves when file is saved
     */
    saveFile(filePath, content) {
        console.log('Saving file to:', filePath, 'with content length:', content.length);
        return fetch('/api/files/write', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: filePath,
                    content: content
                })
            })
            .then(response => {
                console.log('Save response status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('Save response data:', data);
                if (data.success) {
                    // Update open files map
                    this.openFiles.set(filePath, content);
                    
                    // Refresh the file explorer to show the new file
                    this.loadDirectory(this.currentDirectory);
                    
                    // Show a notification
                    const notification = document.createElement('div');
                    notification.className = 'save-notification';
                    notification.textContent = 'File saved successfully!';
                    document.body.appendChild(notification);
                    setTimeout(() => {
                        notification.classList.add('show');
                        setTimeout(() => {
                            notification.classList.remove('show');
                            setTimeout(() => {
                                document.body.removeChild(notification);
                            }, 300);
                        }, 1500);
                    }, 10);
                    
                    return true;
                } else {
                    console.error('Error saving file:', data.error);
                    alert(`Error saving file: ${data.error}`);
                    return false;
                }
            })
            .catch(error => {
                console.error('Error saving file:', error);
                alert(`Error saving file: ${error.message}`);
                return false;
            });
    }

    /**
     * Download a file to the user's device
     * @param {string} filePath - Path to the file
     * @param {string} content - File content
     * @param {string} fileName - Name of the file
     */
    downloadFile(filePath, content, fileName) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Show modal for creating a new file
     */
    showNewFileModal(targetDirectory = this.currentDirectory) {
        // If no directory is set, use current working directory
        if (!targetDirectory) {
            targetDirectory = '.';
        }
        
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        modalTitle.textContent = 'Create New File';

        modalBody.innerHTML = `
            <div class="form-group">
                <label for="file-name">File Name:</label>
                <input type="text" id="file-name" placeholder="my-file.js">
            </div>
            <div id="new-file-error" class="error-message"></div> <!-- Error message div -->
            <div class="form-actions">
                <button class="btn btn-secondary" id="cancel-new-file">Cancel</button>
                <button class="btn btn-primary" id="create-new-file">Create</button>
            </div>
        `;

        // Show modal
        modal.style.display = 'block';

        // Add event listeners
        document.getElementById('cancel-new-file').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        document.getElementById('create-new-file').addEventListener('click', () => {
            const fileNameInput = document.getElementById('file-name');
            const fileName = fileNameInput.value.trim();
            const errorDiv = document.getElementById('new-file-error');
            errorDiv.textContent = ''; // Clear previous errors

            if (!fileName) {
                errorDiv.textContent = 'Please enter a file name.';
                return;
            }

            // Determine file extension for boilerplate
            const fileExtension = fileName.split('.').pop().toLowerCase();
            const boilerplateContent = this.getBoilerplateContent(fileExtension);

            // Create file in memory only (no need to save to disk immediately)
            // Wait for EditorManager to be available (with longer retry)
            const createFileWithRetry = (retries = 30, delay = 300) => {
                // Try fallback initialization if available
                if (!window.editorManager && typeof window.ensureEditorManager === 'function') {
                    window.ensureEditorManager();
                }
                
                if (window.editorManager && typeof window.editorManager.createNewFile === 'function') {
                    try {
                        window.editorManager.createNewFile(fileName, this.getLanguageFromExtension(fileExtension), boilerplateContent);
                        console.log('Created new file in editor:', fileName);
                        
                        // Close modal
                        modal.style.display = 'none';
                    } catch (err) {
                        console.error('Error creating file:', err);
                        errorDiv.textContent = `Error creating file: ${err.message}`;
                        errorDiv.style.color = '#ff6b6b';
                    }
                } else if (retries > 0) {
                    // Show loading message on first retry
                    if (retries === 30) {
                        errorDiv.textContent = 'Initializing editor... Please wait.';
                        errorDiv.style.color = '#4ecdc4';
                    }
                    // Retry after delay
                    setTimeout(() => createFileWithRetry(retries - 1, delay), delay);
                } else {
                    console.error('EditorManager or createNewFile function not available after retries');
                    // Try one more time with fallback
                    if (typeof window.ensureEditorManager === 'function' && window.ensureEditorManager()) {
                        if (window.editorManager && typeof window.editorManager.createNewFile === 'function') {
                            try {
                                window.editorManager.createNewFile(fileName, this.getLanguageFromExtension(fileExtension), boilerplateContent);
                                console.log('Created new file in editor (fallback):', fileName);
                                modal.style.display = 'none';
                                return;
                            } catch (err) {
                                console.error('Error creating file after fallback:', err);
                            }
                        }
                    }
                    errorDiv.textContent = 'Error creating file: Editor not initialized. Please wait a moment and try again, or refresh the page.';
                    errorDiv.style.color = '#ff6b6b';
                }
            };
            
            createFileWithRetry();
        });
        
        // Handle Enter key press
        document.getElementById('file-name').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('create-new-file').click();
            }
        });
        
        // Focus on input
        document.getElementById('file-name').focus();

        // Close modal when clicking on X
        document.querySelector('.close').addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    /**
     * Show modal for creating a new folder
     */
    showNewFolderModal(targetDirectory = this.currentDirectory) {
        // If no directory is set, use current working directory
        if (!targetDirectory) {
            targetDirectory = '.';
        }
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        modalTitle.textContent = 'Create New Folder';

        modalBody.innerHTML = `
            <div class="form-group">
                <label for="folder-name">Folder Name:</label>
                <input type="text" id="folder-name" placeholder="${targetDirectory && targetDirectory !== '.' ? 'my-new-folder' : 'new-folder'}">
            </div>
            <div id="new-folder-error" class="error-message"></div> <!-- Error message div -->
            <div class="form-actions">
                <button class="btn btn-secondary" id="cancel-new-folder">Cancel</button>
                <button class="btn btn-primary" id="create-new-folder">Create</button>
            </div>
        `;

        // Show modal
        modal.style.display = 'block';

        // Add event listeners
        document.getElementById('cancel-new-folder').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        document.getElementById('create-new-folder').addEventListener('click', () => {
            const folderNameInput = document.getElementById('folder-name');
            const folderName = folderNameInput.value.trim();
            const errorDiv = document.getElementById('new-folder-error');
            errorDiv.textContent = ''; // Clear previous errors

            if (!folderName) {
                errorDiv.textContent = 'Please enter a folder name.';
                return;
            }

            // Construct new folder path
            let newFolderPath;
            let directoryToLoadAfterCreation = targetDirectory;

            newFolderPath = `${targetDirectory}${this.pathSeparator}${folderName}`;

            // Create folder
            fetch('/api/files/create_folder', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ path: newFolderPath })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Reload the directory from which the folder was created, or the root
                        this.loadDirectory(directoryToLoadAfterCreation); // Load the root or current directory

                        // Close modal
                        modal.style.display = 'none';
                    } else {
                        console.error('Error creating folder:', data.error);
                        errorDiv.textContent = `Error creating folder: ${data.error}`;
                    }
                })
                .catch(error => {
                    console.error('Error creating folder:', error);
                    errorDiv.textContent = `Error creating folder: ${error.message}`;
                });
        });

        // Close modal when clicking on X
        document.querySelector('.close').addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    /**
     * Show modal for opening a folder (by path input).
     */
    showOpenFolderModal() {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        modalTitle.textContent = 'Open Folder';

        modalBody.innerHTML = `
            <div class="form-group">
                <label for="folder-path">Folder Path:</label>
                <input type="text" id="folder-path" placeholder="Enter folder path (e.g., /my-project)" value="${this.currentDirectory}">
            </div>
            <div id="open-folder-error" class="error-message"></div> <!-- Error message div -->
            <div class="form-actions">
                <button class="btn btn-secondary" id="cancel-open-folder">Cancel</button>
                <button class="btn btn-primary" id="open-folder-submit">Open</button>
            </div>
        `;

        modal.style.display = 'block';

        document.getElementById('cancel-open-folder').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        document.getElementById('open-folder-submit').addEventListener('click', () => {
            const folderPathInput = document.getElementById('folder-path');
            const folderPath = folderPathInput.value.trim();
            const errorDiv = document.getElementById('open-folder-error');
            errorDiv.textContent = ''; // Clear previous errors

            if (!folderPath) {
                errorDiv.textContent = 'Please enter a folder path.';
                return;
            }

            this.currentDirectory = folderPath;
            this.loadDirectory(folderPath);
            modal.style.display = 'none';
        });

        document.querySelector('.close').addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    /**
     * Show modal for renaming a file or folder.
     * @param {string} itemPath - The full path of the item to rename.
     * @param {boolean} isFolder - True if the item is a folder, false if it's a file.
     */
    showRenameModal(itemPath, isFolder) {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        const oldName = itemPath.split(this.pathSeparator).pop();
        modalTitle.textContent = `Rename ${isFolder ? 'Folder' : 'File'}`;

        modalBody.innerHTML = `
            <div class="form-group">
                <label for="new-name">New Name:</label>
                <input type="text" id="new-name" value="${oldName}">
            </div>
            <div id="rename-error" class="error-message"></div> <!-- Error message div -->
            <div class="form-actions">
                <button class="btn btn-secondary" id="cancel-rename">Cancel</button>
                <button class="btn btn-primary" id="confirm-rename">Rename</button>
            </div>
        `;

        modal.style.display = 'block';

        document.getElementById('cancel-rename').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        document.getElementById('confirm-rename').addEventListener('click', () => {
            const newNameInput = document.getElementById('new-name');
            const newName = newNameInput.value.trim();
            const errorDiv = document.getElementById('rename-error');
            errorDiv.textContent = ''; // Clear previous errors

            if (!newName) {
                errorDiv.textContent = 'Please enter a new name.';
                return;
            }

            const parentPath = itemPath.substring(0, itemPath.lastIndexOf(this.pathSeparator));
            const newPath = `${parentPath}${this.pathSeparator}${newName}`;

            this.renameFileOrFolder(itemPath, newPath, isFolder);
            modal.style.display = 'none';
        });

        document.querySelector('.close').addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    /**
     * Rename a file or folder.
     * @param {string} oldPath - The current path of the item.
     * @param {string} newPath - The new path for the item.
     * @param {boolean} isFolder - True if the item is a folder, false if it's a file.
     */
    renameFileOrFolder(oldPath, newPath, isFolder) {
        fetch('/api/files/rename', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ oldPath, newPath, isFolder })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(`${oldPath} renamed to ${newPath} successfully.`);
                    // If the renamed item was the current directory, update currentDirectory
                    if (oldPath === this.currentDirectory) {
                        this.currentDirectory = newPath;
                    }
                    this.loadDirectory(this.currentDirectory); // Refresh file explorer
                    // If it was an open file, update the tab info
                    if (!isFolder && window.editorManager) {
                        window.editorManager.renameTab(oldPath, newPath, data.newFileName);
                    }
                } else {
                    console.error('Error renaming file/folder:', data.error);
                    const errorDiv = document.getElementById('rename-error');
                    errorDiv.textContent = `Error renaming file/folder: ${data.error}`;
                }
            })
            .catch(error => {
                console.error('Error renaming file/folder:', error);
                const errorDiv = document.getElementById('rename-error');
                errorDiv.textContent = `Error renaming file/folder: ${error.message}`;
            });
    }

    /**
     * Add drag and drop support for file operations
     * @param {HTMLElement} containerElement - The container to add drag and drop to
     */
    addDragAndDropSupport(containerElement) {
        // Enable drag and drop on the file explorer
        containerElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        containerElement.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = Array.from(e.dataTransfer.files);
            
            if (files.length > 0) {
                // Handle file drops
                this.handleFileDrop(files);
            }
        });

        // Add drag start for file items
        containerElement.addEventListener('dragstart', (e) => {
            const fileItem = e.target.closest('.file-item, .folder-item');
            if (fileItem) {
                e.dataTransfer.setData('text/plain', fileItem.dataset.path);
                e.dataTransfer.effectAllowed = 'move';
            }
        });
    }

    /**
     * Handle dropped files
     * @param {FileList} files - The dropped files
     */
    handleFileDrop(files) {
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                const fileName = file.name;
                const filePath = `${this.currentDirectory}${this.pathSeparator}${fileName}`;
                
                // Save the file
                this.saveFile(filePath, content).then(success => {
                    if (success) {
                        this.loadDirectory(this.currentDirectory);
                        // Open the file in editor
                        setTimeout(() => {
                            this.openFile(filePath);
                        }, 300);
                    }
                });
            };
            reader.readAsText(file);
        });
    }

    /**
     * Get language identifier from file extension
     * @param {string} extension - File extension
     * @returns {string} - Monaco editor language identifier
     */
    getLanguageFromExtension(extension) {
        const extensionMap = {
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
        
        return extensionMap[extension] || 'plaintext';
    }
    
    /**
     * Get boilerplate content for a given file extension.
     * @param {string} extension - The file extension (e.g., 'cpp', 'py').
     * @returns {string} - The boilerplate content.
     */
    getBoilerplateContent(extension) {
        switch (extension) {
            case 'cpp':
                return `#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}`;
            case 'c':
                return `#include <stdio.h>

int main() {
    printf("Hello, World!\n");
    return 0;
}`;
            case 'py':
                return `print("Hello, World!")`;
            case 'js':
                return `console.log("Hello, World!");`;
            case 'html':
                return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    
</body>
</html>`;
            case 'css':
                return `/* style.css */`;
            case 'java':
                return `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`;
                // Add more languages as needed
            default:
                return '';
        }
    }
}

// Export for use in other modules
// Initialize file explorer when DOM is ready, but wait for EditorManager
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for EditorManager to initialize
    setTimeout(function() {
        if (!window.fileExplorer) {
            window.fileExplorer = new FileExplorer();
        }
    }, 500);
    
    // Also set it immediately if DOMContentLoaded fires late
    if (!window.fileExplorer) {
        window.fileExplorer = new FileExplorer();
    }
});

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading, will be handled by DOMContentLoaded above
} else {
    // DOM is already loaded
    if (!window.fileExplorer) {
        window.fileExplorer = new FileExplorer();
    }
}

// Add a function to editorManager to handle tab renaming
if (window.editorManager) {
    window.editorManager.renameTab = function(oldPath, newPath, newFileName) {
        for (const [tabId, tab] of this.tabs.entries()) {
            if (tab.path === oldPath) {
                tab.path = newPath;
                tab.title = newFileName;
                this.updateTabTitle(tabId);
                // Also update the model's URI if it exists
                const model = this.editor.getModel();
                if (model && model.uri.toString() === this.monaco.Uri.file(oldPath).toString()) {
                    // Monaco models are immutable in terms of URI, so we might need to dispose and recreate
                    // For now, we'll just update the tab title and path internally.
                    // A full LSP integration would handle this via textDocument/didClose and textDocument/didOpen.
                    console.warn('Monaco model URI cannot be directly changed. Consider re-opening the file in a new tab if issues arise.');
                }
                break;
            }
        }
    };
}