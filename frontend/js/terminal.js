/**
 * Terminal Panel
 * Real terminal-like interface with command history and auto-clear
 */
(function() {
  function createTerminalUI() {
    const container = document.getElementById('terminal');
    if (!container) return;

    container.innerHTML = '';

    const output = document.createElement('div');
    output.id = 'terminal-output';
    output.className = 'terminal-output';
    output.style.height = 'calc(100% - 40px)';
    output.style.overflowY = 'auto';
    output.style.fontFamily = '"JetBrains Mono","Fira Code",Consolas,"Courier New",monospace';
    output.style.fontSize = '14px';
    output.style.padding = '10px';
    output.style.color = 'var(--text-color)';
    output.style.backgroundColor = 'var(--bg-color)';

    const inputBar = document.createElement('div');
    inputBar.id = 'terminal-input-bar';
    inputBar.className = 'terminal-input-bar';
    inputBar.style.display = 'flex';
    inputBar.style.gap = '8px';
    inputBar.style.marginTop = '8px';
    inputBar.style.alignItems = 'center';

    const prompt = document.createElement('span');
    prompt.className = 'terminal-prompt';
    prompt.textContent = '$ ';
    prompt.style.color = 'var(--text-color)';
    prompt.style.fontFamily = '"JetBrains Mono","Fira Code",Consolas,"Courier New",monospace';
    prompt.style.fontSize = '14px';

    const input = document.createElement('input');
    input.id = 'terminal-command';
    input.type = 'text';
    input.className = 'terminal-input';
    input.placeholder = '';
    input.style.flex = '1';
    input.style.padding = '4px 8px';
    input.style.borderRadius = '4px';
    input.style.border = '1px solid var(--border-color)';
    input.style.backgroundColor = 'var(--panel-bg)';
    input.style.color = 'var(--text-color)';
    input.style.fontFamily = '"JetBrains Mono","Fira Code",Consolas,"Courier New",monospace';
    input.style.fontSize = '14px';
    input.style.outline = 'none';
    input.readOnly = false; // Ensure it's writable
    input.disabled = false; // Ensure it's enabled

    inputBar.appendChild(prompt);
    inputBar.appendChild(input);

    container.appendChild(output);
    container.appendChild(inputBar);

    // Command history
    let commandHistory = [];
    let historyIndex = -1;
    let currentCommand = '';

    function appendLine(text, cls) {
      const line = document.createElement('div');
      line.className = 'terminal-line' + (cls ? ' ' + cls : '');
      line.textContent = text;
      line.style.whiteSpace = 'pre-wrap';
      line.style.wordBreak = 'break-word';
      
      if (cls === 'error') {
        line.style.color = '#ff6b6b';
      } else if (cls === 'success') {
        line.style.color = '#4ecdc4';
      } else if (cls === 'command') {
        line.style.color = '#4ecdc4';
        line.style.fontWeight = 'bold';
      } else {
        line.style.color = 'var(--text-color)';
      }
      
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    }

    function runCommand(cmd) {
      if (!cmd || !cmd.trim()) {
        // Show prompt again
        appendLine('$ ', 'prompt');
        return;
      }

      // Add to history
      commandHistory.push(cmd);
      historyIndex = commandHistory.length;
      currentCommand = '';

      // Display command
      appendLine('$ ' + cmd, 'command');

      // Clear input immediately
      input.value = '';

      // Show loading indicator
      const loadingLine = document.createElement('div');
      loadingLine.className = 'terminal-line loading';
      loadingLine.textContent = '...';
      output.appendChild(loadingLine);

      // Execute command
      fetch('/api/terminal/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      })
        .then(res => res.json())
        .then(data => {
          // Remove loading indicator
          if (loadingLine.parentNode) {
            loadingLine.parentNode.removeChild(loadingLine);
          }

          // Display output - safely handle undefined/null values
          if (data.stderr && typeof data.stderr === 'string' && data.stderr.trim()) {
            // Split stderr into lines for better formatting
            const errorLines = data.stderr.trim().split('\n');
            errorLines.forEach(line => {
              if (line && line.trim()) {
                appendLine(line, 'error');
              }
            });
          }
          
          if (data.stdout && typeof data.stdout === 'string' && data.stdout.trim()) {
            // Split stdout into lines
            const outputLines = data.stdout.trim().split('\n');
            outputLines.forEach(line => {
              if (line && line.trim()) {
                appendLine(line, 'output');
              }
            });
          }
          
          if (!data.stdout && !data.stderr) {
            appendLine('(no output)', 'info');
          }

          // Show exit code if non-zero
          if (data.code !== undefined && data.code !== 0) {
            appendLine(`[Exit code: ${data.code}]`, 'error');
          }

          // Add new prompt line
          appendLine('$ ', 'prompt');
        })
        .catch(err => {
          // Remove loading indicator
          if (loadingLine.parentNode) {
            loadingLine.parentNode.removeChild(loadingLine);
          }
          
          appendLine(`Error: ${err.message}`, 'error');
          appendLine('$ ', 'prompt');
        });

      // Focus input for next command
      setTimeout(() => {
        input.focus();
      }, 100);
    }

    // Handle Enter key
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        const cmd = input.value.trim();
        runCommand(cmd);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIndex > 0) {
          if (historyIndex === commandHistory.length) {
            currentCommand = input.value; // Save current input
          }
          historyIndex--;
          input.value = commandHistory[historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex < commandHistory.length - 1) {
          historyIndex++;
          input.value = commandHistory[historyIndex];
        } else {
          historyIndex = commandHistory.length;
          input.value = currentCommand; // Restore current input
        }
      }
    });

    // Focus input on container click
    container.addEventListener('click', function() {
      input.focus();
    });

    // Initial prompt
    appendLine('$ ', 'prompt');
    
    // Focus input
    setTimeout(() => {
      input.focus();
    }, 100);
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', createTerminalUI);
})();
