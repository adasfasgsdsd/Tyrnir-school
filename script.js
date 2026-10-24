const STORAGE_KEY = 'mainten_tournament_players';
const form = document.getElementById('playerForm');
const list = document.getElementById('playerList');
const counter = document.getElementById('counter');
const resetBtn = document.getElementById('resetBtn');
const exportBtn = document.getElementById('exportBtn');
const toast = document.getElementById('toast');

let players = loadPlayers();

function loadPlayers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function savePlayers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

function showToast(msg, isError = false) {
  toast.textContent = msg;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2500);
}

function isValidSteamUrl(url) {
  return /^https?:\/\/(www\.)?steamcommunity\.com\/(id|profiles)\/[\w-]+\/?$/i.test(url.trim());
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function render() {
  counter.textContent = players.length;
  if (players.length === 0) {
    list.innerHTML = '<div class="empty">Пока никто не добавлен. Стань первым!</div>';
    return;
  }
  list.innerHTML = players.map((p, i) => {
    const initial = escapeHtml(p.nick.charAt(0).toUpperCase());
    const safeNick = escapeHtml(p.nick);
    const safeFio = escapeHtml(p.fio);
    const safeUrl = escapeHtml(p.steam);
    return `
      <div class="player">
        <div class="avatar">${initial}</div>
        <div class="info">
          <div class="nick">${safeNick}</div>
          <div class="fio">${safeFio}</div>
          <a class="steam-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>
        </div>
        <button class="remove" data-index="${i}" title="Удалить" aria-label="Удалить">✕</button>
      </div>
    `;
  }).join('');
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const nick = document.getElementById('nick').value.trim();
  const fio = document.getElementById('fio').value.trim();
  const steam = document.getElementById('steam').value.trim();
  const steamInput = document.getElementById('steam');

  steamInput.classList.remove('invalid');

  if (!nick || !fio || !steam) {
    showToast('Заполните все поля', true);
    return;
  }
  if (!isValidSteamUrl(steam)) {
    steamInput.classList.add('invalid');
    steamInput.focus();
    showToast('Введите корректную ссылку на Steam-профиль', true);
    return;
  }
  if (players.some(p => p.steam.toLowerCase() === steam.toLowerCase())) {
    showToast('Этот Steam-профиль уже добавлен', true);
    return;
  }
  if (players.some(p => p.nick.toLowerCase() === nick.toLowerCase())) {
    showToast('Такой ник уже используется', true);
    return;
  }

  players.push({ nick, fio, steam });
  savePlayers();
  render();
  form.reset();
  document.getElementById('nick').focus();
  showToast('✅ Участник добавлен в заявку!');
});

list.addEventListener('click', (e) => {
  const btn = e.target.closest('.remove');
  if (!btn) return;
  const idx = Number(btn.dataset.index);
  const removed = players[idx];
  players.splice(idx, 1);
  savePlayers();
  render();
  showToast(`Удалён: ${removed.nick}`);
});

resetBtn.addEventListener('click', () => {
  if (players.length === 0) return;
  if (confirm('Удалить всех участников из списка?')) {
    players = [];
    savePlayers();
    render();
    showToast('Список очищен');
  }
});

exportBtn.addEventListener('click', () => {
  if (players.length === 0) {
    showToast('Список пуст — нечего экспортировать', true);
    return;
  }
  const header = 'Ник;ФИО;Steam-профиль\n';
  const rows = players.map(p =>
    [p.nick, p.fio, p.steam].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')
  ).join('\n');
  const csv = '\uFEFF' + header + rows; // BOM для Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mainten_participants_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📥 CSV-файл скачан');
});

// Переключение вкладок
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

render();