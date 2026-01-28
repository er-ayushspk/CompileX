class Resizer {
    constructor(resizerId, targetElement, direction) {
        this.resizer = document.getElementById(resizerId);
        this.targetElement = document.getElementById(targetElement);
        this.direction = direction; // 'horizontal' or 'vertical'

        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.startWidth = 0;
        this.startHeight = 0;

        this.initEventListeners();
    }

    initEventListeners() {
        this.resizer.addEventListener('mousedown', this.startDragging.bind(this));
    }

    startDragging(e) {
        this.isDragging = true;
        this.startX = e.clientX;
        this.startY = e.clientY;

        // Get current sizes from CSS custom properties for initial calculation
        const rootStyles = getComputedStyle(document.documentElement);
        if (this.targetElement.id === 'left-sidebar') {
            this.startWidth = parseFloat(rootStyles.getPropertyValue('--left-sidebar-width'));
        } else if (this.targetElement.id === 'right-sidebar') {
            this.startWidth = parseFloat(rootStyles.getPropertyValue('--right-sidebar-width'));
        } else if (this.targetElement.id === 'bottom-panel') {
            this.startHeight = parseFloat(rootStyles.getPropertyValue('--bottom-panel-height'));
        }

        document.addEventListener('mousemove', this.doDrag.bind(this));
        document.addEventListener('mouseup', this.stopDragging.bind(this));

        // Add a class to body to prevent text selection during dragging
        document.body.classList.add('resizing');
    }

    doDrag(e) {
        if (!this.isDragging) return;

        const root = document.documentElement;

        if (this.direction === 'horizontal') {
            let newWidth;
            if (this.targetElement.id === 'left-sidebar') {
                newWidth = this.startWidth + (e.clientX - this.startX);
                // Enforce minimum width
                newWidth = Math.max(newWidth, 180); // Minimum sidebar width
                root.style.setProperty('--left-sidebar-width', `${newWidth}px`);
            } else if (this.targetElement.id === 'right-sidebar') {
                // For right sidebar, dragging right should increase width
                newWidth = this.startWidth + (e.clientX - this.startX); // Changed to addition
                // Enforce minimum width
                newWidth = Math.max(newWidth, 180); // Minimum sidebar width
                root.style.setProperty('--right-sidebar-width', `${newWidth}px`);
            }

            // Need to inform Monaco editor of resize
            window.editorManager.layout(); // Trigger editor layout recalculation

        } else if (this.direction === 'vertical') {
            // For vertical resizing, targetElement is the bottom-panel
            const mainContent = document.getElementById('main-content');
            const editorContainer = document.getElementById('editor-container');
            const bottomPanel = document.getElementById('bottom-panel');

            const mainContentHeight = mainContent.offsetHeight;
            const editorTabsHeight = document.querySelector('.editor-tabs').offsetHeight; // Assuming editor tabs exist
            const panelHeaderHeight = document.querySelector('.panel-header').offsetHeight; // Assuming panel header exists

            let newBottomPanelHeight = this.startHeight - (e.clientY - this.startY);

            // Enforce minimum heights
            const minEditorHeight = 100;
            const minPanelHeight = 50;

            const calculatedEditorHeight = mainContentHeight - editorTabsHeight - newBottomPanelHeight - panelHeaderHeight - 5; // -5 for resizer height

            if (newBottomPanelHeight >= minPanelHeight && calculatedEditorHeight >= minEditorHeight) {
                root.style.setProperty('--bottom-panel-height', `${newBottomPanelHeight}px`);
                window.editorManager.layout(); // Trigger editor layout recalculation
            }
        }
    }

    stopDragging() {
        this.isDragging = false;
        document.removeEventListener('mousemove', this.doDrag.bind(this));
        document.removeEventListener('mouseup', this.stopDragging.bind(this));
        document.body.classList.remove('resizing');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize horizontal resizers for sidebars
    new Resizer('left-resizer', 'left-sidebar', 'horizontal');
    new Resizer('right-resizer', 'right-sidebar', 'horizontal');

    // Initialize vertical resizer for the bottom panel
    new Resizer('editor-resizer', 'bottom-panel', 'vertical');
});