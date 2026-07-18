/**
 * THRYLOS VERIFY — Admin Dashboard Logic
 * Requires app.js to be loaded first (Auth, apiRequest, Toast, etc.)
 */

let currentPage = 1;
let currentStatus = '';
let currentSearch = '';

// ── Auth Gate ─────────────────────────────────────────────────
function checkDashboardAuth() {
  if (!Auth.isLoggedIn) {
    document.getElementById('auth-gate').classList.remove('hidden');
    document.querySelector('.sidebar')?.remove();
    document.getElementById('dash-content')?.remove();
    return false;
  }

  const role = Auth.user?.role;
  if (!['admin', 'superadmin'].includes(role)) {
    document.getElementById('auth-gate').classList.remove('hidden');
    document.querySelector('.auth-gate p').textContent =
      'Your account does not have admin privileges. Contact your administrator.';
    document.querySelector('.sidebar')?.remove();
    document.getElementById('dash-content')?.remove();
    return false;
  }

  // Populate user info
  const name = Auth.user.name || 'Admin';
  document.getElementById('dash-avatar').textContent = name[0].toUpperCase();
  document.getElementById('dash-user-name').textContent = name;
  document.getElementById('dash-user-role').textContent = Auth.user.role;
  return true;
}

// ── Section Switching ─────────────────────────────────────────
function switchSection(target) {
  document.querySelectorAll('.dash-section').forEach(s => {
    s.style.display = s.id === `section-${target}` ? 'block' : 'none';
    s.classList.toggle('active', s.id === `section-${target}`);
  });
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.section === target);
  });

  if (target === 'documents') loadDocuments();
  if (target === 'overview') loadOverview();
}

// ── Overview ──────────────────────────────────────────────────
async function loadOverview() {
  const { ok, data } = await apiRequest('GET', '/documents/stats', null, { requiresAuth: true });

  if (ok && data.success) {
    const s = data.stats;
    animateNumber('stat-total',         s.documents.total_count);
    animateNumber('stat-valid',         s.documents.valid_count);
    animateNumber('stat-revoked',       s.documents.revoked_count);
    animateNumber('stat-verifications', s.verifications.total_verifications);
  } else {
    // Show placeholder if backend not connected
    ['stat-total', 'stat-valid', 'stat-revoked', 'stat-verifications'].forEach(id => {
      document.getElementById(id).textContent = '—';
    });
  }

  // Load recent docs preview
  const { ok: ok2, data: data2 } = await apiRequest('GET', '/documents?limit=5', null, { requiresAuth: true });
  const container = document.getElementById('overview-docs-list');
  if (ok2 && data2.success && data2.data.length > 0) {
    container.innerHTML = buildTable(data2.data, true);
    lucide.createIcons({ nodes: [container] });
    bindRevokeButtons(container);
  } else {
    container.innerHTML = `<p class="empty-table">${data2?.message || 'No documents found or backend not connected.'}</p>`;
  }
}

// ── Documents List ────────────────────────────────────────────
async function loadDocuments() {
  const container = document.getElementById('docs-table-container');
  container.innerHTML = `<div class="loading-row"><div class="pulse-ring"></div> Loading documents...</div>`;

  const params = new URLSearchParams({ page: currentPage, limit: 10 });
  if (currentStatus) params.append('status', currentStatus);
  if (currentSearch) params.append('search', currentSearch);

  const { ok, data } = await apiRequest('GET', `/documents?${params}`, null, { requiresAuth: true });

  if (!ok || !data.success) {
    container.innerHTML = `<p class="empty-table" style="color:var(--red)">${data?.message || 'Failed to load documents. Is the backend running?'}</p>`;
    return;
  }

  if (!data.data.length) {
    container.innerHTML = `<p class="empty-table">No documents match your filters.</p>`;
    return;
  }

  container.innerHTML = buildTable(data.data, false);
  lucide.createIcons({ nodes: [container] });
  bindRevokeButtons(container);

  buildPagination(data.pagination);
}

function buildTable(docs, compact) {
  const rows = docs.map(doc => {
    const isRevoked = doc.status === 'revoked';
    return `
      <tr>
        <td class="vid">${escapeHtml(doc.verification_id)}</td>
        <td class="doc-title">
          ${escapeHtml(doc.title)}
          <small>${escapeHtml(doc.document_type)} · ${escapeHtml(doc.issued_to_name)}</small>
        </td>
        ${!compact ? `<td>${escapeHtml(doc.organization || '—')}</td>` : ''}
        <td>${escapeHtml(doc.issue_date ? new Date(doc.issue_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—')}</td>
        <td><span class="status-badge ${doc.status}">${doc.status}</span></td>
        <td>
          <div class="table-actions">
            <button class="action-btn revoke" data-id="${escapeHtml(doc.verification_id)}" ${isRevoked ? 'disabled' : ''}>
              <i data-lucide="shield-off"></i> ${isRevoked ? 'Revoked' : 'Revoke'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <table class="docs-table">
      <thead>
        <tr>
          <th>Verify ID</th>
          <th>Document</th>
          ${!compact ? '<th>Organization</th>' : ''}
          <th>Issue Date</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function bindRevokeButtons(container) {
  container.querySelectorAll('.action-btn.revoke').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!confirm(`Revoke document ${id}? This action cannot be undone.`)) return;

      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" style="width:12px;height:12px;animation:spin 0.8s linear infinite"></i> Revoking...`;
      lucide.createIcons({ nodes: [btn] });

      const { ok, data } = await apiRequest('PATCH', `/documents/${id}/revoke`, { reason: 'Revoked via admin dashboard' }, { requiresAuth: true });

      if (ok && data.success) {
        Toast.show(`Document ${id} has been revoked.`, 'success');
        loadDocuments();
        loadOverview();
      } else {
        Toast.show(data.message || 'Failed to revoke document.', 'error');
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="shield-off"></i> Revoke`;
        lucide.createIcons({ nodes: [btn] });
      }
    });
  });
}

function buildPagination({ page, pages }) {
  const container = document.getElementById('docs-pagination');
  if (pages <= 1) { container.classList.add('hidden'); return; }

  container.classList.remove('hidden');
  let html = `
    <button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="goPage(${page - 1})">
      <i data-lucide="chevron-left" style="width:14px;height:14px"></i>
    </button>
  `;
  for (let i = 1; i <= pages; i++) {
    html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
  }
  html += `
    <button class="page-btn" ${page >= pages ? 'disabled' : ''} onclick="goPage(${page + 1})">
      <i data-lucide="chevron-right" style="width:14px;height:14px"></i>
    </button>
  `;
  container.innerHTML = html;
  lucide.createIcons({ nodes: [container] });
}

function goPage(p) {
  currentPage = p;
  loadDocuments();
}

// ── Issue Document Modal ──────────────────────────────────────
function initIssueModal() {
  const modal    = document.getElementById('issue-modal');
  const openBtns = [document.getElementById('open-issue-btn'), document.getElementById('open-issue-btn-2')];
  const closeBtn = document.getElementById('close-issue-modal');
  const cancelBtn = document.getElementById('cancel-issue');
  const form     = document.getElementById('issue-form');
  const errBox   = document.getElementById('issue-error');
  const submitBtn = document.getElementById('issue-submit');

  // Set today's date default
  const dateInput = document.getElementById('f-issue-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  const openModal  = () => { modal.classList.remove('hidden'); document.body.style.overflow = 'hidden'; };
  const closeModal = () => { modal.classList.add('hidden');    document.body.style.overflow = ''; form.reset(); errBox.classList.add('hidden'); };

  openBtns.forEach(btn => btn?.addEventListener('click', openModal));
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    errBox.classList.add('hidden');

    const title      = document.getElementById('f-title').value.trim();
    const type       = document.getElementById('f-type').value;
    const name       = document.getElementById('f-name').value.trim();
    const email      = document.getElementById('f-email').value.trim();
    const org        = document.getElementById('f-org').value.trim();
    const issueDate  = document.getElementById('f-issue-date').value;
    const expiryDate = document.getElementById('f-expiry').value;

    if (!title || !type || !name || !issueDate) {
      errBox.textContent = 'Please fill in all required fields.';
      errBox.classList.remove('hidden');
      return;
    }

    setLoading(submitBtn, true);
    const { ok, data } = await apiRequest('POST', '/documents', {
      title, documentType: type, issuedToName: name,
      issuedToEmail: email || undefined,
      organization: org || undefined,
      issueDate, expiryDate: expiryDate || undefined
    }, { requiresAuth: true });
    setLoading(submitBtn, false);

    if (!ok || !data.success) {
      errBox.textContent = data.message;
      errBox.classList.remove('hidden');
      return;
    }

    Toast.show(`Document issued: ${data.document.verification_id}`, 'success');
    closeModal();
    loadDocuments();
    loadOverview();
  });
}

// ── Utilities ─────────────────────────────────────────────────
function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const num = parseInt(target) || 0;
  let current = 0;
  const step  = Math.ceil(num / 30);
  const timer = setInterval(() => {
    current = Math.min(current + step, num);
    el.textContent = current.toLocaleString('en-IN');
    if (current >= num) clearInterval(timer);
  }, 30);
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Auth.init() and Toast.init() called by app.js

  if (!checkDashboardAuth()) return;

  lucide.createIcons();

  // Sidebar nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      switchSection(item.dataset.section);
    });
  });

  // Logout
  document.getElementById('dash-logout')?.addEventListener('click', () => {
    Auth.logout();
    window.location.href = 'index.html';
  });

  // Document search
  document.getElementById('doc-search-btn')?.addEventListener('click', () => {
    currentPage   = 1;
    currentSearch = document.getElementById('doc-search')?.value.trim() || '';
    currentStatus = document.getElementById('doc-status-filter')?.value || '';
    loadDocuments();
  });

  document.getElementById('doc-search')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('doc-search-btn')?.click();
  });

  initIssueModal();
  loadOverview();
});
