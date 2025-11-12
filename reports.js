(function () {
  const STORAGE_KEY = 'sbb_transactions_all';

  // HEADER wiring: logo, add, settings, menu + dropdown keyboard support
  (function wireHeader() {
    const logo = document.querySelector('.site-logo');
    const addBtn = document.querySelector('.add');
    const settingsBtn = document.querySelector('.settings');
    const menuIcon = document.querySelector('.menu');
    const dropdownMenu = document.getElementById('dropdownMenu');

    if (logo) {
      logo.style.cursor = 'pointer';
      logo.addEventListener('click', () => { window.location.href = 'home.html'; });
      logo.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') window.location.href = 'home.html'; });
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => window.open('transaction.html', '_blank', 'noopener'));
      addBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') addBtn.click(); });
    }

    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => window.open('setting.html', '_blank', 'noopener'));
      settingsBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') settingsBtn.click(); });
    }

    if (menuIcon && dropdownMenu) {
      menuIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
      });
      menuIcon.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') menuIcon.click(); });
      dropdownMenu.addEventListener('click', (e) => e.stopPropagation());
      window.addEventListener('click', () => { dropdownMenu.style.display = 'none'; });
    }
  })();

  // Chart helpers
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function loadTransactions() { try { const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(raw) ? raw : []; } catch (e) { return []; } }
  function isWithinLastNDays(dateISO, n) { const d = new Date(dateISO); if (isNaN(d)) return false; const now = new Date(); return ((now - d) / (1000*60*60*24)) <= n; }

  function aggregateByCategory(transactions, mode) {
    const out = {};
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    transactions.forEach(t => {
      if (!t) return;
      const type = (t.type||'').toLowerCase();
      if (type !== 'expense') return;
      const amt = Number(t.amount||0);
      if (!amt) return;
      const dt = new Date(t.date || t.createdAt);
      if (isNaN(dt)) return;
      if (mode === 'monthly') {
        if (dt.getMonth() !== curMonth || dt.getFullYear() !== curYear) return;
      } else {
        if (!isWithinLastNDays(dt, 7)) return;
      }
      const cat = (t.category || 'Uncategorized').trim() || 'Uncategorized';
      out[cat] = (out[cat] || 0) + amt;
    });
    return out;
  }

  function top3FromMap(map) {
    const arr = Object.keys(map).map(k => ({ k, v: map[k] }));
    arr.sort((a, b) => b.v - a.v);
    const top = arr.slice(0, 3);
    const other = arr.slice(3).reduce((s, i) => s + i.v, 0);
    return { top, other };
  }

  // UI elements
  const btnMonthly = document.getElementById('btnMonthly');
  const btnWeekly = document.getElementById('btnWeekly');
  const legendList = document.getElementById('legendList');
  const recText = document.getElementById('recText');
  const recDetail = document.getElementById('recDetail');
  const viewDetails = document.getElementById('viewDetails');
  const palette = ['#10b981', '#f59e0b', '#ef4444', '#94a3b8'];
  let pieChart;

  function renderLegend(items, otherValue) {
    if (!legendList) return;
    legendList.innerHTML = '';
    items.forEach((it, idx) => {
      const li = document.createElement('li');
      li.className = 'legend-item';
      li.innerHTML = '<span class="swatch" style="background:' + palette[idx] + '"></span>' +
        '<div><div style="font-weight:600">' + it.k + '</div>' +
        '<div style="color:#6b7280;font-size:13px">₹ ' + Number(it.v).toLocaleString() + '</div></div>';
      legendList.appendChild(li);
    });
    if (otherValue > 0) {
      const li = document.createElement('li');
      li.className = 'legend-item';
      li.innerHTML = '<span class="swatch" style="background:' + palette[3] + '"></span>' +
        '<div><div style="font-weight:600">Other</div>' +
        '<div style="color:#6b7280;font-size:13px">₹ ' + Number(otherValue).toLocaleString() + '</div></div>';
      legendList.appendChild(li);
    }
  }

  function updateRecommendation(topItem) {
    if (topItem && topItem.k) {
      recText.textContent = 'Try to reduce ' + topItem.k + ' expense';
      recDetail.textContent = 'Largest share: ₹ ' + Number(topItem.v).toLocaleString();
    } else {
      recText.textContent = 'No expense data';
      recDetail.textContent = 'No categories to analyse for the selected period';
    }
  }

  function buildPieData(map) {
    const { top, other } = top3FromMap(map);
    const labels = top.map(i => i.k).concat(other > 0 ? ['Other'] : []);
    const data = top.map(i => i.v).concat(other > 0 ? [other] : []);
    const colors = palette.slice(0, labels.length);
    return { labels, data, colors, top, other };
  }

  async function draw(mode) {
    try {
      const tx = loadTransactions();
      const map = aggregateByCategory(tx, mode);
      const pie = buildPieData(map);
      if (!pieChart) {
        await loadScript('https://cdn.jsdelivr.net/npm/chart.js');
        const ctx = document.getElementById('reportsPie').getContext('2d');
        pieChart = new Chart(ctx, {
          type: 'pie',
          data: { labels: pie.labels, datasets: [{ data: pie.data, backgroundColor: pie.colors, borderWidth: 0, hoverOffset: 8 }] },
          options: { plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false }
        });
      } else {
        pieChart.data.labels = pie.labels;
        pieChart.data.datasets[0].data = pie.data;
        pieChart.data.datasets[0].backgroundColor = pie.colors;
        pieChart.update();
      }
      renderLegend(pie.top, pie.other);
      updateRecommendation(pie.top && pie.top[0] ? pie.top[0] : null);

      // update active classes
      if (btnMonthly) btnMonthly.classList.toggle('active', mode === 'monthly');
      if (btnWeekly) btnWeekly.classList.toggle('active', mode === 'weekly');
    } catch (err) {
      console.error('Chart error', err);
      const wrap = document.getElementById('reportsPie')?.parentElement;
      if (wrap) wrap.innerHTML = '<div style="padding:16px;color:#b91c1c">Failed to load chart.</div>';
    }
  }

  // events
  if (btnMonthly) btnMonthly.addEventListener('click', () => draw('monthly'));
  if (btnWeekly) btnWeekly.addEventListener('click', () => draw('weekly'));
  if (viewDetails) viewDetails.addEventListener('click', () => window.open('./view.html', '_blank', 'noopener'));

  // react to storage and postMessage updates
  window.addEventListener('message', (ev) => {
    try {
      const d = ev.data;
      if (!d || !d.type) return;
      if (d.type === 'sbb:transaction-created' || d.type === 'sbb:transaction-deleted') {
        const mode = (btnMonthly && btnMonthly.classList.contains('active')) ? 'monthly' : 'monthly';
        draw(mode);
      }
    } catch (e) {}
  });

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      const mode = (btnMonthly && btnMonthly.classList.contains('active')) ? 'monthly' : 'monthly';
      draw(mode);
    }
  });

  // initial draw
  draw('monthly');
})();
