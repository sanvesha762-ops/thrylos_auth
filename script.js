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
        resultContainer.classList.add('loading');
        resultContainer.innerHTML = `<i data-lucide="loader" class="animate-spin" style="margin-right: 0.5rem; vertical-align: middle;"></i> Verifying ${type}...`;
        lucide.createIcons();

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

    // 2. Upload Document
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const verifyUploadBtn = document.querySelector('.verify-upload-btn');
    let selectedFile = null;

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    function handleFileSelect(file) {
        selectedFile = file;
        dropZone.innerHTML = `
            <i data-lucide="file-check" class="upload-icon" style="color: var(--primary-blue)"></i>
            <p style="color: var(--text-primary)">${file.name}</p>
            <p style="font-size: 0.75rem">Click to change file</p>
        `;
        lucide.createIcons();
        verifyUploadBtn.disabled = false;
    }

    verifyUploadBtn.addEventListener('click', () => {
        if (selectedFile) {
            showVerificationResult('Document', true, 'Document signature matches official records.');
        }
    });
});
