const STORAGE_KEY = 'nagomiKakeiboV2';

const initialData = {
  settings: {
    theme: 'theme-sakura',
    font: 'font-gothic',
    size: 'size-medium'
  },
  savings: [
    { name: '旅行資金', target: 100000, current: 35000, deadline: '2027-03-31' },
    { name: '緊急予備費', target: 300000, current: 120000, deadline: '2027-12-31' },
    { name: '', target: 0, current: 0, deadline: '' }
  ],
  categories: [
    { id: 'c1', type: 'expense', name: '食費', color: '#c996a5' },
    { id: 'c2', type: 'expense', name: '日用品', color: '#8fa889' },
    { id: 'c3', type: 'expense', name: '趣味・交際', color: '#bfa470' },
    { id: 'c4', type: 'income', name: '給与', color: '#9a9398' }
  ],
  recurring: [
    { id: 'r1', title: '家賃', categoryId: 'c2', amount: 55000 },
    { id: 'r2', title: '月給', categoryId: 'c4', amount: 220000 }
  ],
  transactions: [
    { id: 1, date: '2026-11-24', type: 'income', categoryId: 'c4', amount: 220000, memo: '今月分給与' },
    { id: 2, date: '2026-11-25', type: 'expense', categoryId: 'c1', amount: 1200, memo: 'スーパー買い物' },
    { id: 3, date: '2026-11-26', type: 'expense', categoryId: 'c3', amount: 3500, memo: 'カフェ・本' }
  ]
};

let state = loadState();
let chartInstance = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(initialData);
    const parsed = JSON.parse(raw);
    return {
      settings: { ...initialData.settings, ...(parsed.settings || {}) },
      savings: Array.isArray(parsed.savings) && parsed.savings.length === 3 ? parsed.savings : structuredClone(initialData.savings),
      categories: Array.isArray(parsed.categories) ? parsed.categories : structuredClone(initialData.categories),
      recurring: Array.isArray(parsed.recurring) ? parsed.recurring : structuredClone(initialData.recurring),
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : structuredClone(initialData.transactions)
    };
  } catch (_) {
    return structuredClone(initialData);
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

document.addEventListener('DOMContentLoaded', () => {
  const txDate = document.getElementById('txDate');
  if (txDate) txDate.valueAsDate = new Date();

  setupMenusAndModals();
  setupForms();
  applyAppearance();
  renderScreen();
});

function setupMenusAndModals() {
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsMenu = document.getElementById('settingsMenu');

  if (settingsBtn && settingsMenu) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsMenu.classList.toggle('hidden');
    });

    settingsMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    document.addEventListener('click', () => {
      settingsMenu.classList.add('hidden');
    });
  }

  const openSavingsBtn = document.getElementById('openSavingsBtn');
  if (openSavingsBtn) openSavingsBtn.addEventListener('click', () => openModal('modal-savings'));

  const openCategoriesBtn = document.getElementById('openCategoriesBtn');
  if (openCategoriesBtn) openCategoriesBtn.addEventListener('click', () => openModal('modal-categories'));

  const openAppBtn = document.getElementById('openAppBtn');
  if (openAppBtn) openAppBtn.addEventListener('click', () => openModal('modal-app'));

  document.querySelectorAll('.close-modal-btn').forEach((btn) => {
    btn.addEventListener('click', () => closeAllModals());
  });

  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAllModals();
    });
  });

  const saveSavingsBtn = document.getElementById('saveSavingsBtn');
  if (saveSavingsBtn) saveSavingsBtn.addEventListener('click', saveSavings);

  const addCategoryBtn = document.getElementById('addCategoryBtn');
  if (addCategoryBtn) addCategoryBtn.addEventListener('click', addCategory);

  const addRecurringBtn = document.getElementById('addRecurringBtn');
  if (addRecurringBtn) addRecurringBtn.addEventListener('click', addRecurring);

  document.querySelectorAll('.opt-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const settingKey = btn.dataset.setting;
      const settingValue = btn.dataset.value;
      if (!settingKey || !settingValue) return;
      state.settings[settingKey] = settingValue;
      persistState();
      applyAppearance();
      highlightSelectedOptions();
    });
  });
}

function setupForms() {
  const txType = document.getElementById('txType');
  if (txType) {
    txType.addEventListener('change', renderCategoryOptions);
  }

  const txForm = document.getElementById('transactionForm');
  if (txForm) {
    txForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const amountVal = Number(document.getElementById('txAmount').value);
      if (!amountVal || amountVal <= 0) return;

      state.transactions.unshift({
        id: Date.now(),
        date: document.getElementById('txDate').value,
        type: document.getElementById('txType').value,
        categoryId: document.getElementById('txCategory').value,
        amount: amountVal,
        memo: document.getElementById('txMemo').value.trim()
      });

      persistState();
      renderScreen();
      document.getElementById('txAmount').value = '';
      document.getElementById('txMemo').value = '';
    });
  }
}

function openModal(modalId) {
  closeAllModals();
  const menu = document.getElementById('settingsMenu');
  if (menu) menu.classList.add('hidden');

  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('hidden');

  if (modalId === 'modal-savings') renderSavingsInputs();
  if (modalId === 'modal-categories') renderCategoryAndRecurringLists();
  if (modalId === 'modal-app') highlightSelectedOptions();
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach((m) => m.classList.add('hidden'));
}

function renderScreen() {
  renderSavingsCards();
  renderCategoryOptions();
  renderRecurringChips();
  renderBalance();
  renderHistoryList();
  renderExpenseChart();
}

function renderSavingsCards() {
  const wrap = document.getElementById('savingsContainer');
  if (!wrap) return;
  wrap.innerHTML = '';

  state.savings.forEach((item, idx) => {
    if (!item.name && Number(item.target) === 0) return;
    const target = Number(item.target) || 0;
    const current = Number(item.current) || 0;
    const remain = Math.max(0, target - current);
    const rate = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

    let periodText = '達成期限：未設定';
    if (item.deadline) {
      const diffDays = Math.ceil((new Date(item.deadline) - new Date()) / (1000 * 60 * 60 * 24));
      periodText = diffDays >= 0
        ? `達成まであと ${diffDays} 日（${item.deadline}）`
        : `期限到達（${item.deadline}）`;
    }

    wrap.innerHTML += `
      <div class="saving-card">
        <strong>${escapeHtml(item.name || '目標' + (idx + 1))}</strong>
        <div style="font-size:0.85em; margin-top:4px; opacity:0.85;">${periodText}</div>
        <div class="progress-track">
          <div class="progress-bar" style="width:${rate}%"></div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.9em;">
          <span>現在：¥${current.toLocaleString()}</span>
          <span>目標：¥${target.toLocaleString()}</span>
        </div>
        <div style="margin-top:6px; font-weight:700; color:var(--accent-strong);">
          残り：¥${remain.toLocaleString()}（${rate}%）
        </div>
      </div>
    `;
  });
}

function renderSavingsInputs() {
  const list = document.getElementById('savingsFormList');
  if (!list) return;
  list.innerHTML = '';

  state.savings.forEach((s, i) => {
    list.innerHTML += `
      <div style="margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid var(--border);">
        <strong>目標 ${i + 1}</strong>
        <div class="form-row" style="margin-top:6px;">
          <input type="text" id="savName${i}" value="${escapeAttr(s.name)}" placeholder="目標名（例：旅行）">
          <input type="number" id="savTarget${i}" value="${s.target}" placeholder="目標金額" min="0">
          <input type="number" id="savCurrent${i}" value="${s.current}" placeholder="現在の貯金額" min="0">
          <input type="date" id="savDate${i}" value="${escapeAttr(s.deadline)}">
        </div>
      </div>
    `;
  });
}

function saveSavings() {
  for (let i = 0; i < 3; i++) {
    state.savings[i] = {
      name: document.getElementById(`savName${i}`).value.trim(),
      target: Number(document.getElementById(`savTarget${i}`).value) || 0,
      current: Number(document.getElementById(`savCurrent${i}`).value) || 0,
      deadline: document.getElementById(`savDate${i}`).value
    };
  }
  persistState();
  renderSavingsCards();
  closeAllModals();
}

function renderCategoryOptions() {
  const txTypeEl = document.getElementById('txType');
  const txCatEl = document.getElementById('txCategory');
  const recCatEl = document.getElementById('recCategory');
  if (!txTypeEl || !txCatEl || !recCatEl) return;

  const currentType = txTypeEl.value;
  txCatEl.innerHTML = '';
  recCatEl.innerHTML = '';

  state.categories.forEach((cat) => {
    if (cat.type === currentType) {
      txCatEl.innerHTML += `<option value="${escapeAttr(cat.id)}">${escapeHtml(cat.name)}</option>`;
    }
    const labelPrefix = cat.type === 'expense' ? '[支出]' : '[収入]';
    recCatEl.innerHTML += `<option value="${escapeAttr(cat.id)}">${labelPrefix} ${escapeHtml(cat.name)}</option>`;
  });
}

function renderRecurringChips() {
  const area = document.getElementById('recurringButtons');
  if (!area) return;
  area.innerHTML = '';

  state.recurring.forEach((rec) => {
    const cat = state.categories.find((c) => c.id === rec.categoryId);
    if (!cat) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip-btn';
    btn.textContent = `+ ${rec.title}（¥${Number(rec.amount).toLocaleString()}）`;
    btn.addEventListener('click', () => {
      const dateVal = document.getElementById('txDate').value || new Date().toISOString().slice(0, 10);
      state.transactions.unshift({
        id: Date.now(),
        date: dateVal,
        type: cat.type,
        categoryId: cat.id,
        amount: Number(rec.amount),
        memo: `定期：${rec.title}`
      });
      persistState();
      renderScreen();
    });
    area.appendChild(btn);
  });
}

function renderBalance() {
  const el = document.getElementById('currentBalance');
  if (!el) return;

  let total = 0;
  state.transactions.forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    total += tx.type === 'income' ? amt : -amt;
  });

  el.textContent = (total < 0 ? '-¥' : '¥') + Math.abs(total).toLocaleString();
}

function renderHistoryList() {
  const list = document.getElementById('txHistory');
  if (!list) return;
  list.innerHTML = '';

  state.transactions.slice(0, 25).forEach((tx) => {
    const cat = state.categories.find((c) => c.id === tx.categoryId) || { name: '未分類', color: '#aaa' };
    const sign = tx.type === 'income' ? '+' : '-';
    list.innerHTML += `
      <li>
        <div>
          <span style="font-size:0.8em; opacity:0.75;">${escapeHtml(tx.date)}</span>
          <span class="cat-badge" style="background:${escapeAttr(cat.color)};">${escapeHtml(cat.name)}</span>
          <span>${escapeHtml(tx.memo || '')}</span>
        </div>
        <strong>${sign}¥${Number(tx.amount).toLocaleString()}</strong>
      </li>
    `;
  });
}

function renderExpenseChart() {
  const canvas = document.getElementById('expenseChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const totalsByCat = {};
  state.transactions
    .filter((tx) => tx.type === 'expense')
    .forEach((tx) => {
      totalsByCat[tx.categoryId] = (totalsByCat[tx.categoryId] || 0) + (Number(tx.amount) || 0);
    });

  const labels = [];
  const values = [];
  const colors = [];

  Object.keys(totalsByCat).forEach((catId) => {
    const cat = state.categories.find((c) => c.id === catId);
    if (cat) {
      labels.push(cat.name);
      values.push(totalsByCat[catId]);
      colors.push(cat.color);
    }
  });

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function renderCategoryAndRecurringLists() {
  const catUl = document.getElementById('categoryManageList');
  if (catUl) {
    catUl.innerHTML = '';
    state.categories.forEach((cat) => {
      const li = document.createElement('li');
      const kindText = cat.type === 'expense' ? '支出' : '収入';
      li.innerHTML = `
        <span>
          <span class="cat-badge" style="background:${escapeAttr(cat.color)};">${kindText}</span>
          ${escapeHtml(cat.name)}
        </span>
      `;
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.textContent = '削除';
      delBtn.addEventListener('click', () => {
        state.categories = state.categories.filter((c) => c.id !== cat.id);
        persistState();
        renderCategoryAndRecurringLists();
        renderScreen();
      });
      li.appendChild(delBtn);
      catUl.appendChild(li);
    });
  }

  const recUl = document.getElementById('recurringManageList');
  if (recUl) {
    recUl.innerHTML = '';
    state.recurring.forEach((rec) => {
      const cat = state.categories.find((c) => c.id === rec.categoryId);
      const li = document.createElement('li');
      li.innerHTML = `<span>${escapeHtml(rec.title)}（${escapeHtml(cat ? cat.name : '')}）：¥${Number(rec.amount).toLocaleString()}</span>`;
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.textContent = '削除';
      delBtn.addEventListener('click', () => {
        state.recurring = state.recurring.filter((r) => r.id !== rec.id);
        persistState();
        renderCategoryAndRecurringLists();
        renderScreen();
      });
      li.appendChild(delBtn);
      recUl.appendChild(li);
    });
  }
}

function addCategory() {
  const nameInput = document.getElementById('newCatName');
  const typeSelect = document.getElementById('newCatType');
  const colorInput = document.getElementById('newCatColor');
  if (!nameInput || !typeSelect || !colorInput) return;

  const name = nameInput.value.trim();
  if (!name) return;

  state.categories.push({
    id: 'cat_' + Date.now(),
    type: typeSelect.value,
    name,
    color: colorInput.value
  });

  nameInput.value = '';
  persistState();
  renderCategoryAndRecurringLists();
  renderScreen();
}

function addRecurring() {
  const titleInput = document.getElementById('recTitle');
  const catSelect = document.getElementById('recCategory');
  const amtInput = document.getElementById('recAmount');
  if (!titleInput || !catSelect || !amtInput) return;

  const title = titleInput.value.trim();
  const amount = Number(amtInput.value);
  if (!title || !amount || amount <= 0) return;

  state.recurring.push({
    id: 'rec_' + Date.now(),
    title,
    categoryId: catSelect.value,
    amount
  });

  titleInput.value = '';
  amtInput.value = '';
  persistState();
  renderCategoryAndRecurringLists();
  renderScreen();
}

function applyAppearance() {
  const { theme, font, size } = state.settings;
  document.body.className = `${theme} ${font} ${size}`;
}

function highlightSelectedOptions() {
  const { theme, font, size } = state.settings;
  document.querySelectorAll('.opt-btn').forEach((btn) => {
    const val = btn.dataset.value;
    const isSelected = val === theme || val === font || val === size;
    btn.classList.toggle('selected', isSelected);
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("'", '&#39;');
}