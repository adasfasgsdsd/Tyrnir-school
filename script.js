// ===== ПОДКЛЮЧЕНИЕ SUPABASE =====
// Замени на свои значения из Settings → API
const SUPABASE_URL = 'https://clcgrwsuglkmpzgubscf.supabase.co/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsY2dyd3N1Z2xrbXB6Z3Vic2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MTQzMTgsImV4cCI6MjEwODM5MDMxOH0.M4oLoE8pw47TbcQW8eU9xY9gBVgeLj7KYo6fK1chNnY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== Элементы =====
const form = document.getElementById('playerForm');
const list = document.getElementById('playerList');
const counter = document.getElementById('counter');
const resetBtn = document.getElementById('resetBtn');
const exportBtn = document.getElementById('exportBtn');
const toast = document.getElementById('toast');

let players = [];

// ===== Утилиты =====
function showToast(msg, isError = false) {
  toast.textContent = msg;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 3000);
}

function isValidSteamUrl(url) {
  return /^https?:\/\/(www\.)?steamcommunity\.com\/(id|profiles)\/[\w-]+\/?$/i.test(url.trim());
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

// ===== Загрузка списка из Supabase =====
async function loadPlayers() {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Ошибка загрузки:', error);
    showToast('Не удалось загрузить список', true);
    return;
  }
  players = data || [];
  render();
}

// ===== Рендер =====
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
        <button class="remove" data-id="${p.id}" title="Удалить" aria-label="Удалить">✕</button>
      </div>
    `;
  }).join('');
}

// ===== Добавление (пишем в Supabase) =====
form.addEventListener('submit', async (e) => {
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
    showToast('Некорректная ссылка на Steam-профиль', true);
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

  const { error } = await supabase
    .from('players')
    .insert({ nick, fio, steam });

  if (error) {
    console.error('Ошибка добавления:', error);
    showToast('Ошибка при сохранении. Попробуйте ещё раз.', true);
    return;
  }

  form.reset();
  document.getElementById('nick').focus();
  showToast('✅ Участник добавлен!');
  await loadPlayers(); // перезагружаем список с сервера
});

// ===== Удаление (удаляем из Supabase) =====
list.addEventListener('click', async (e) => {
  const btn = e.target.closest('.remove');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const removed = players.find(p => p.id === id);

  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Ошибка удаления:', error);
    showToast('Не удалось удалить', true);
    return;
  }

  showToast(`Удалён: ${removed ? removed.nick : 'участник'}`);
  await loadPlayers();
});

// ===== Очистка всего списка =====
resetBtn.addEventListener('click', async () => {
  if (players.length === 0) return;
  if (!confirm('Удалить всех участников из списка? Это действие необратимо.')) return;

  const { error } = await supabase
    .from('players')
    .delete()
    .neq('id', 0); // удаляет все строки

  if (error) {
    console.error('Ошибка очистки:', error);
    showToast('Не удалось очистить список', true);
    return;
  }

  showToast('Список очищен');
  await loadPlayers();
});

// ===== Экспорт CSV =====
exportBtn.addEventListener('click', () => {
  if (players.length === 0) {
    showToast('Список пуст', true);
    return;
  }
  const header = 'Ник;ФИО;Steam-профиль\n';
  const rows = players.map(p =>
    [p.nick, p.fio, p.steam].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')
  ).join('\n');
  const csv = '\uFEFF' + header + rows;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mainten_participants_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📥 CSV скачан');
});

// ===== Вкладки =====
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ===== Старт: загружаем данные из облака =====
loadPlayers();
