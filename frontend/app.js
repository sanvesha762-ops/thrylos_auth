/**
 * THRYLOS VERIFY — Frontend Application
 * Real API integration replacing all mock logic.
 */

const API_BASE = 'http://localhost:3001/api';

// ── Auth State ────────────────────────────────────────────────
const Auth = {
  _user: null,
  _token: null,

  init() {
    this._token = localStorage.getItem('thrylos_token');
    const raw = localStorage.getItem('thrylos_user');
    if (raw) {
      try { this._user = JSON.parse(raw); } catch { this.logout(); }
    }
  },

  get token()   { return this._token; },
  get user()    { return this._user; },
  get isLoggedIn() { return !!this._token && !!this._user; },

  save(token, user) {
    this._token = token;
    this._user  = user;
    localStorage.setItem('thrylos_token', token);
    localStorage.setItem('thrylos_user', JSON.stringify(user));
  },

  logout() {
    this._token = null;
    this._user  = null;
    localStorage.removeItem('thrylos_token');
    localStorage.removeItem('thrylos_user');
  }
};

// ── API Helper ────────────────────────────────────────────────
async function apiRequest(method, path, body = null, { requiresAuth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (requiresAuth && Auth.token) {
    headers['Authorization'] = `Bearer ${Auth.token}`;
  }

  const opts = { method, headers };
  if (body && !(body instanceof FormData)) {
    opts.body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  } else if (body instanceof FormData) {
    delete headers['Content-Type']; // let browser set multipart boundary
    opts.body = body;
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json().catch(() => ({ success: false, message: 'Invalid server response.' }));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      return {
        ok: false,
        status: 0,
        data: { success: false, message: 'Cannot connect to server. Is the backend running on port 3001?' }
      };
    }
    return { ok: false, status: 500, data: { success: false, message: err.message } };
  }
}

// ── Toast Notifications ───────────────────────────────────────
const Toast = {
  container: null,

  init() { this.container = document.getElementById('toast-container'); },

  show(message, type = 'info', duration = 4000) {
    const icons = { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'info' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i data-lucide="${icons[type] || 'info'}" style="width:16px;height:16px;flex-shrink:0"></i><span>${message}</span>`;
    this.container.appendChild(toast);
    lucide.createIcons({ nodes: [toast] });

    setTimeout(() => {
      toast.style.animation = 'toast-out 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

// ── Navbar Auth UI ────────────────────────────────────────────
function updateNavUI() {
  const loggedOut = document.getElementById('nav-logged-out');
  const loggedIn  = document.getElementById('nav-logged-in');
  const dashboard = document.getElementById('nav-dashboard-link');
  const userInitial = document.getElementById('user-initial');
  const userName = document.getElementById('user-name-nav');

  if (Auth.isLoggedIn) {
    loggedOut.classList.add('hidden');
    loggedIn.classList.remove('hidden');
    userInitial.textContent = (Auth.user.name || 'U')[0].toUpperCase();
    userName.textContent = Auth.user.name.split(' ')[0];
    if (dashboard && ['admin', 'superadmin'].includes(Auth.user?.role)) {
      dashboard.style.display = 'inline-flex';
    }
  } else {
    loggedOut.classList.remove('hidden');
    loggedIn.classList.add('hidden');
    if (dashboard) dashboard.style.display = 'none';
  }
}

// ── Auth Modal ─────────────────────────────────────────────────
function initAuthModal() {
  const modal     = document.getElementById('auth-modal');
  const openBtn   = document.getElementById('nav-login-btn');
  const closeBtn  = document.getElementById('close-modal');
  const tabBtns   = document.querySelectorAll('.modal-tab');
  const logoutBtn = document.getElementById('nav-logout-btn');

  const openModal = () => {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('login-email')?.focus();
  };
  const closeModal = () => {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  };

  openBtn?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  // Keyboard close
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // Modal tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.modalTab;
      document.querySelectorAll('.modal-pane').forEach(p => p.classList.remove('active'));
      document.getElementById(`modal-${target}`)?.classList.add('active');
      document.getElementById(`login-error`)?.classList.add('hidden');
      document.getElementById(`register-error`)?.classList.add('hidden');
    });
  });

  // Logout
  logoutBtn?.addEventListener('click', () => {
    Auth.logout();
    updateNavUI();
    Toast.show('Signed out successfully.', 'info');
  });

  // Password visibility toggle
  document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.input-wrap').querySelector('input');
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.querySelector('svg').setAttribute('data-lucide', isHidden ? 'eye-off' : 'eye');
      lucide.createIcons({ nodes: [btn] });
    });
  });
}

// ── Login Form ─────────────────────────────────────────────────
function initLoginForm() {
  const form    = document.getElementById('login-form');
  const errBox  = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit');

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    errBox.classList.add('hidden');

    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      errBox.textContent = 'Please fill in all fields.';
      errBox.classList.remove('hidden');
      return;
    }

    setLoading(submitBtn, true);
    const { ok, data } = await apiRequest('POST', '/auth/login', { email, password });
    setLoading(submitBtn, false);

    if (!ok || !data.success) {
      errBox.textContent = data.message;
      errBox.classList.remove('hidden');
      return;
    }

    Auth.save(data.token, data.user);
    updateNavUI();
    document.getElementById('auth-modal').classList.add('hidden');
    document.body.style.overflow = '';
    Toast.show(`Welcome back, ${data.user.name.split(' ')[0]}!`, 'success');
    form.reset();
  });
}

// ── Register Form ─────────────────────────────────────────────
function initRegisterForm() {
  const form    = document.getElementById('register-form');
  const errBox  = document.getElementById('register-error');
  const submitBtn = document.getElementById('register-submit');

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    errBox.classList.add('hidden');

    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const org      = document.getElementById('reg-org').value.trim();
    const password = document.getElementById('reg-password').value;

    if (!name || !email || !password) {
      errBox.textContent = 'Please fill in all required fields.';
      errBox.classList.remove('hidden');
      return;
    }
    if (password.length < 8) {
      errBox.textContent = 'Password must be at least 8 characters.';
      errBox.classList.remove('hidden');
      return;
    }

    setLoading(submitBtn, true);
    const { ok, data } = await apiRequest('POST', '/auth/register', { name, email, organization: org, password });
    setLoading(submitBtn, false);

    if (!ok || !data.success) {
      errBox.textContent = data.message;
      errBox.classList.remove('hidden');
      return;
    }

    Auth.save(data.token, data.user);
    updateNavUI();
    document.getElementById('auth-modal').classList.add('hidden');
    document.body.style.overflow = '';
    Toast.show(`Account created! Welcome, ${data.user.name.split(' ')[0]}.`, 'success');
    form.reset();
  });
}

// ── Verification Tabs ─────────────────────────────────────────
function initVerifyTabs() {
  const tabs  = document.querySelectorAll('.vtab');
  const panes = {
    'tab-manual': document.getElementById('tab-manual'),
    'tab-upload': document.getElementById('tab-upload'),
    'tab-scan':   document.getElementById('tab-scan'),
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      Object.values(panes).forEach(p => { if (p) p.style.display = 'none'; });
      const target = panes[tab.dataset.target];
      if (target) target.style.display = 'block';

      // Clear result
      const result = document.getElementById('verify-result');
      if (result) result.classList.add('hidden');
    });
  });
}

// ── Manual Verification ───────────────────────────────────────
function initManualVerify() {
  const input    = document.getElementById('verification-id');
  const btn      = document.getElementById('verify-manual-btn');
  const demoLinks = document.querySelectorAll('.demo-link');

  // Auto-format input: uppercase + insert hyphen
  input?.addEventListener('input', e => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (val.length > 3 && !val.startsWith('THR-')) {
      val = 'THR-' + val.replace('THR', '').replace('-', '');
    }
    e.target.value = val;
  });

  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter') runManualVerify();
  });

  btn?.addEventListener('click', runManualVerify);

  // Demo quick-fill
  demoLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (input) input.value = link.dataset.id;
      runManualVerify();
    });
  });
}

async function runManualVerify() {
  const input  = document.getElementById('verification-id');
  const result = document.getElementById('verify-result');
  const id     = input?.value.trim().toUpperCase();

  if (!id) {
    Toast.show('Please enter a Verification ID.', 'warning');
    return;
  }

  showLoadingResult(result, id);

  const { ok, data } = await apiRequest('GET', `/verify/${encodeURIComponent(id)}`);
  renderResult(result, data);
}

// ── Upload Verification ───────────────────────────────────────
function initUploadVerify() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const verifyBtn = document.getElementById('verify-upload-btn');
  let selectedFile = null;

  if (!dropZone) return;

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });

  fileInput?.addEventListener('change', e => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });

  function handleFile(file) {
    selectedFile = file;
    dropZone.innerHTML = `
      <div class="drop-zone-inner">
        <div class="drop-icon-wrap">
          <i data-lucide="file-check" style="width:24px;height:24px;color:var(--blue)"></i>
        </div>
        <p class="drop-title">${escapeHtml(file.name)}</p>
        <p class="drop-meta">${(file.size / 1024).toFixed(1)} KB · Click to change</p>
      </div>
    `;
    lucide.createIcons({ nodes: [dropZone] });
    if (verifyBtn) verifyBtn.disabled = false;
  }

  verifyBtn?.addEventListener('click', async () => {
    if (!selectedFile) return;
    const result = document.getElementById('verify-result');
    showLoadingResult(result, 'uploaded document');

    const form = new FormData();
    form.append('document', selectedFile);

    const { ok, data } = await apiRequest('POST', '/verify/upload', form);
    renderResult(result, data);
  });
}

// ── QR Scan ───────────────────────────────────────────────────
function initQRScan() {
  const startBtn = document.getElementById('scan-start-btn');
  const video    = document.getElementById('qr-video');
  let stream = null;

  startBtn?.addEventListener('click', async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = stream;
      video.style.display = 'block';
      startBtn.disabled = true;
      startBtn.innerHTML = `<i data-lucide="loader-2" style="animation:spin 0.8s linear infinite"></i> <span>Scanning...</span>`;
      lucide.createIcons({ nodes: [startBtn] });
      Toast.show('Camera started. Point at a QR code.', 'info');

      // Fallback: prompt manual entry after 10s
      setTimeout(() => {
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
          video.style.display = 'none';
          startBtn.disabled = false;
          startBtn.innerHTML = `<i data-lucide="camera"></i> <span>Restart Camera</span>`;
          lucide.createIcons({ nodes: [startBtn] });
          Toast.show('QR scan timed out. Please use manual entry.', 'warning');
        }
      }, 15000);
    } catch (err) {
      Toast.show('Camera access denied. Please use manual entry instead.', 'error');
    }
  });
}

// ── Result Rendering ──────────────────────────────────────────
function showLoadingResult(container, label) {
  container.classList.remove('hidden');
  container.innerHTML = `
    <div class="result-inner loading">
      <div class="result-loading">
        <div class="pulse-ring"></div>
        Verifying <strong>${escapeHtml(label)}</strong> against live database...
      </div>
    </div>
  `;
}

function renderResult(container, data) {
  const result = data.result || (data.success ? 'verified' : 'not_found');
  const doc    = data.document;

  const icons = {
    verified:  'check-circle',
    not_found: 'search-x',
    revoked:   'shield-off',
    expired:   'clock',
    error:     'alert-triangle',
  };
  const titles = {
    verified:  'Document Verified',
    not_found: 'Document Not Found',
    revoked:   'Document Revoked',
    expired:   'Document Expired',
    error:     'Verification Error',
  };

  let detailsHTML = '';
  if (doc) {
    const statusBadge = `<span class="status-badge ${doc.status}">${doc.status}</span>`;
    detailsHTML = `
      <div class="doc-details">
        <div class="doc-field">
          <span class="label">Verification ID</span>
          <span class="value mono">${escapeHtml(doc.verificationId || '')}</span>
        </div>
        <div class="doc-field">
          <span class="label">Status</span>
          <span class="value">${statusBadge}</span>
        </div>
        <div class="doc-field" style="grid-column:1/-1">
          <span class="label">Document Title</span>
          <span class="value">${escapeHtml(doc.title || '')}</span>
        </div>
        <div class="doc-field">
          <span class="label">Issued To</span>
          <span class="value">${escapeHtml(doc.issuedTo || '')}</span>
        </div>
        <div class="doc-field">
          <span class="label">Organization</span>
          <span class="value">${escapeHtml(doc.issuedByOrg || '—')}</span>
        </div>
        <div class="doc-field">
          <span class="label">Issue Date</span>
          <span class="value">${formatDate(doc.issueDate)}</span>
        </div>
        <div class="doc-field">
          <span class="label">Expiry Date</span>
          <span class="value">${doc.expiryDate ? formatDate(doc.expiryDate) : 'No expiry'}</span>
        </div>
        ${doc.metadata && Object.keys(doc.metadata).length ? `
        <div class="doc-field" style="grid-column:1/-1">
          <span class="label">Additional Details</span>
          <span class="value">${Object.entries(doc.metadata).map(([k,v]) => `<span style="display:inline-block;margin-right:0.75rem"><strong>${k}:</strong> ${v}</span>`).join('')}</span>
        </div>` : ''}
      </div>
    `;
  }

  container.classList.remove('hidden');
  container.innerHTML = `
    <div class="result-inner ${result}">
      <div class="result-header">
        <div class="result-icon ${result}">
          <i data-lucide="${icons[result] || 'info'}"></i>
        </div>
        <div>
          <div class="result-title">${titles[result] || 'Unknown Result'}</div>
          <div class="result-subtitle">${escapeHtml(data.message || '')}</div>
        </div>
      </div>
      ${detailsHTML}
    </div>
  `;
  lucide.createIcons({ nodes: [container] });
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Utilities ─────────────────────────────────────────────────
function setLoading(btn, loading) {
  const text    = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.btn-spinner');
  btn.disabled  = loading;
  if (text)    text.style.opacity    = loading ? '0' : '1';
  if (spinner) spinner.classList.toggle('hidden', !loading);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateStr));
  } catch { return dateStr; }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
  Toast.init();
  updateNavUI();
  initAuthModal();
  initLoginForm();
  initRegisterForm();
  initVerifyTabs();
  initManualVerify();
  initUploadVerify();
  initQRScan();

  // Lucide icons already created in HTML, re-run after dynamic content
  lucide.createIcons();
});
