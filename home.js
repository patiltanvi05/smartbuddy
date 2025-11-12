(function () {
  const STORAGE_KEY = 'sbb_transactions_all';

  /* Header actions */
  const addBtn = document.querySelector('.add');
  if (addBtn) {
    addBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.open('transaction.html', '_blank', 'noopener');
    });
  }

  const settingsBtn = document.querySelector('.settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.open('setting.html', '_blank', 'noopener');
    });
  }

  const menuIcon = document.querySelector('.menu');
  const dropdownMenu = document.getElementById('dropdownMenu');
  if (menuIcon && dropdownMenu) {
    menuIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.style.display =
        dropdownMenu.style.display === 'block' ? 'none' : 'block';
    });
    dropdownMenu.addEventListener('click', (e) => e.stopPropagation());
  }
  window.addEventListener('click', (e) => {
    if (menuIcon && dropdownMenu) {
      if (!menuIcon.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.style.display = 'none';
      }
    }
  });

  /* small helpers */
  function parseCurrency(text) {
    if (!text) return NaN;
    const n = parseFloat(String(text).replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : NaN;
  }
  function formatCurrency(n) {
    if (!isFinite(n)) return '₹ 0';
    return '₹ ' + Number(n).toLocaleString();
  }
  function sumArray(arr) {
    return (arr || []).reduce((s, v) => s + Number(v || 0), 0);
  }
  function uid() {
    return 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
  }

  /* Card DOM helper */
  function setCardValue(selector, value) {
    // Accept '.card.total-income .card-value' or '.card.total-income'
    let el = document.querySelector(selector);
    if (!el) {
      // try parent then create .card-value
      const parentSel = selector.split(' ')[0];
      const parent = document.querySelector(parentSel);
      if (!parent) return;
      let child = parent.querySelector('.card-value');
      if (!child) {
        child = document.createElement('div');
        child.className = 'card-value';
        parent.appendChild(child);
      }
      child.textContent = formatCurrency(value);
    } else {
      el.textContent = formatCurrency(value);
    }
  }

  /* Chart setup */
  // fallback if canvas not present
  const canvas = document.getElementById('expenseChart');
  let expenseChart = null;

  const monthlyLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weeklyLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function createChart() {
    if (!canvas) return null;
    // lazy load Chart.js if not present
    if (typeof Chart === 'undefined') {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      s.async = true;
      document.head.appendChild(s);
      s.onload = () => buildChartInstance();
    } else {
      buildChartInstance();
    }

    function buildChartInstance() {
      const ctx = canvas.getContext('2d');
      expenseChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: monthlyLabels.slice(),
          datasets: [{
            label: 'Monthly expense',
            data: monthlyLabels.map(() => 0),
            backgroundColor: '#10b981',
            borderRadius: 6,
            barPercentage: 0.65,
            categoryPercentage: 0.8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `₹ ${ctx.formattedValue}`
              }
            }
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              beginAtZero: true,
              ticks: { callback: v => `₹ ${v}` },
              grid: { color: 'rgba(15,23,42,0.04)' }
            }
          }
        }
      });
    }
  }

  createChart();

  /* Status message element */
  function updateStatusMessage() {
    const msgEl = document.getElementById('financeMessage');
    if (!msgEl) return;

    // Read values directly from the dashboard cards so the message matches those amounts exactly
    const incomeText = document.querySelector('.card.total-income .card-value')?.textContent || '';
    const expenseText = document.querySelector('.card.total-expense .card-value')?.textContent || '';

    const income = Number.isFinite(parseCurrency(incomeText)) ? parseCurrency(incomeText) : 0;
    const expense = Number.isFinite(parseCurrency(expenseText)) ? parseCurrency(expenseText) : 0;
    const saving = income - expense;

    const positive = saving >= expense;

    const title = positive ? "You're doing a great saver!" : 'Time to control your expenses!';
    const text = positive
      ? "Good job — you're saving more or equal to your expenses."
      : "Expenses are higher than savings — consider reducing spend.";

    msgEl.classList.remove('neutral', 'positive', 'negative');
    msgEl.classList.add(positive ? 'positive' : 'negative');

    const titleEl = msgEl.querySelector('.status-title');
    const textEl = msgEl.querySelector('.status-text');
    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;

    let details = msgEl.querySelector('.details');
    if (!details) {
      details = document.createElement('div');
      details.className = 'details';
      msgEl.appendChild(details);
    }
    details.innerHTML =
      `<div>Income: ${formatCurrency(income)}</div>` +
      `<div>Expense: ${formatCurrency(expense)}</div>` +
      `<div>Saving: ${formatCurrency(saving)}</div>`;
  }

  /* Update chart mode (monthly/weekly) and rebuild from storage */
  const btnMonthly = document.getElementById('btnMonthly');
  const btnWeekly = document.getElementById('btnWeekly');

  function setActiveButton(mode) {
    if (btnMonthly) btnMonthly.classList.remove('active', 'monthly', 'weekly');
    if (btnWeekly) btnWeekly.classList.remove('active', 'monthly', 'weekly');
    if (mode === 'monthly') {
      if (btnMonthly) { btnMonthly.classList.add('active', 'monthly'); btnMonthly.setAttribute('aria-selected', 'true'); }
      if (btnWeekly) btnWeekly.setAttribute('aria-selected', 'false');
    } else {
      if (btnWeekly) { btnWeekly.classList.add('active', 'weekly'); btnWeekly.setAttribute('aria-selected', 'true'); }
      if (btnMonthly) btnMonthly.setAttribute('aria-selected', 'false');
    }
  }

  function updateChartMode(mode) {
    if (!expenseChart) return;
    if (mode === 'monthly') {
      expenseChart.data.labels = monthlyLabels.slice();
      expenseChart.data.datasets[0].label = 'Monthly expense';
      expenseChart.data.datasets[0].backgroundColor = '#10b981';
    } else {
      expenseChart.data.labels = weeklyLabels.slice();
      expenseChart.data.datasets[0].label = 'Weekly expense';
      expenseChart.data.datasets[0].backgroundColor = '#059669';
    }
    // zero dataset to start fresh
    expenseChart.data.datasets[0].data = expenseChart.data.labels.map(() => 0);
    expenseChart.update();
    setActiveButton(mode);
    // repopulate from storage
    rebuildFromStorage();
  }

  if (btnMonthly) btnMonthly.addEventListener('click', () => updateChartMode('monthly'));
  if (btnWeekly) btnWeekly.addEventListener('click', () => updateChartMode('weekly'));

  /* Storage/rebuild logic */
  function loadAllTransactions() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function saveToAll(tx) {
    try {
      const a = loadAllTransactions();
      a.push(tx);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
      window.dispatchEvent(new CustomEvent('sbb:transactions-updated'));
    } catch (e) {}
  }

  // Apply a full rebuild: recalc totals and chart from source-of-truth storage
  function rebuildFromStorage() {
    const all = loadAllTransactions();
    // totals
    let incomeTotal = 0;
    let expenseTotal = 0;

    // reset chart array
    if (expenseChart) {
      expenseChart.data.datasets[0].data = expenseChart.data.labels.map(() => 0);
    }

    all.forEach((tx) => {
      const amt = Number(tx.amount || 0);
      if (!amt) return;
      if ((tx.type || '').toLowerCase() === 'income') {
        incomeTotal += amt;
      } else {
        expenseTotal += amt;
        // distribute to chart buckets
        if (expenseChart && expenseChart.data && expenseChart.data.labels) {
          const labels = expenseChart.data.labels;
          const dt = new Date(tx.date || tx.createdAt);
          if (!isNaN(dt)) {
            let idx = -1;
            // detect monthly labels by matching first label to month names
            if (labels.length === 12) {
              idx = dt.getMonth(); // 0-11
            } else if (labels.length === 7) {
              // map JS dow (0 Sun .. 6 Sat) to Mon(0)..Sun(6)
              const dow = dt.getDay(); // 0-6
              idx = (dow + 6) % 7;
            }
            if (idx >= 0 && idx < labels.length) {
              expenseChart.data.datasets[0].data[idx] = Number(expenseChart.data.datasets[0].data[idx] || 0) + amt;
            }
          }
        }
      }
    });

    // update cards
    setCardValue('.card.total-income .card-value', incomeTotal);
    setCardValue('.card.total-expense .card-value', expenseTotal);
    setCardValue('.card.remaining-balance .card-value', Math.max(0, incomeTotal - expenseTotal));

    if (expenseChart) expenseChart.update();
    updateStatusMessage();
  }

  /* Apply single transaction to UI and optionally persist */
  function applyTransactionToUI(tx) {
    if (!tx) return;
    // Persist to storage if no id or not present
    if (!tx.id) tx.id = uid();
    // ensure it's saved in central store (avoid duplicates by id)
    try {
      const all = loadAllTransactions();
      const exists = all.find(i => i.id === tx.id);
      if (!exists) {
        all.push(tx);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        window.dispatchEvent(new CustomEvent('sbb:transactions-updated'));
      }
    } catch (e) {}

    // After persisting, rebuild from storage to keep consistency
    rebuildFromStorage();
  }

  function addTransaction(tx) {
    if (!tx) return;
    if (!tx.id) tx.id = uid();
    saveToAll(tx);
    applyTransactionToUI(tx); // will rebuild
  }

  /* message & storage listeners */
  window.addEventListener('message', (ev) => {
    try {
      const data = ev.data;
      if (!data || !data.type) return;
      if (data.type === 'sbb:transaction-created' && data.payload) {
        addTransaction(data.payload);
      } else if (data.type === 'sbb:transaction-deleted' && data.payload && data.payload.id) {
        // remove from storage and rebuild
        try {
          const all = loadAllTransactions().filter(t => t.id !== data.payload.id);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
          window.dispatchEvent(new CustomEvent('sbb:transactions-updated'));
        } catch (e) {}
        rebuildFromStorage();
      }
    } catch (e) {}
  });

  // storage event to keep other tabs in sync
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      rebuildFromStorage();
    }
  });

  // custom event for same-window updates
  window.addEventListener('sbb:transactions-updated', () => {
    // small debounce not necessary — just rebuild
    rebuildFromStorage();
  });

  // On load, perform initial rebuild. Also handle legacy key migration.
  window.addEventListener('load', () => {
    try {
      const legacy = JSON.parse(localStorage.getItem('sbb_transactions') || '[]');
      if (Array.isArray(legacy) && legacy.length) {
        const existing = loadAllTransactions();
        const merged = existing.concat(legacy.map(tx => (tx.id ? tx : Object.assign({ id: uid() }, tx))));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        localStorage.removeItem('sbb_transactions');
      }
    } catch (e) {}
    // ensure chart exists (Chart.js might load asynchronously)
    setTimeout(() => {
      if (!expenseChart && canvas && typeof Chart !== 'undefined') {
        createChart();
      }
      // default to monthly mode if buttons exist
      const defaultMode = (btnMonthly ? 'monthly' : 'monthly');
      updateChartMode(defaultMode);
    }, 200);
  });

  // Expose small API for other pages if needed
  window.SBB_HOME = {
    addTransaction,
    rebuildFromStorage
  };
})();