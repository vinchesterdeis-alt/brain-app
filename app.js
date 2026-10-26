'use strict';

// ================= Звания =================
const RANKS = [
  { xp: 0,    icon: '🩴', name: 'Тапок',          quote: 'Лежит у двери и ни о чём не думает.' },
  { xp: 100,  icon: '🐟', name: 'Золотая рыбка',  quote: 'Память — три секунды. О чём это я?' },
  { xp: 250,  icon: '🥟', name: 'Пельмень',       quote: 'Уже с начинкой, но ещё варится.' },
  { xp: 500,  icon: '🐦', name: 'Голубь',         quote: 'Ходит гордо, иногда даже по делу.' },
  { xp: 850,  icon: '🦉', name: 'Сова-заочница',  quote: 'Учится по ночам, сессию сдаёт.' },
  { xp: 1300, icon: '🐈', name: 'Кот учёный',     quote: 'Идёт направо — песнь заводит.' },
  { xp: 1900, icon: '🤓', name: 'Ботаник',        quote: 'Очки запотели от мыслей.' },
  { xp: 2700, icon: '🕵️', name: 'Шерлок',         quote: 'Элементарно, Ватсон.' },
  { xp: 3700, icon: '👨‍🔬', name: 'Эйнштейн',       quote: 'Всё относительно. Кроме твоих очков.' },
  { xp: 5000, icon: '🧠', name: 'Джимми Нейтрон', quote: 'Мозговой штурм! Предел достигнут.' },
];

const SKILLS = [
  { id: 'memory',    icon: '🧩', name: 'Память' },
  { id: 'attention', icon: '👁️', name: 'Внимание' },
  { id: 'speed',     icon: '⚡', name: 'Скорость' },
  { id: 'logic',     icon: '🧮', name: 'Логика' },
  { id: 'speech',    icon: '🗣️', name: 'Речь' },
];

// ================= Сохранение прогресса =================
const STORE_KEY = 'brain-app-v1';

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s) return s;
  } catch (e) {}
  return { xp: 0, games: {}, streak: { last: null, count: 0 } };
}

function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
}

let state = loadState();

function rankIndex(xp) {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  return i;
}

function dayKey(d = new Date()) {
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

function updateStreak() {
  const today = dayKey();
  if (state.streak.last === today) return;
  state.streak.count = state.streak.last === yesterdayKey() ? state.streak.count + 1 : 1;
  state.streak.last = today;
}

function currentStreak() {
  const last = state.streak.last;
  return last === dayKey() || last === yesterdayKey() ? state.streak.count : 0;
}

// ================= Помощники =================
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Создаёт элемент страницы: el('div', {class: 'x', onclick: f}, 'текст', другойЭлемент)
function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c != null) e.append(c.nodeType ? c : String(c));
  }
  return e;
}

// Таймеры игры: при уходе с экрана все они останавливаются
let timers = [];
function later(fn, ms) { const id = setTimeout(fn, ms); timers.push(id); return id; }
function every(fn, ms) { const id = setInterval(fn, ms); timers.push(id); return id; }
function stopTimers() {
  timers.forEach(id => { clearTimeout(id); clearInterval(id); });
  timers = [];
}

// ================= Звук =================
// Мягкие звуки синтезируются на лету, без файлов
let audio = null;

function tone(freq, start = 0, dur = 0.15, vol = 0.06, type = 'sine') {
  if (state.sound === false) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const t = audio.currentTime + start;
    const osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  } catch (e) {}
}

const NOTES = [262, 294, 330, 349, 392, 440, 494, 523, 587]; // до, ре, ми… для клеток
const sound = {
  right: () => tone(880, 0, 0.1, 0.05),
  wrong: () => tone(160, 0, 0.25, 0.08, 'triangle'),
  flip: () => tone(520, 0, 0.07, 0.04),
  cell: n => tone(NOTES[n % NOTES.length], 0, 0.35, 0.07),
  tick: () => tone(1200, 0, 0.04, 0.025),
  finish: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.1, 0.35)),
  rankup: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.5, 0.08)),
};

function buzz(ms = 60) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
}

function flash(node, cls) {
  node.classList.remove(cls);
  void node.offsetWidth; // перезапуск анимации
  node.classList.add(cls);
  later(() => node.classList.remove(cls), 300);
}

// Обратный отсчёт; add(-2) отнимает 2 секунды
function countdown(seconds, onTick, onEnd) {
  const t = { end: Date.now() + seconds * 1000, add(s) { this.end += s * 1000; } };
  let prev = seconds;
  const id = every(() => {
    const left = Math.max(0, Math.ceil((t.end - Date.now()) / 1000));
    if (left !== prev && left > 0 && left <= 5) sound.tick();
    prev = left;
    onTick(left);
    if (left <= 0) { clearInterval(id); onEnd(); }
  }, 200);
  onTick(seconds);
  return t;
}

// Секундомер в шапке игры; возвращает функцию «сколько секунд прошло»
function stopwatch(setTimer) {
  const t0 = Date.now();
  const sec = () => Math.floor((Date.now() - t0) / 1000);
  every(() => setTimer('⏱ ' + sec() + ' с'), 250);
  setTimer('⏱ 0 с');
  return sec;
}

const app = document.getElementById('app');
const modal = document.getElementById('modal');

function show(...nodes) {
  stopTimers();
  modal.hidden = true;
  app.replaceChildren(...nodes.flat().filter(Boolean));
  window.scrollTo(0, 0);
}

function topbar(title, back, right) {
  return el('header', { class: 'topbar' },
    el('button', { class: 'icon-btn', onclick: () => back(), 'aria-label': 'Назад' }, '←'),
    el('div', { class: 'topbar-title' }, title),
    right || el('div', { style: 'width:40px' }));
}

// Общая механика «вопрос — 4 варианта ответа — таймер»
function runQuiz({ area, setTimer, setScore, finish }, { seconds, penalty = 0, makeTask, xp, summary }) {
  const st = { right: 0, wrong: 0, level: 1 };
  const q = el('div', { class: 'question' });
  const opts = el('div', { class: 'answers' });
  let task;

  function next() {
    task = makeTask(st.level);
    q.textContent = task.text;
    q.className = 'question ' + (task.cls || '');
    q.style.color = task.color || '';
    opts.replaceChildren(...task.options.map(o =>
      el('button', { class: 'btn answer', onclick: () => check(o) }, o)));
  }

  function check(o) {
    if (o === task.answer) {
      st.right++;
      if (st.right % 5 === 0) st.level++;
      sound.right();
    } else {
      st.wrong++;
      if (penalty) timer.add(-penalty);
      sound.wrong();
      buzz();
      flash(q, 'wrong');
    }
    setScore('Верно: ' + st.right);
    next();
  }

  area.append(q, opts);
  setScore('Верно: 0');
  next();
  const timer = countdown(seconds, t => setTimer('⏳ ' + t + ' с'), () => finish(xp(st), summary(st)));
}

// Четыре варианта ответа: правильный + правдоподобные ошибки
function numberOptions(answer) {
  const set = new Set([answer]);
  while (set.size < 4) {
    const d = answer + pick([-10, -2, -1, 1, 2, 10, rand(-6, 6)]);
    if (d >= 0) set.add(d);
  }
  return shuffle([...set]);
}

// ================= Данные для игр =================
const COLORS = [
  { name: 'красный',    css: '#d0392b' },
  { name: 'синий',      css: '#2f6fd1' },
  { name: 'зелёный',    css: '#2e9a4b' },
  { name: 'фиолетовый', css: '#8b4fc9' },
];

const PAIR_ICONS = ['🍕', '🧗', '🥟', '🐈', '🦉', '🚀', '🎸', '🌵', '🍩', '⚽', '🐙', '🌈'];

// Пары «почти одинаковых» значков для игры «Найди лишнее»
const ODD_PAIRS = [
  ['😀', '😃'], ['🙂', '😊'], ['😐', '😑'], ['😺', '😸'], ['🐻', '🐨'], ['🍏', '🍎'],
  ['⭐', '🌟'], ['🌑', '🌚'], ['О', '0'], ['б', '6'], ['Ш', 'Щ'], ['З', '3'],
  ['Е', 'Ё'], ['п', 'н'], ['Ь', 'Ъ'], ['8', 'В'],
];

const DISK_COLORS = ['#e9b38f', '#d97757', '#b9573a', '#8a3f2a'];

// Слова для анаграмм по длине: 5, 6 и 7 букв
const ANAGRAM_WORDS = [
  ['кошка', 'книга', 'игрок', 'сахар', 'зебра', 'ветер', 'вилка', 'лампа', 'лодка', 'мышка', 'песок',
   'поезд', 'салат', 'танец', 'шапка', 'белка', 'груша', 'школа', 'тесто', 'океан', 'город'],
  ['ракета', 'газета', 'машина', 'собака', 'корова', 'молоко', 'облако', 'улитка', 'дракон', 'кролик',
   'мастер', 'турник', 'прыжок', 'паркур', 'солнце', 'фонарь'],
  ['планета', 'котлета', 'ромашка', 'капуста', 'бабочка', 'дельфин', 'кенгуру', 'черника', 'телефон',
   'пингвин', 'колбаса', 'зеркало', 'воркаут'],
];

// Судоку 6×6 (блоки 2×3): готовое решение + головоломка с единственным ответом
function makeSudoku() {
  const N = 6, R = 2, C = 3;
  const digits = shuffle([1, 2, 3, 4, 5, 6]);
  const rows = shuffle([0, 1, 2]).flatMap(b => shuffle([0, 1]).map(r => b * R + r));
  const cols = shuffle([0, 1]).flatMap(s => shuffle([0, 1, 2]).map(c => s * C + c));
  const sol = rows.map(r => cols.map(c => digits[(C * (r % R) + Math.floor(r / R) + c) % N]));
  const puzzle = sol.map(r => r.slice());
  let empty = 0;
  for (const k of shuffle([...Array(36).keys()])) {
    const r = Math.floor(k / 6), c = k % 6, v = puzzle[r][c];
    puzzle[r][c] = 0;
    if (countSolutions(puzzle, 2) === 1) empty++;
    else puzzle[r][c] = v;
    if (empty >= 18) break;
  }
  return { sol, puzzle };
}

function countSolutions(g, limit) {
  let count = 0;
  const ok = (r, c, v) => {
    for (let i = 0; i < 6; i++) if (g[r][i] === v || g[i][c] === v) return false;
    const br = r - r % 2, bc = c - c % 3;
    for (let i = br; i < br + 2; i++) for (let j = bc; j < bc + 3; j++) if (g[i][j] === v) return false;
    return true;
  };
  (function solve() {
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
      if (g[r][c]) continue;
      for (let v = 1; v <= 6 && count < limit; v++) {
        if (ok(r, c, v)) { g[r][c] = v; solve(); g[r][c] = 0; }
      }
      return;
    }
    count++;
  })();
  return count;
}

// ================= Игры =================
const GAMES = [
  // ----- Память -----
  {
    id: 'sequence', skill: 'memory', icon: '💡', name: 'Повтори за мной',
    rules: [
      'Клетки загораются по очереди — запомни порядок.',
      'Когда появится «Твой ход», нажми клетки в том же порядке.',
      'Каждый раунд цепочка длиннее на одну клетку. Одна ошибка — конец игры.',
    ],
    start({ area, setTimer, setScore, finish }) {
      const grid = el('div', { class: 'board cols-3 locked' });
      const cells = [];
      for (let i = 0; i < 9; i++) {
        const c = el('button', { class: 'cell', onclick: () => tap(i) });
        cells.push(c);
        grid.append(c);
      }
      const seq = [rand(0, 8), rand(0, 8)];
      let pos = 0, input = false;

      function light(n) {
        sound.cell(n);
        cells[n].classList.add('lit');
        later(() => cells[n].classList.remove('lit'), 400);
      }

      function round() {
        seq.push(rand(0, 8));
        pos = 0;
        input = false;
        grid.classList.add('locked');
        setScore('Длина: ' + seq.length);
        setTimer('Смотри…');
        seq.forEach((n, k) => later(() => light(n), 700 + k * 650));
        later(() => { input = true; grid.classList.remove('locked'); setTimer('Твой ход'); }, 700 + seq.length * 650);
      }

      function tap(i) {
        if (!input) return;
        light(i);
        if (i !== seq[pos]) {
          input = false;
          sound.wrong();
          buzz(200);
          cells[i].classList.add('wrong');
          const done = seq.length - 1;
          later(() => finish(Math.max(0, done - 2) * 15,
            `Запомнил цепочку из ${done} клеток. Норма для взрослого — 6–8.`), 700);
          return;
        }
        pos++;
        if (pos === seq.length) { input = false; later(round, 600); }
      }

      area.append(grid);
      round();
    },
  },
  {
    id: 'pairs', skill: 'memory', icon: '🃏', name: 'Пары карточек',
    rules: [
      'Под карточками спрятаны 8 пар картинок.',
      'Открывай по две. Совпали — остаются открытыми, нет — переворачиваются обратно.',
      'Найди все пары за как можно меньшее число ходов.',
    ],
    start({ area, setTimer, setScore, finish }) {
      const icons = shuffle(PAIR_ICONS).slice(0, 8);
      const sec = stopwatch(setTimer);
      let open = [], found = 0, moves = 0;
      setScore('Ходов: 0');

      function flip(c, icon) {
        if (open.length === 2 || c.classList.contains('open')) return;
        sound.flip();
        c.classList.add('open');
        c.textContent = icon;
        open.push({ c, icon });
        if (open.length < 2) return;
        moves++;
        setScore('Ходов: ' + moves);
        const [a, b] = open;
        if (a.icon === b.icon) {
          sound.right();
          a.c.classList.add('matched');
          b.c.classList.add('matched');
          open = [];
          if (++found === 8) {
            later(() => finish(Math.max(10, 130 - (moves - 8) * 6),
              `Ходов: ${moves}, время: ${sec()} с. Идеал — 8 ходов, хороший результат — до 14.`), 500);
          }
        } else {
          later(() => {
            [a, b].forEach(o => { o.c.classList.remove('open'); o.c.textContent = ''; });
            open = [];
          }, 800);
        }
      }

      area.append(el('div', { class: 'board cols-4 pairs' },
        shuffle([...icons, ...icons]).map(icon => {
          const c = el('button', { class: 'cell card-back', onclick: () => flip(c, icon) });
          return c;
        })));
    },
  },
  {
    id: 'cells', skill: 'memory', icon: '🔲', name: 'Запомни клетки',
    rules: [
      'На поле ненадолго загорятся несколько клеток — запомни, где они.',
      'Потом нажми все эти клетки в любом порядке.',
      'Справился — клеток станет больше. Ошибся — новый раунд с тем же числом клеток.',
      'Три ошибки — конец игры.',
    ],
    start({ area, setTimer, setScore, finish }) {
      let count = 3, lives = 3, won = 0, best = 0;
      const wrap = el('div');
      area.append(wrap);

      function round() {
        const size = count <= 5 ? 4 : count <= 8 ? 5 : 6;
        const targets = new Set(shuffle([...Array(size * size).keys()]).slice(0, count));
        let found = 0, input = false;
        setScore('❤️'.repeat(lives));
        setTimer('Клеток: ' + count);
        const grid = el('div', { class: 'board locked', style: `grid-template-columns:repeat(${size},1fr)` });
        const cells = [...Array(size * size)].map((_, i) => {
          const c = el('button', { class: 'cell', onclick: () => tap(i, c) });
          grid.append(c);
          return c;
        });
        wrap.replaceChildren(grid);
        later(() => { targets.forEach(i => cells[i].classList.add('lit')); sound.cell(4); }, 500);
        later(() => {
          targets.forEach(i => cells[i].classList.remove('lit'));
          grid.classList.remove('locked');
          input = true;
        }, 1300 + count * 150);

        function tap(i, c) {
          if (!input || c.classList.contains('right')) return;
          if (targets.has(i)) {
            c.classList.add('right');
            sound.right();
            if (++found === count) {
              input = false;
              won++;
              best = Math.max(best, count);
              count++;
              later(round, 700);
            }
            return;
          }
          input = false;
          c.classList.add('wrong');
          targets.forEach(j => cells[j].classList.add('hint'));
          sound.wrong();
          buzz();
          if (--lives === 0) {
            later(() => finish(won * 12, `Пройдено раундов: ${won}. Больше всего запомнил: ${best} клеток.`), 1200);
          } else {
            later(round, 1200);
          }
        }
      }

      round();
    },
  },
  {
    id: 'nback', skill: 'memory', icon: '🔁', name: 'Два шага назад',
    rules: [
      'Клетки на поле загораются по одной, каждые 2,5 секунды.',
      'Жми «Совпадает», если сейчас горит та же клетка, что и ДВА шага назад.',
      'Пример: верх, центр, верх — на третьем шаге жми. Не совпадает — ничего не нажимай.',
      'Это одна из самых изученных тренировок рабочей памяти. Сначала сложно — это нормально.',
    ],
    start({ area, setTimer, setScore, finish }) {
      const N = 2, STEPS = 22;
      const seq = [];
      for (let i = 0; i < STEPS; i++) {
        if (i >= N && Math.random() < 0.3) { seq.push(seq[i - N]); continue; }
        let v;
        do { v = rand(0, 8); } while (i >= N && v === seq[i - N]);
        seq.push(v);
      }
      const matches = seq.filter((v, i) => i >= N && v === seq[i - N]).length;
      let step = -1, pressed = false, hits = 0, falseHits = 0;

      const grid = el('div', { class: 'board cols-3' });
      const cells = [...Array(9)].map(() => {
        const c = el('div', { class: 'cell' });
        grid.append(c);
        return c;
      });
      const btn = el('button', { class: 'btn primary big', onclick: press }, 'Совпадает');
      area.append(grid, el('div', { style: 'margin-top:16px' }, btn));

      const isMatch = () => step >= N && seq[step] === seq[step - N];

      function press() {
        if (step < 0 || pressed) return;
        pressed = true;
        if (isMatch()) { hits++; sound.right(); flash(btn, 'good'); }
        else { falseHits++; sound.wrong(); buzz(); flash(btn, 'bad'); }
        setScore('Поймано: ' + hits);
      }

      function next() {
        step++;
        if (step === STEPS) {
          finish(Math.max(0, (hits - falseHits) * 10),
            `Поймал совпадений: ${hits} из ${matches}. Ложных нажатий: ${falseHits}.`);
          return;
        }
        pressed = false;
        setTimer(`Шаг ${step + 1} из ${STEPS}`);
        const c = cells[seq[step]];
        c.classList.add('lit');
        sound.cell(seq[step]);
        later(() => c.classList.remove('lit'), 900);
      }

      setScore('Поймано: 0');
      next();
      every(next, 2500);
    },
  },

  // ----- Внимание -----
  {
    id: 'stroop', skill: 'attention', icon: '🎨', name: 'Цвет или слово',
    rules: [
      'Появляется название цвета, написанное краской другого цвета.',
      'Жми кнопку с цветом КРАСКИ, а не с тем, что написано.',
      'Например, слово «СИНИЙ» красными буквами — жми «красный».',
      '30 секунд. Ошибки уменьшают награду.',
    ],
    start(ctx) {
      runQuiz(ctx, {
        seconds: 30,
        makeTask() {
          const word = pick(COLORS);
          let ink;
          do { ink = pick(COLORS); } while (ink === word && Math.random() < 0.8);
          return { text: word.name.toUpperCase(), color: ink.css, cls: 'stroop',
            options: COLORS.map(c => c.name), answer: ink.name };
        },
        xp: st => Math.max(0, (st.right - st.wrong) * 4),
        summary: st => `Верно: ${st.right}, ошибок: ${st.wrong}.`,
      });
    },
  },
  {
    id: 'odd', skill: 'attention', icon: '🔍', name: 'Найди лишнее',
    rules: [
      'Все значки на поле одинаковые, кроме одного.',
      'Найди и нажми лишний как можно быстрее.',
      'Каждые три находки поле становится больше.',
      '45 секунд. Ошибка отнимает 2 секунды.',
    ],
    start({ area, setTimer, setScore, finish }) {
      const st = { right: 0, wrong: 0 };
      const wrap = el('div');
      area.append(wrap);

      function next() {
        const size = Math.min(7, 3 + Math.floor(st.right / 3));
        const [a, b] = shuffle(pick(ODD_PAIRS));
        const odd = rand(0, size * size - 1);
        const grid = el('div', { class: 'board odd',
          style: `grid-template-columns:repeat(${size},1fr);font-size:${Math.round(150 / size)}px` });
        for (let i = 0; i < size * size; i++) {
          const c = el('button', { class: 'cell', onclick: () => tap(i === odd, c) }, i === odd ? b : a);
          grid.append(c);
        }
        wrap.replaceChildren(grid);
      }

      function tap(ok, c) {
        if (ok) {
          st.right++;
          sound.right();
          setScore('Найдено: ' + st.right);
          next();
        } else {
          st.wrong++;
          timer.add(-2);
          sound.wrong();
          buzz();
          flash(c, 'wrong');
        }
      }

      setScore('Найдено: 0');
      next();
      const timer = countdown(45, t => setTimer('⏳ ' + t + ' с'),
        () => finish(Math.max(0, (st.right - st.wrong) * 6), `Найдено: ${st.right}, ошибок: ${st.wrong}.`));
    },
  },

  // ----- Скорость -----
  {
    id: 'math', skill: 'speed', icon: '➗', name: 'Быстрый счёт',
    rules: [
      'Решай примеры в уме и выбирай правильный ответ.',
      'Каждые 5 верных ответов — примеры сложнее.',
      '45 секунд. Ошибка отнимает 2 секунды.',
    ],
    start(ctx) {
      runQuiz(ctx, {
        seconds: 45, penalty: 2,
        makeTask(level) {
          const ops = level < 2 ? ['+', '−'] : level < 4 ? ['+', '−', '×'] : ['+', '−', '×', '÷'];
          const op = pick(ops), max = 10 * level + 5;
          let a, b, res;
          if (op === '+') { a = rand(2, max); b = rand(2, max); res = a + b; }
          else if (op === '−') { a = rand(5, max + 5); b = rand(1, a); res = a - b; }
          else if (op === '×') { a = rand(2, 3 + level * 2); b = rand(2, 9); res = a * b; }
          else { b = rand(2, 9); res = rand(2, 3 + level * 2); a = b * res; }
          return { text: `${a} ${op} ${b} = ?`, options: numberOptions(res), answer: res };
        },
        xp: st => Math.max(0, (st.right - st.wrong) * 6),
        summary: st => `Верно: ${st.right}, ошибок: ${st.wrong}. Дошёл до уровня ${st.level}.`,
      });
    },
  },
  {
    id: 'reaction', skill: 'speed', icon: '⚡', name: 'Реакция',
    rules: [
      'Нажми на большую кнопку — она станет красной. Жди.',
      'Как только она станет зелёной, жми как можно быстрее.',
      'Нажал раньше времени — попытка не засчитывается.',
      '5 попыток, считается среднее время.',
    ],
    start({ area, setTimer, setScore, finish }) {
      const results = [];
      let phase = 'idle', t0 = 0, goTimer = null;
      const pad = el('button', { class: 'reaction-pad', onpointerdown: tap }, 'Нажми, чтобы начать');
      area.append(pad);
      setTimer('');
      setScore('Попытка 1 из 5');

      function wait() {
        phase = 'wait';
        pad.className = 'reaction-pad wait';
        pad.textContent = 'Жди зелёного…';
        goTimer = later(() => {
          phase = 'go';
          pad.className = 'reaction-pad go';
          pad.textContent = 'ЖМИ!';
          t0 = performance.now();
        }, rand(1500, 4000));
      }

      function tap() {
        if (phase === 'idle') { wait(); return; }
        if (phase === 'wait') {
          clearTimeout(goTimer);
          sound.wrong();
          buzz();
          phase = 'idle';
          pad.className = 'reaction-pad early';
          pad.textContent = 'Рано!\nНажми, чтобы повторить';
          return;
        }
        if (phase !== 'go') return;
        const ms = Math.round(performance.now() - t0);
        results.push(ms);
        sound.right();
        if (results.length === 5) {
          phase = 'done';
          const avg = Math.round(results.reduce((a, b) => a + b) / 5);
          finish(Math.min(100, Math.max(5, (600 - avg) / 3)),
            `Среднее время: ${avg} мс (${results.join(', ')}). У большинства людей 250–350 мс.`);
          return;
        }
        phase = 'idle';
        setScore(`Попытка ${results.length + 1} из 5`);
        pad.className = 'reaction-pad';
        pad.textContent = `${ms} мс\nНажми для следующей попытки`;
      }
    },
  },

  // ----- Логика -----
  {
    id: 'hanoi', skill: 'logic', icon: '🗼', name: 'Ханойская башня',
    rules: [
      'Перенеси всю башню с левого стержня на правый.',
      'Нажми на стержень, чтобы взять верхнее кольцо, потом на тот, куда его положить.',
      'Нельзя класть большое кольцо на меньшее.',
      'Минимум — 15 ходов. Подсказка: самое маленькое кольцо ходит через ход.',
    ],
    start({ area, setTimer, setScore, finish }) {
      const D = 4, MIN = 15;
      const pegs = [[4, 3, 2, 1], [], []];
      const sec = stopwatch(setTimer);
      let sel = null, moves = 0, done = false;
      const board = el('div', { class: 'hanoi' });
      area.append(board);

      function draw() {
        setScore('Ходов: ' + moves);
        board.replaceChildren(...pegs.map((p, i) =>
          el('button', { class: 'peg' + (sel === i ? ' selected' : ''), onclick: () => tap(i) },
            el('div', { class: 'rod' }),
            p.map(d => el('div', { class: 'disk', style: `width:${20 + d * 18}%;background:${DISK_COLORS[d - 1]}` })))));
      }

      function tap(i) {
        if (done) return;
        if (sel === null) {
          if (pegs[i].length) { sel = i; sound.flip(); }
        } else if (sel === i) {
          sel = null;
        } else {
          const from = pegs[sel], to = pegs[i];
          if (to.length && to[to.length - 1] < from[from.length - 1]) {
            sound.wrong();
            buzz();
          } else {
            to.push(from.pop());
            moves++;
            sound.right();
          }
          sel = null;
          if (pegs[2].length === D) {
            done = true;
            later(() => finish(Math.max(10, 110 - (moves - MIN) * 4),
              `Ходов: ${moves} (минимум ${MIN}), время: ${sec()} с.`), 500);
          }
        }
        draw();
      }

      draw();
    },
  },
  {
    id: 'sudoku', skill: 'logic', icon: '🔢', name: 'Мини-судоку',
    rules: [
      'Поле 6×6 разбито на 6 блоков по 2×3 клетки.',
      'Заполни пустые клетки цифрами от 1 до 6 так, чтобы в каждой строке, столбце и блоке цифры не повторялись.',
      'Нажми на пустую клетку, потом на цифру внизу.',
      'Неверная цифра не ставится и считается ошибкой.',
    ],
    start({ area, setTimer, setScore, finish }) {
      const { sol, puzzle } = makeSudoku();
      const sec = stopwatch(setTimer);
      let sel = null, mistakes = 0, left = puzzle.flat().filter(v => !v).length;
      setScore('Ошибок: 0');

      // 6 блоков 2×3, внутри них клетки; cells[r*6+c] — клетка строки r, столбца c
      const boxes = [...Array(6)].map(() => el('div', { class: 's-box' }));
      const cells = [];
      puzzle.forEach((row, r) => row.forEach((v, c) => {
        const cell = el('button', { class: 's-cell' + (v ? ' given' : ''), onclick: () => select(r, c) }, v || '');
        cells[r * 6 + c] = cell;
        boxes[Math.floor(r / 2) * 2 + Math.floor(c / 3)].append(cell);
      }));

      function select(r, c) {
        if (puzzle[r][c]) return;
        sel = [r, c];
        cells.forEach((cell, i) => cell.classList.toggle('selected', i === r * 6 + c));
      }

      function put(n) {
        if (!sel) return;
        const [r, c] = sel, cell = cells[r * 6 + c];
        if (sol[r][c] !== n) {
          mistakes++;
          sound.wrong();
          buzz();
          flash(cell, 'wrong');
          setScore('Ошибок: ' + mistakes);
          return;
        }
        puzzle[r][c] = n;
        cell.textContent = n;
        cell.classList.remove('selected');
        sel = null;
        sound.right();
        if (--left === 0) {
          const s = sec();
          later(() => finish(Math.max(10, 130 - mistakes * 15 - Math.floor(s / 5)),
            `Время: ${s} с, ошибок: ${mistakes}.`), 500);
        }
      }

      area.append(
        el('div', { class: 'sudoku' }, boxes),
        el('div', { class: 'numpad' }, [1, 2, 3, 4, 5, 6].map(n =>
          el('button', { class: 'btn', onclick: () => put(n) }, n))));
    },
  },

  // ----- Речь -----
  {
    id: 'anagram', skill: 'speech', icon: '🔤', name: 'Анаграммы',
    rules: [
      'Буквы слова перемешаны — собери из них слово.',
      'Нажимай буквы по порядку. Ошибся — нажми на букву в ответе, и она вернётся.',
      'Слова становятся длиннее: 5, потом 6, потом 7 букв.',
      '60 секунд. «Пропустить» не даёт очков.',
    ],
    start({ area, setTimer, setScore, finish }) {
      let right = 0, skipped = 0, list, word, letters, answer;
      const seen = new Set();
      const ansRow = el('div', { class: 'tiles answer-row' });
      const pool = el('div', { class: 'tiles' });
      area.append(ansRow, pool,
        el('button', { class: 'btn big', style: 'margin-top:8px', onclick: () => { skipped++; next(); } }, 'Пропустить'));

      function next() {
        list = ANAGRAM_WORDS[Math.min(2, Math.floor(right / 3))];
        const fresh = list.filter(w => !seen.has(w));
        word = pick(fresh.length ? fresh : list);
        seen.add(word);
        do { letters = shuffle([...word.toUpperCase()]); } while (letters.join('') === word.toUpperCase());
        answer = [];
        draw();
      }

      function draw() {
        ansRow.replaceChildren(...letters.map((_, k) => k < answer.length
          ? el('button', { class: 'tile', onclick: () => { answer.splice(k, 1); draw(); } }, letters[answer[k]])
          : el('div', { class: 'tile empty' })));
        pool.replaceChildren(...letters.map((ch, i) =>
          el('button', { class: 'tile' + (answer.includes(i) ? ' used' : ''), onclick: () => add(i) }, ch)));
      }

      function add(i) {
        if (answer.includes(i)) return;
        sound.flip();
        answer.push(i);
        draw();
        if (answer.length < letters.length) return;
        const formed = answer.map(k => letters[k]).join('').toLowerCase();
        // засчитываем и другое слово из тех же букв, если оно есть в списке
        if (list.includes(formed)) {
          right++;
          sound.right();
          setScore('Собрано: ' + right);
          next();
        } else {
          sound.wrong();
          buzz();
          flash(ansRow, 'wrong');
          later(() => { answer = []; draw(); }, 400);
        }
      }

      setScore('Собрано: 0');
      next();
      countdown(60, t => setTimer('⏳ ' + t + ' с'),
        () => finish(right * 10, `Собрано слов: ${right}, пропущено: ${skipped}. Последнее слово: «${word}».`));
    },
  },
];

// ================= Экраны =================
function rankCard() {
  const i = rankIndex(state.xp), r = RANKS[i], next = RANKS[i + 1];
  const pct = next ? (state.xp - r.xp) / (next.xp - r.xp) * 100 : 100;
  return el('button', { class: 'rank-card', onclick: renderRanks },
    el('div', { class: 'rank-icon' }, r.icon),
    el('div', { class: 'rank-info' },
      el('div', { class: 'rank-level' }, `Уровень ${i + 1} из ${RANKS.length}`),
      el('div', { class: 'rank-name' }, r.name),
      el('div', { class: 'bar' }, el('div', { class: 'bar-fill', style: `width:${pct}%` })),
      el('div', { class: 'rank-next' },
        next ? `${state.xp} / ${next.xp} XP до «${next.name}»` : `${state.xp} XP — ты на вершине`)));
}

function gameCard(g) {
  const st = state.games[g.id];
  return el('button', { class: 'game-card', onclick: () => renderIntro(g) },
    el('div', { class: 'game-icon' }, g.icon),
    el('div', { class: 'game-name' }, g.name),
    el('div', { class: 'game-best' }, st ? `рекорд: ${st.best} XP` : 'новая'));
}

function soundButton() {
  const b = el('button', { class: 'icon-btn', 'aria-label': 'Звук', onclick: () => {
    state.sound = state.sound === false;
    saveState();
    b.textContent = state.sound ? '🔊' : '🔇';
    sound.right();
  } }, state.sound === false ? '🔇' : '🔊');
  return b;
}

function renderHome() {
  show(
    el('header', { class: 'home-head' },
      el('h1', {}, 'Мозгокачалка'),
      el('div', { class: 'head-right' },
        el('div', { class: 'streak', title: 'Дней подряд' }, '🔥 ' + currentStreak()),
        soundButton())),
    rankCard(),
    SKILLS.map(skill => {
      const list = GAMES.filter(g => g.skill === skill.id);
      if (!list.length) return null;
      return el('section', {},
        el('h2', { class: 'skill-title' }, skill.icon + ' ' + skill.name),
        el('div', { class: 'grid' }, list.map(gameCard)));
    }));
}

function renderIntro(g) {
  const st = state.games[g.id];
  show(
    topbar(g.name, renderHome),
    el('div', { class: 'intro' },
      el('div', { class: 'intro-icon' }, g.icon),
      el('h2', {}, g.name),
      el('div', { class: 'rules' }, g.rules.map(r => el('p', {}, r))),
      st ? el('p', { class: 'muted' }, `Сыграно: ${st.plays} · рекорд: ${st.best} XP`) : null,
      el('button', { class: 'btn primary big', onclick: () => playGame(g) }, 'Начать')));
}

function showRules(g) {
  modal.replaceChildren(el('div', { class: 'modal-box', onclick: e => e.stopPropagation() },
    el('h2', {}, g.icon + ' ' + g.name),
    g.rules.map(r => el('p', {}, r)),
    el('button', { class: 'btn primary', onclick: () => { modal.hidden = true; } }, 'Понятно')));
  modal.hidden = false;
}
modal.addEventListener('click', () => { modal.hidden = true; });

function playGame(g) {
  const timerEl = el('div');
  const scoreEl = el('div');
  const area = el('div');
  show(
    topbar(g.icon + ' ' + g.name, () => renderIntro(g),
      el('button', { class: 'icon-btn', onclick: () => showRules(g), 'aria-label': 'Инструкция' }, '?')),
    el('div', { class: 'hud' }, timerEl, scoreEl),
    area);
  g.start({
    area,
    setTimer: t => { timerEl.textContent = t; },
    setScore: t => { scoreEl.textContent = t; },
    finish: (xp, summary) => finishGame(g, xp, summary),
  });
}

function finishGame(g, xp, summary) {
  xp = Math.max(0, Math.round(xp));
  const before = rankIndex(state.xp);
  state.xp += xp;
  const st = state.games[g.id] || (state.games[g.id] = { plays: 0, best: 0 });
  st.plays++;
  const record = st.plays > 1 && xp > st.best;
  st.best = Math.max(st.best, xp);
  updateStreak();
  saveState();
  const after = rankIndex(state.xp);
  renderResult(g, xp, summary, record, after > before ? RANKS[after] : null);
}

function renderResult(g, xp, summary, record, newRank) {
  if (newRank) { sound.rankup(); buzz([80, 60, 80]); } else sound.finish();
  const next = GAMES[(GAMES.indexOf(g) + 1) % GAMES.length];
  show(
    topbar('Результат', renderHome),
    el('div', { class: 'result' },
      newRank ? el('div', { class: 'rankup' },
        el('div', { class: 'rankup-icon' }, newRank.icon),
        el('div', {}, 'Новое звание!'),
        el('div', { class: 'rank-name' }, newRank.name),
        el('div', {}, newRank.quote)) : null,
      el('div', { class: 'result-xp' }, '+' + xp + ' XP'),
      record ? el('div', { class: 'record' }, '🏆 Новый рекорд!') : null,
      el('p', {}, summary),
      rankCard(),
      el('div', { class: 'row' },
        el('button', { class: 'btn', onclick: renderHome }, 'В меню'),
        el('button', { class: 'btn', onclick: () => playGame(g) }, 'Ещё раз')),
      el('button', { class: 'btn primary big next-btn', onclick: () => renderIntro(next) },
        `Дальше: ${next.icon} ${next.name} →`)));
}

function renderRanks() {
  const cur = rankIndex(state.xp);
  let armed = false;
  const reset = el('button', { class: 'btn danger', onclick: () => {
    if (!armed) { armed = true; reset.textContent = 'Точно? Нажми ещё раз — всё обнулится'; return; }
    state = { xp: 0, games: {}, streak: { last: null, count: 0 }, sound: state.sound };
    saveState();
    renderHome();
  } }, 'Сбросить прогресс');
  show(
    topbar('Звания', renderHome),
    el('p', { class: 'muted' }, `У тебя ${state.xp} XP. Опыт даётся за каждую игру.`),
    RANKS.map((r, i) => el('div', { class: 'rank-row' + (i > cur ? ' locked' : '') + (i === cur ? ' current' : '') },
      el('div', { class: 'rank-row-icon' }, r.icon),
      el('div', {},
        el('div', { class: 'rank-row-name' }, `${i + 1}. ${r.name}`),
        el('div', { class: 'muted small' }, i <= cur ? r.quote : `откроется на ${r.xp} XP`)))),
    reset);
}

// ================= Запуск =================
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js');
}

renderHome();
