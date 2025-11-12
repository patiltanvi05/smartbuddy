// Open Add Transaction Page in a new tab
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

  // Handles form submit and sends transaction to opener (home) via postMessage
  (function () {
    const STORAGE_KEY = 'sbb_transactions_all';

    function uid() {
      return 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    }

    function saveToAll(tx) {
      try {
        const a = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        a.push(tx);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
      } catch (e) {
        /* ignore */
      }
    }

    const form = document.getElementById('txForm');
    const cancel = document.getElementById('cancelBtn');

    function toNumber(v) {
      const n = parseFloat(v);
      return Number.isFinite(n) ? Math.abs(n) : 0;
    }

    function buildTx() {
      return {
        type: document.getElementById('txType').value || 'expense',
        amount: toNumber(document.getElementById('txAmount').value),
        category: (document.getElementById('txCategory').value || '').trim(),
        date:
          document.getElementById('txDate').value ||
          new Date().toISOString().slice(0, 10),
        description: (document.getElementById('txDesc').value || '').trim(),
        createdAt: new Date().toISOString(),
      };
    }

    function saveLocal(tx) {
      try {
        const key = 'sbb_transactions';
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        list.push(tx);
        localStorage.setItem(key, JSON.stringify(list));
      } catch (e) {
        /* ignore */ }
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const tx = buildTx();
      if (!tx.id) tx.id = uid();
      if (!tx.amount || !tx.category) {
        alert('Please enter amount and category.');
        return;
      }

      // Always persist to central storage so other tabs/windows can pick up via storage event.
      try { saveToAll(tx); } catch (e) { /* ignore */ }

      // send to opener if available and same origin
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'sbb:transaction-created', payload: tx }, '*');
        } else {
          // fallback: save locally for home to pick up later
          // older fallback kept, but central storage already saved above
          saveLocal(tx);
        }
      } catch (err) {
        // fallback
        saveLocal(tx);
      }

      // UX: close the transaction tab/window if opened by the app
      try { window.close(); } catch (e) { /* some browsers block */ }

      // show small confirmation if still open
      if (!window.closed) {
        const btn = document.getElementById('createBtn');
        btn.textContent = 'Created';
        btn.disabled = true;
      }
    });

    cancel.addEventListener('click', () => {
      try { window.close(); } catch (e) { history.back(); }
    });

  })();