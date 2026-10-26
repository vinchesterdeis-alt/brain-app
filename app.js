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
  cell: n => tone(NOTES[n], 0, 0.35, 0.07),
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

// ================= Игры =================
const COLORS = [
  { name: 'красный', css: '#ef4444' },
  { name: 'синий',   css: '#3b82f6' },
  { name: 'зелёный', css: '#22c55e' },
  { name: 'жёлтый',  css: '#eab308' },
];

const TOPICS = [
  'Почему пицца — лучшая еда в мире',
  'Как объяснить паркур бабушке',
  'Что бы ты сделал с миллионом рублей',
  'Самый странный сон в твоей жизни',
  'Почему коты однажды захватят мир',
  'Если бы ты был супергероем',
  'Как приготовить идеальное тесто',
  'Зачем человеку горы',
  'Лучший фильм детства',
  'Что важнее: талант или упорство',
  'Как уговорить друга пойти на тренировку',
  'Почему понедельник — день тяжёлый',
  'Если бы животные умели говорить',
  'Идеальный выходной',
  'Что бы ты сказал себе 10 лет назад',
  'Почему стоит учить программирование',
  'Самый смешной случай на работе',
  'Как пережить зомби-апокалипсис',
  'Почему голуби кивают при ходьбе',
  'Как продать снег зимой',
];

const WORDS = ['ананас', 'трамвай', 'космос', 'бабушка', 'носок', 'дракон', 'лифт', 'кактус',
  'самурай', 'пылесос', 'радуга', 'бутерброд', 'пингвин', 'метро', 'скрипка', 'вулкан',
  'утюг', 'робот', 'варенье', 'маяк'];

function makeSeries(level) {
  const idx = [0, 1, 2, 3, 4];
  const kinds = [
    () => { const a = rand(1, 20), d = rand(2, 9); return idx.map(i => a + d * i); },
    () => { const a = rand(30, 90), d = rand(2, 7); return idx.map(i => a - d * i); },
    () => { const a = rand(1, 5), r = rand(2, 3); return idx.map(i => a * r ** i); },
    () => { const a = rand(1, 10), d = rand(1, 4); const s = [a]; for (let i = 1; i < 5; i++) s.push(s[i - 1] + d * i); return s; },
    () => { const a = rand(10, 30), x = rand(4, 9), y = rand(1, x - 1); const s = [a]; for (let i = 1; i < 5; i++) s.push(s[i - 1] + (i % 2 ? x : -y)); return s; },
    () => { const o = rand(1, 6); return idx.map(i => (i + o) ** 2); },
    () => { const s = [rand(1, 5), rand(1, 5)]; while (s.length < 5) s.push(s[s.length - 1] + s[s.length - 2]); return s; },
  ];
  return pick(kinds.slice(0, Math.min(kinds.length, 2 + level)))();
}

const GAMES = [
  {
    id: 'schulte', skill: 'attention', icon: '🔢', name: 'Таблица Шульте',
    rules: [
      'На поле перемешаны числа от 1 до 25.',
      'Нажимай их по порядку как можно быстрее: 1, 2, 3…',
      'Ошибка — +2 секунды штрафа.',
      'Совет: смотри в центр таблицы и старайся видеть всё поле целиком, не бегая глазами.',
    ],
    start({ area, setTimer, setScore, finish }) {
      let next = 1, penalty = 0;
      const t0 = Date.now();
      const elapsed = () => (Date.now() - t0) / 1000 + penalty;
      every(() => setTimer('⏱ ' + elapsed().toFixed(1) + ' с'), 100);
      setScore('Найди: 1');
      const grid = el('div', { class: 'schulte' });
      shuffle([...Array(25)].map((_, i) => i + 1)).forEach(n => {
        const c = el('button', { class: 'cell', onclick: () => {
          if (n !== next) { penalty += 2; sound.wrong(); buzz(); flash(c, 'wrong'); return; }
          sound.right();
          flash(c, 'right');
          next++;
          if (next > 25) {
            const s = elapsed();
            finish(Math.min(150, Math.max(10, 170 - 3 * s)),
              `Время: ${s.toFixed(1)} с. Хороший результат — меньше 30 секунд.`);
          } else {
            setScore('Найди: ' + next);
          }
        } }, n);
        grid.append(c);
      });
      area.append(grid);
    },
  },
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
    id: 'series', skill: 'logic', icon: '📈', name: 'Продолжи ряд',
    rules: [
      'Показан ряд чисел, построенный по правилу.',
      'Найди правило и выбери следующее число.',
      'Правила бывают разные: прибавить, умножить, чередовать, сложить два предыдущих…',
      '60 секунд. Ошибка отнимает 3 секунды.',
    ],
    start(ctx) {
      runQuiz(ctx, {
        seconds: 60, penalty: 3,
        makeTask(level) {
          const s = makeSeries(level);
          return { text: s.slice(0, 4).join(', ') + ', ?', options: numberOptions(s[4]), answer: s[4] };
        },
        xp: st => Math.max(0, (st.right - st.wrong) * 8),
        summary: st => `Разгадано рядов: ${st.right}, ошибок: ${st.wrong}.`,
      });
    },
  },
  {
    id: 'sequence', skill: 'memory', icon: '💡', name: 'Повтори за мной',
    rules: [
      'Клетки загораются по очереди — запомни порядок.',
      'Когда появится «Твой ход», нажми клетки в том же порядке.',
      'Каждый раунд цепочка длиннее на одну клетку. Одна ошибка — конец игры.',
    ],
    start({ area, setTimer, setScore, finish }) {
      const grid = el('div', { class: 'sequence locked' });
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
    id: 'improv', skill: 'speech', icon: '🎤', name: 'Импровизация',
    rules: [
      'Выпадает случайная тема и три случайных слова.',
      'Говори вслух на эту тему 60 секунд без остановки.',
      'Вставь в речь все три слова, даже если они совсем не к месту.',
      'В конце честно оцени себя. Лучше записывать себя на диктофон и потом переслушивать.',
    ],
    start({ area, setTimer, setScore, finish }) {
      let topic, words, startedAt;
      const chips = () => el('div', { class: 'chips' }, words.map(w => el('span', { class: 'chip' }, w)));

      function prepare() {
        topic = pick(TOPICS);
        words = shuffle(WORDS).slice(0, 3);
        setTimer('Подготовка');
        setScore('');
        area.replaceChildren(
          el('div', { class: 'card' },
            el('div', { class: 'muted' }, 'Тема'),
            el('div', { class: 'topic' }, topic),
            el('div', { class: 'muted', style: 'margin-bottom:8px' }, 'Вставь в речь слова:'),
            chips()),
          el('div', { class: 'row' },
            el('button', { class: 'btn', onclick: prepare }, '🔄 Другая'),
            el('button', { class: 'btn primary', onclick: speak }, 'Говорю!')));
      }

      function speak() {
        startedAt = Date.now();
        const big = el('div', { class: 'big-timer' });
        area.replaceChildren(
          el('div', { class: 'card' }, el('div', { class: 'topic' }, topic), chips()),
          big,
          el('button', { class: 'btn big', onclick: rate }, 'Закончить раньше'));
        countdown(60, t => { big.textContent = t; setTimer('⏳ ' + t + ' с'); }, () => { sound.finish(); rate(); });
      }

      function rate() {
        stopTimers();
        const spoken = Math.min(60, Math.round((Date.now() - startedAt) / 1000));
        setTimer(`Говорил ${spoken} с`);
        const grade = (xp, text) => el('button', { class: 'btn', onclick: () =>
          finish(xp * spoken / 60, `Говорил ${spoken} с. Самооценка: ${text.toLowerCase()}.`) }, text);
        area.replaceChildren(
          el('h2', { style: 'text-align:center' }, 'Как прошло?'),
          el('div', { class: 'rate' },
            grade(15, 'Много запинался'),
            grade(30, 'Нормально, были паузы'),
            grade(50, 'Без пауз и все слова')));
      }

      prepare();
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
    ...SKILLS.map(skill => {
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
        el('button', { class: 'btn primary', onclick: () => playGame(g) }, 'Ещё раз'))));
}

function renderRanks() {
  const cur = rankIndex(state.xp);
  let armed = false;
  const reset = el('button', { class: 'btn danger', onclick: () => {
    if (!armed) { armed = true; reset.textContent = 'Точно? Нажми ещё раз — всё обнулится'; return; }
    state = { xp: 0, games: {}, streak: { last: null, count: 0 } };
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
