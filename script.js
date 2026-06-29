document.addEventListener('DOMContentLoaded', () => {
    // --- Tab Switching Logic ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const resultContainer = document.getElementById('verification-result');

    function switchTab(targetId) {
        resultContainer.className = 'result-container hidden';
        resultContainer.innerHTML = '';

        tabBtns.forEach(btn => {
            if (btn.dataset.target === targetId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

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

    // --- Mock Verification Functionality ---

    function showVerificationResult(type, success, message) {
        resultContainer.className = 'result-container';
        
        // Show loading first
        resultContainer.classList.add('loading');
        resultContainer.innerHTML = `<i data-lucide="loader" class="animate-spin" style="margin-right: 0.5rem; vertical-align: middle;"></i> Verifying ${type}...`;
        lucide.createIcons();

        // Simulate network request
        setTimeout(() => {
            resultContainer.classList.remove('loading');
            if (success) {
                resultContainer.classList.add('success');
                resultContainer.innerHTML = `<i data-lucide="check-circle" style="margin-right: 0.5rem; vertical-align: middle;"></i> <strong>Success:</strong> ${message}`;
            } else {
                resultContainer.classList.add('error');
                resultContainer.innerHTML = `<i data-lucide="x-circle" style="margin-right: 0.5rem; vertical-align: middle;"></i> <strong>Error:</strong> ${message}`;
            }
            lucide.createIcons();
        }, 1500);
    }

    // 1. Scan QR Code
    const scanBtn = document.querySelector('.scan-btn');
    scanBtn.addEventListener('click', () => {
        showVerificationResult('QR Code', true, 'Document verified successfully. Authentic THRYLOS document.');
    });
});
