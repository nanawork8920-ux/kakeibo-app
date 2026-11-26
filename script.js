const STORAGE_KEY = 'nagomiKakeiboV3';

const initialData = {
  setupCompleted: false,
  profile: {
    name: '',
    email: ''
  },
  settings: {
    theme: 'theme-sakura',
    font: 'font-gothic',
    size: 'size-medium'
  },
  savings: [
    { name: '', target: 0, current: 0, deadline: '' },
    { name: '', target: 0, current: 0, deadline: '' },
    { name: '', target: 0, current: 0, deadline: '' }
  ],
  categories: [
    { id: 'c_exp_1', type: 'expense', name: '食費', color: '#c996a5' },
    { id: 'c_exp_2', type: 'expense', name: '日用品', color: '#8fa889' },
    { id: 'c_exp_3', type: 'expense', name: '趣味・交際', color: '#bfa470' },
    { id: 'c_inc_1', type: 'income', name: '給与', color: '#9a9398' }
  ],
  recurring: [],
  transactions: []
};

let state = loadState();
let chartInstance = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(initialData);
    const parsed = JSON.parse(raw);
    return {
      setupCompleted: Boolean(parsed.setupCompleted),
      profile: { ...initialData.profile, ...(parsed.profile || {}) },
      settings: { ...initialData.settings, ...(parsed.settings || {}) },
      savings: Array.isArray(parsed.savings) && parsed.savings.length === 3
        ? parsed.savings
        : structuredClone(initialData.savings),
      categories: Array.isArray(parsed.categories) && parsed.categories.length > 0
        ? parsed.categories
        : structuredClone(initialData.categories),
      recurring: Array.isArray(parsed.recurring) ? parsed.recurring : [],
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : []
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
  setupDataTools();
  applyAppearance();
  renderScreen();

  if (!state.setupCompleted) {
    openModal('modal-setup');
  }
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
    btn.addEventListener('click', () => {
      if (btn.dataset.close === 'modal-setup') {
        state.setupCompleted = true;
        persistState();
      }
      closeAllModals();
    });
  });

  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (modal.id === 'modal-setup') {
          state.setupCompleted = true;
          persistState();
        }
        closeAllModals();
      }
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

      const catSelect = document.getElementById('txCategory');
      if (!catSelect || !catSelect.value) return;

      state.transactions.unshift({
        id: Date.now(),
        date: document.getElementById('txDate').value,
        type: document.getElementById('txType').value,
        categoryId: catSelect.value,
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

function setupDataTools() {
  const completeSetupBtn = document.getElementById('completeSetupBtn');
  if (completeSetupBtn) {
    completeSetupBtn.addEventListener('click', () => {
      state.profile = {
        name: document.getElementById('setupUserName').value.trim(),
        email: document.getElementById('setupUserEmail').value.trim()
      };

      const name = document.getElementById('setupSavName').value.trim();
      const target = Number(document.getElementById('setupSavTarget').value) || 0;
      const current = Number(document.getElementById('setupSavCurrent').value) || 0;
      const deadline = document.getElementById('setupSavDate').value;

      if (name || target > 0 || current > 0 || deadline) {
        state.savings[0] = { name, target, current, deadline };
      }

      state.setupCompleted = true;
      persistState();
      renderSavingsCards();
      closeAllModals();
    });
  }

  const skipSetupBtn = document.getElementById('skipSetupBtn');
  if (skipSetupBtn) {
    skipSetupBtn.addEventListener('click', () => {
      state.setupCompleted = true;
      persistState();
      closeAllModals();
    });
  }

  const saveProfileBtn = document.getElementById('saveProfileBtn');
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', () => {
      state.profile = {
        name: document.getElementById('appUserName').value.trim(),
        email: document.getElementById('appUserEmail').value.trim()
      };
      persistState();
      alert('プロフィールを保存しました。');
    });
  }

  const reopenSetupBtn = document.getElementById('reopenSetupBtn');
  if (reopenSetupBtn) {
    reopenSetupBtn.addEventListener('click', () => openModal('modal-setup'));
  }

  const exportBtn = document.getElementById('exportDataBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const jsonStr = JSON.stringify(state, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `kakeibo-backup-${today}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const importBtn = document.getElementById('importDataBtn');
  const fileInput = document.getElementById('importFileInput');
  if (importBtn && fileInput) {
    importBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = JSON.parse(String(reader.result));
          if (!imported || typeof imported !== 'object') return;
          state = {
            setupCompleted: true,
            profile: { ...initialData.profile, ...(imported.profile || {}) },
            settings: { ...initialData.settings, ...(imported.settings || {}) },
            savings: Array.isArray(imported.savings) && imported.savings.length === 3
              ? imported.savings
              : structuredClone(initialData.savings),
            categories: Array.isArray(imported.categories) && imported.categories.length > 0
              ? imported.categories
              : structuredClone(initialData.categories),
            recurring: Array.isArray(imported.recurring) ? imported.recurring : [],
            transactions: Array.isArray(imported.transactions) ? imported.transactions : []
          };
          persistState();
          applyAppearance();
          renderScreen();
          highlightSelectedOptions();
          alert('控えのデータを復元しました。');
        } catch (_) {
          alert('ファイルを読み込めませんでした。保存した控えファイルを選んでください。');
        } finally {
          fileInput.value = '';
        }
      };
      reader.readAsText(file);
    });
  }

  const resetBtn = document.getElementById('resetAllBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const ok = confirm('登録した収支や設定をすべて消去して、最初からやり直しますか？');
      if (!ok) return;
      localStorage.removeItem(STORAGE_KEY);
      state = structuredClone(initialData);
      persistState();
      applyAppearance();
      renderScreen();
      openModal('modal-setup');
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

  if (modalId === 'modal-setup') {
    document.getElementById('setupUserName').value = state.profile.name || '';
    document.getElementById('setupUserEmail').value = state.profile.email || '';
    const s0 = state.savings[0] || { name: '', target: 0, current: 0, deadline: '' };
    document.getElementById('setupSavName').value = s0.name || '';
    document.getElementById('setupSavTarget').value = s0.target || '';
    document.getElementById('setupSavCurrent').value = s0.current || '';
    document.getElementById('setupSavDate').value = s0.deadline || '';
    highlightSelectedOptions();
  }
  if (modalId === 'modal-savings') renderSavingsInputs();
  if (modalId === 'modal-categories') renderCategoryAndRecurringLists();
  if (modalId === 'modal-app') {
    document.getElementById('appUserName').value = state.profile.name || '';
    document.getElementById('appUserEmail').value = state.profile.email || '';
    highlightSelectedOptions();
  }
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

  let hasAny = false;
  state.savings.forEach((item, idx) => {
    const target = Number(item.target) || 0;
    const current = Number(item.current) || 0;
    if (!item.name && target === 0 && current === 0) return;
    hasAny = true;

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

  if (!hasAny) {
    wrap.innerHTML = `<p class="setup-note">目標貯金はまだ登録されていません。右上の設定から追加できます。</p>`;
  }
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

  if (state.recurring.length === 0) {
    area.innerHTML = `<span class="setup-note">定期収支はまだ未登録です（設定＞収支項目の設定から追加可能）。</span>`;
    return;
  }

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

  if (state.transactions.length === 0) {
    list.innerHTML = `<li style="justify-content:center; opacity:0.75;">収支の履歴はまだありません。</li>`;
    return;
  }

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
      labels: labels.length > 0 ? labels : ['支出なし'],
      datasets: [{
        data: values.length > 0 ? values : [1],
        backgroundColor: colors.length > 0 ? colors : ['#e6e2da'],
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
