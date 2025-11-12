const addBtn = document.querySelector('.add');
  if (addBtn) {
    addBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.open('transaction.html', '_blank', 'noopener');
    });
  }

  // Open Settings Page in a new tab
  const settingsBtn = document.querySelector('.settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.open('setting.html', '_blank', 'noopener');
    });
  }

  // Toggle Dropdown Menu
  const menuIcon = document.querySelector('.menu');
  const dropdownMenu = document.getElementById('dropdownMenu');

  if (menuIcon && dropdownMenu) {
    menuIcon.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent immediate window click handler
      dropdownMenu.style.display =
        dropdownMenu.style.display === 'block' ? 'none' : 'block';
    });
  }

  // Close dropdown when clicking outside
  window.addEventListener('click', (e) => {
    if (menuIcon && dropdownMenu) {
      if (!menuIcon.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.style.display = 'none';
      }
    }
  });

  // Prevent clicks inside dropdown from closing it
  if (dropdownMenu) {
    dropdownMenu.addEventListener('click', (e) => e.stopPropagation());
  }
        (function () {
  const STORAGE_KEY = 'sbb_transactions_all';

  // Header wiring: logo, add, settings, menu + dropdown keyboard support
  (function wireHeader() {
    const logoImg = document.querySelector('.site-logo');
    const logoAnchor = document.querySelector('.header-left a');
    const addBtn = document.querySelector('.add') || document.querySelector('.icon.add');
    const settingsBtn = document.querySelector('.settings') || document.querySelector('.icon.settings');
    const menuIcon = document.querySelector('.menu') || document.querySelector('.icon.menu');
    const dropdownMenu = document.getElementById('dropdownMenu');

    // ensure clickable area for logo: both <a> and <img>
    const goHome = () => { window.location.href = 'home.html'; };
    if (logoAnchor) {
      logoAnchor.addEventListener('click', (e) => { /* allow normal navigation via href */ });
      logoAnchor.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') goHome(); });
    }
    if (logoImg) {
      // if anchor exists the click will follow href; attach handler as fallback
      logoImg.style.cursor = 'pointer';
      logoImg.addEventListener('click', () => { if (!logoAnchor) goHome(); });
      logoImg.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') goHome(); });
      // if image failed to load, ensure visible fallback area
      logoImg.addEventListener('error', () => { logoImg.style.opacity = '0.6'; logoImg.style.filter = 'grayscale(1)'; });
    }

    if (addBtn) {
      addBtn.setAttribute('role', 'button'); addBtn.tabIndex = 0;
      addBtn.addEventListener('click', () => window.open('transaction.html', '_blank', 'noopener'));
      addBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') addBtn.click(); });
    }

    if (settingsBtn) {
      settingsBtn.setAttribute('role', 'button'); settingsBtn.tabIndex = 0;
      settingsBtn.addEventListener('click', () => window.open('setting.html', '_blank', 'noopener'));
      settingsBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') settingsBtn.click(); });
    }

    // dropdown behavior
    if (dropdownMenu) {
      dropdownMenu.style.display = dropdownMenu.style.display || 'none';
      dropdownMenu.addEventListener('click', (e) => e.stopPropagation());
      // ensure Dashboard link exists
      if (!dropdownMenu.querySelector('a[href="./home.html"]')) {
        const a = document.createElement('a');
        a.href = './home.html';
        a.rel = 'noopener';
        a.textContent = 'Dashboard';
        dropdownMenu.insertBefore(a, dropdownMenu.firstChild);
      }
      // make dropdown links close menu on click
      dropdownMenu.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => { dropdownMenu.style.display = 'none'; });
      });
    }

    if (menuIcon) {
      menuIcon.setAttribute('role', 'button'); menuIcon.tabIndex = 0;
      menuIcon.style.cursor = 'pointer';
      menuIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!dropdownMenu) return;
        dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
      });
      menuIcon.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') menuIcon.click(); });
      // hide on outside click
      window.addEventListener('click', () => { if (dropdownMenu && dropdownMenu.style.display === 'block') dropdownMenu.style.display = 'none'; });
    }
  })();

  // --- Transactions logic (clean single source of truth) ---
  let transactions = [];
  let currentSort = 'newest';
  let filterType = 'all';
  let startDate = '';
  let endDate = '';

  function uid() { return 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 10000); }

  function loadStorage() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(raw)) { transactions = []; return; }
      // dedupe by id (last write wins)
      const map = new Map();
      for (const t of raw) {
        if (!t) continue;
        if (!t.id) t.id = uid();
        map.set(t.id, t);
      }
      transactions = Array.from(map.values());
    } catch (e) {
      transactions = [];
    }
  }

  function saveStorage() {
    try {
      const map = new Map();
      for (const t of transactions) {
        if (!t) continue;
        if (!t.id) t.id = uid();
        map.set(t.id, t);
      }
      const arr = Array.from(map.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      // notify same-window listeners
      window.dispatchEvent(new CustomEvent('sbb:transactions-updated'));
    } catch (e) {}
  }

  function ensureId(tx) { if (!tx.id) tx.id = uid(); return tx; }

  function addTransaction(tx) {
    if (!tx) return;
    ensureId(tx);
    const idx = transactions.findIndex(t => t.id === tx.id);
    if (idx !== -1) {
      transactions[idx] = Object.assign({}, transactions[idx], tx);
    } else {
      transactions.push(tx);
    }
    saveStorage();
    renderTable();
  }

  function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveStorage();
    renderTable();
  }

  function formatCurrency(n){ return '₹ ' + Number(n || 0).toLocaleString(); }
  function formatDateIso(d) {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString();
  }

  function applyFiltersAndSort(list) {
    let out = list.slice();
    if (filterType !== 'all') out = out.filter(t => (t.type || '').toLowerCase() === filterType);
    if (startDate) {
      const s = new Date(startDate);
      out = out.filter(t => new Date(t.date || t.createdAt) >= s);
    }
    if (endDate) {
      const e = new Date(endDate); e.setHours(23,59,59,999);
      out = out.filter(t => new Date(t.date || t.createdAt) <= e);
    }
    out.sort((a,b) => {
      const da = new Date(a.date || a.createdAt).getTime() || 0;
      const db = new Date(b.date || b.createdAt).getTime() || 0;
      return currentSort === 'newest' ? db - da : da - db;
    });
    return out;
  }

  function renderTable(){
    const tbody = document.getElementById('txBody');
    if (!tbody) return;
    const list = applyFiltersAndSort(transactions);
    tbody.innerHTML = '';
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="no-data">No transactions found.</td></tr>';
      return;
    }
    for (const t of list) {
      const tr = document.createElement('tr');

      const typeTd = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'type-badge ' + ((t.type==='income') ? 'type-income' : 'type-expense');
      badge.textContent = ((t.type||'').charAt(0).toUpperCase() + (t.type||'').slice(1)) || '-';
      typeTd.appendChild(badge);

      const catTd = document.createElement('td'); catTd.textContent = t.category || '-';
      const amtTd = document.createElement('td'); amtTd.textContent = formatCurrency(t.amount || 0);
      const dateTd = document.createElement('td'); dateTd.textContent = formatDateIso(t.date || t.createdAt);

      const actTd = document.createElement('td');
      const del = document.createElement('button');
      del.className = 'delete-btn';
      del.textContent = 'Delete';
      del.addEventListener('click', () => {
        if (!confirm('Delete this transaction?')) return;
        deleteTransaction(t.id);
        try { window.postMessage({ type:'sbb:transaction-deleted', payload:{id:t.id} }, '*'); } catch(e){}
      });
      actTd.appendChild(del);

      tr.appendChild(typeTd); tr.appendChild(catTd); tr.appendChild(amtTd); tr.appendChild(dateTd); tr.appendChild(actTd);
      tbody.appendChild(tr);
    }
  }

  // Controls wiring
  const sortBtn = document.getElementById('sortBtn');
  const sortPanel = document.getElementById('sortPanel');
  const filterBtn = document.getElementById('filterBtn');
  const filterPanel = document.getElementById('filterPanel');
  const sortSelect = document.getElementById('sortSelect');
  const applySort = document.getElementById('applySort');
  const typeFilter = document.getElementById('typeFilter');
  const applyFilter = document.getElementById('applyFilter');
  const startDateEl = document.getElementById('startDate');
  const endDateEl = document.getElementById('endDate');

  if (sortBtn && sortPanel) sortBtn.addEventListener('click', () => { sortPanel.classList.toggle('show'); if (filterPanel) filterPanel.classList.remove('show'); });
  if (filterBtn && filterPanel) filterBtn.addEventListener('click', () => { filterPanel.classList.toggle('show'); if (sortPanel) sortPanel.classList.remove('show'); });
  if (applySort) applySort.addEventListener('click', () => { currentSort = (sortSelect && sortSelect.value) || 'newest'; startDate = (startDateEl && startDateEl.value) || ''; endDate = (endDateEl && endDateEl.value) || ''; if (sortPanel) sortPanel.classList.remove('show'); renderTable(); });
  if (applyFilter) applyFilter.addEventListener('click', () => { filterType = (typeFilter && typeFilter.value) || 'all'; if (filterPanel) filterPanel.classList.remove('show'); renderTable(); });

  window.addEventListener('click', (e) => {
    if (sortBtn && sortPanel) { const withinSort = sortBtn.contains(e.target) || sortPanel.contains(e.target); if (!withinSort) sortPanel.classList.remove('show'); }
    if (filterBtn && filterPanel) { const withinFilter = filterBtn.contains(e.target) || filterPanel.contains(e.target); if (!withinFilter) filterPanel.classList.remove('show'); }
  });

  // Message listener: avoid duplicates by preferring storage as authoritative
  window.addEventListener('message', (ev) => {
    try {
      const d = ev.data;
      if (!d || !d.type) return;
      if (d.type === 'sbb:transaction-created' && d.payload) {
        const incoming = d.payload;
        // If storage already contains the same id, reload from storage (prevents duplicate)
        if (incoming && incoming.id) {
          loadStorage();
          const exists = transactions.find(t => t.id === incoming.id);
          if (exists) { renderTable(); return; }
        }
        addTransaction(incoming);
      } else if (d.type === 'sbb:transaction-deleted' && d.payload && d.payload.id) {
        deleteTransaction(d.payload.id);
      }
    } catch (e) {}
  });

  // Storage listener: reload authoritative list (fires in other tabs)
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      loadStorage();
      renderTable();
    }
  });

  // Migrate legacy temp key into main store without duplicates
  function migrateTempKey() {
    try {
      const tmp = JSON.parse(localStorage.getItem('sbb_transactions') || '[]');
      if (!Array.isArray(tmp) || !tmp.length) return;
      loadStorage();
      let changed = false;
      for (const tx of tmp) {
        if (!tx) continue;
        if (!tx.id) tx.id = uid();
        const exists = transactions.find(t => t.id === tx.id);
        if (!exists) { transactions.push(tx); changed = true; }
      }
      localStorage.removeItem('sbb_transactions');
      if (changed) saveStorage();
    } catch (e) {}
  }

  // Initial load
  loadStorage();
  migrateTempKey();
  renderTable();

  // Expose minimal API
  window.SBB_VIEW = { addTransaction, deleteTransaction };

})();
