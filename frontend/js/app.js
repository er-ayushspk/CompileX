/**
 * Main Application Module
 * Initializes and connects all components
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app components...');
    
    // Set up modal close functionality
    const closeButton = document.querySelector('.close');
    const modal = document.getElementById('modal');
    
    // Check if elements exist before adding event listener
    if (closeButton && modal) {
        closeButton.addEventListener('click', function() {
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Close modal when clicking outside of it
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('modal');
        if (modal && event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Add keyboard shortcut for running code (F5)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F5') {
            e.preventDefault(); // Prevent default browser behavior
            if (window.compiler) {
                window.compiler.runCode();
            }
        }
    });

    // Initialize theme toggle
    initializeThemeToggle();
    
    console.log('CompileX initialized successfully');
});

/**
 * Initialize theme toggle functionality
 */
function initializeThemeToggle() {
    const checkbox = document.getElementById('toggle');
    const currentTheme = localStorage.getItem('theme') || 'dark';

    // Apply initial theme
    if (currentTheme === 'light') {
        document.body.classList.add('light-theme');
        if (checkbox) checkbox.checked = false;
        if (window.monaco) {
            monaco.editor.setTheme('compilex-light');
        }
    } else {
        document.body.classList.remove('light-theme');
        if (checkbox) checkbox.checked = true;
        if (window.monaco) {
            monaco.editor.setTheme('compilex-dark');
        }
    }

    // Wire checkbox change
    if (checkbox) {
        checkbox.addEventListener('change', function() {
            const isDark = checkbox.checked;
            if (isDark) {
                // Dark mode
                document.body.classList.remove('light-theme');
                localStorage.setItem('theme', 'dark');
                if (window.monaco) monaco.editor.setTheme('compilex-dark');
            } else {
                // Light mode
                document.body.classList.add('light-theme');
                localStorage.setItem('theme', 'light');
                if (window.monaco) monaco.editor.setTheme('compilex-light');
            }
        });
    } else {
        // Fallback: handle legacy button if present
        const legacyBtn = document.getElementById('theme-toggle-btn');
        if (legacyBtn) {
            legacyBtn.addEventListener('click', function() {
                const isDark = !document.body.classList.contains('light-theme');
                if (isDark) {
                    document.body.classList.add('light-theme');
                    localStorage.setItem('theme', 'light');
                    if (window.monaco) monaco.editor.setTheme('compilex-light');
                } else {
                    document.body.classList.remove('light-theme');
                    localStorage.setItem('theme', 'dark');
                    if (window.monaco) monaco.editor.setTheme('compilex-dark');
                }
            });
        } else {
            console.warn('Theme toggle control not found.');
        }
    }
}

/**
 * Initialize the application
 */
function initializeApp() {
    // Set up modal close functionality
    const closeButton = document.querySelector('.close');
    const modal = document.getElementById('modal');
    
    // Check if elements exist before adding event listener
    if (closeButton && modal) {
        closeButton.addEventListener('click', function() {
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Close modal when clicking outside of it
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('modal');
        if (modal && event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Add keyboard shortcut for running code (F5)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F5') {
            e.preventDefault(); // Prevent default browser behavior
            if (window.compiler) {
                window.compiler.runCode();
            }
        }
    });

    // Initialize theme toggle
    initializeThemeToggle();

    // Initialize EditorManager now that Monaco is guaranteed to be loaded
    if (window.editorManager === undefined) {
        try {
            window.editorManager = new EditorManager();
            console.log('EditorManager initialized in initializeApp');
        } catch (error) {
            console.error('Failed to initialize EditorManager:', error);
        }
    }

    // Don't create welcome file here - let editor.js handle it with createWelcomeTab
    // This prevents duplicate welcome files

    // Log initialization complete
    console.log('CompileX initialized successfully');
}

// Function removed as it was creating redundant buttons

/**
 * Initialize theme toggle functionality
 */
function initializeThemeToggle() {
    const checkbox = document.getElementById('toggle');
    const currentTheme = localStorage.getItem('theme') || 'dark';
    if (currentTheme === 'light') {
        document.body.classList.add('light-theme');
        if (checkbox) checkbox.checked = false;
        if (window.monaco) monaco.editor.setTheme('compilex-light');
    } else {
        document.body.classList.remove('light-theme');
        if (checkbox) checkbox.checked = true;
        if (window.monaco) monaco.editor.setTheme('compilex-dark');
    }
    if (checkbox) {
        checkbox.addEventListener('change', function() {
            const isDark = checkbox.checked;
            if (isDark) {
                document.body.classList.remove('light-theme');
                localStorage.setItem('theme', 'dark');
                if (window.monaco) monaco.editor.setTheme('compilex-dark');
            } else {
                document.body.classList.add('light-theme');
                localStorage.setItem('theme', 'light');
                if (window.monaco) monaco.editor.setTheme('compilex-light');
            }
        });
    }
}

/**
 * Initialize AI agent functionality
 */
function initializeAgent() {
    // Initialize the CodeAgent class
    try {
        window.codeAgent = new CodeAgent();
        console.log('AI Agent initialized successfully');
    } catch (error) {
        console.error('Error initializing AI Agent:', error);
    }
}

/**
 * Handle errors globally
 */
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error:', { message, source, lineno, colno, error });

    // Show error in output panel if available
    if (window.compiler && window.compiler.appendOutput) {
        window.compiler.appendOutput(`Error: ${message}`, 'error');
    }

    return true; // Prevent default error handling
};