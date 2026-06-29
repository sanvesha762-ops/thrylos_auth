document.addEventListener('DOMContentLoaded', () => {
    // --- Tab Switching Logic ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const resultContainer = document.getElementById('verification-result');

    function switchTab(targetId) {
        // Reset result container when switching tabs
        resultContainer.className = 'result-container hidden';
        resultContainer.innerHTML = '';

        // Update Buttons
        tabBtns.forEach(btn => {
            if (btn.dataset.target === targetId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update Panes
        tabPanes.forEach(pane => {
            if (pane.id === targetId) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.target);
        });
    });
});
