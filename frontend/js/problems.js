/**
 * Problems Panel
 * Renders Monaco markers for the current model
 */
(function() {
  function updateProblemsPanel() {
    if (!window.editorManager || !window.editorManager.editor || !window.monaco) return;
    const problemsEl = document.getElementById('problems');
    if (!problemsEl) return;

    const model = window.editorManager.editor.getModel();
    if (!model) {
      problemsEl.innerHTML = '<div class="output-line info">No file open.</div>';
      return;
    }

    const markers = window.monaco.editor.getModelMarkers({ resource: model.uri });
    if (!markers || markers.length === 0) {
      problemsEl.innerHTML = '<div class="output-line success">No problems detected.</div>';
      return;
    }

    const list = document.createElement('div');
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '6px';

    markers.forEach(m => {
      const item = document.createElement('div');
      const severity = m.severity === window.monaco.MarkerSeverity.Error ? 'Error' : (m.severity === window.monaco.MarkerSeverity.Warning ? 'Warning' : 'Info');
      item.className = 'output-line ' + (severity.toLowerCase());
      item.textContent = `${severity} [${m.startLineNumber}:${m.startColumn}] ${m.message}`;
      item.style.cursor = 'pointer';
      item.addEventListener('click', function() {
        const editor = window.editorManager.editor;
        editor.revealLineInCenter(m.startLineNumber);
        editor.setPosition({ lineNumber: m.startLineNumber, column: m.startColumn });
        editor.focus();
        // Select the range
        editor.setSelection({ startLineNumber: m.startLineNumber, startColumn: m.startColumn, endLineNumber: m.endLineNumber, endColumn: m.endColumn });
      });
      list.appendChild(item);
    });

    problemsEl.innerHTML = '';
    problemsEl.appendChild(list);
  }

  // Expose globally so editor.js and compiler.js can trigger updates
  window.updateProblemsPanel = updateProblemsPanel;

  // Initialize after DOM ready
  document.addEventListener('DOMContentLoaded', updateProblemsPanel);
})();