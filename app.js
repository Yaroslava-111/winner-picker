const MAX_POOL = 1000000;

const el = {
  btnVerifyLink: document.getElementById('btnVerifyLink'),
  setupView: document.getElementById('setupView'),
  drawView: document.getElementById('drawView'),
  tabs: Array.from(document.querySelectorAll('.tab')),
  rangeFields: document.getElementById('rangeFields'),
  countFields: document.getElementById('countFields'),
  fromInput: document.getElementById('fromInput'),
  toInput: document.getElementById('toInput'),
  countInput: document.getElementById('countInput'),
  formError: document.getElementById('formError'),
  setupForm: document.getElementById('setupForm'),
  poolLabel: document.getElementById('poolLabel'),
  poolLeft: document.getElementById('poolLeft'),
  wonCount: document.getElementById('wonCount'),
  drumNumber: document.getElementById('drumNumber'),
  drumMsg: document.getElementById('drumMsg'),
  btnDraw: document.getElementById('btnDraw'),
  btnReset: document.getElementById('btnReset'),
  btnChangePool: document.getElementById('btnChangePool'),
  resultBox: document.getElementById('resultBox'),
  lastWinner: document.getElementById('lastWinner'),
  seedText: document.getElementById('seedText'),
  btnCopySeed: document.getElementById('btnCopySeed'),
  btnCopyResult: document.getElementById('btnCopyResult'),
  btnVerifyNow: document.getElementById('btnVerifyNow'),
  historyBox: document.getElementById('historyBox'),
  historyList: document.getElementById('historyList'),
  verifyModal: document.getElementById('verifyModal'),
  btnCloseVerify: document.getElementById('btnCloseVerify'),
  verifyForm: document.getElementById('verifyForm'),
  verifySeed: document.getElementById('verifySeed'),
  verifyFrom: document.getElementById('verifyFrom'),
  verifyTo: document.getElementById('verifyTo'),
  verifyWinners: document.getElementById('verifyWinners'),
  verifyResult: document.getElementById('verifyResult')
};

let mode = 'range';

const state = {
  from: 1,
  to: 100,
  pool: [],
  winners: [],
  seed: '',
  prizeNo: 1
};

el.tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    mode = tab.dataset.mode;
    el.tabs.forEach((t) => t.classList.toggle('is-active', t === tab));
    el.rangeFields.hidden = mode !== 'range';
    el.countFields.hidden = mode !== 'count';
    hideError();
  });
});

el.setupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  let from, to;
  if (mode === 'range') {
    from = parseInt(el.fromInput.value, 10);
    to = parseInt(el.toInput.value, 10);
  } else {
    const n = parseInt(el.countInput.value, 10);
    from = 1;
    to = n;
  }
  const err = validateRange(from, to);
  if (err) {
    showError(err);
    return;
  }
  startSession(from, to, true);
});

function validateRange(from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    return 'Введи целые числа.';
  }
  if (from < 1) return 'Номера участников начинаются с 1.';
  if (to < from) return 'Конец диапазона меньше начала — проверь значения.';
  if (to - from + 1 > MAX_POOL) return 'Слишком много участников. Максимум ' + MAX_POOL + ' номеров.';
  return null;
}

function startSession(from, to, hideSetup) {
  state.from = from;
  state.to = to;
  state.seed = randomHex(32);
  state.pool = makeRange(from, to);
  state.winners = [];
  state.prizeNo = 1;
  el.poolLabel.textContent = from === 1 ? '1 – ' + to : from + ' – ' + to;
  el.poolLeft.textContent = String(state.pool.length);
  el.wonCount.textContent = '0';
  el.drumNumber.textContent = '?';
  el.drumNumber.classList.remove('winner');
  el.drumMsg.textContent = 'Нажми «Разыграть приз»';
  el.btnDraw.disabled = false;
  el.btnDraw.textContent = 'Разыграть приз';
  el.resultBox.hidden = true;
  el.historyBox.hidden = true;
  el.historyList.textContent = '';
  el.btnVerifyLink.hidden = true;
  if (hideSetup) {
    el.setupView.hidden = true;
    el.drawView.hidden = false;
  }
}

el.btnDraw.addEventListener('click', async () => {
  if (!state.pool.length || el.btnDraw.disabled) return;
  el.btnDraw.disabled = true;
  const winner = await computeNextWinner();
  await animateTo(winner);
  el.drawNumber = winner;
  el.lastWinner.textContent = String(winner);
  el.poolLeft.textContent = String(state.pool.length);
  el.wonCount.textContent = String(state.winners.length);
  el.resultBox.hidden = false;
  el.seedText.textContent = state.seed;
  el.btnVerifyLink.hidden = false;
  el.historyBox.hidden = false;
  const chip = document.createElement('span');
  chip.className = 'history-chip';
  chip.textContent = '№' + winner;
  el.historyList.appendChild(chip);
  el.drumMsg.textContent = state.pool.length ? 'Можно разыграть ещё' : 'Все призы разыграны!';
  if (!state.pool.length) {
    el.btnDraw.textContent = 'Все призы разыграны';
  } else {
    el.btnDraw.disabled = false;
  }
});

el.btnReset.addEventListener('click', () => {
  startSession(state.from, state.to, false);
});

el.btnChangePool.addEventListener('click', () => {
  hideError();
  el.resetDrum();
  el.drawView.hidden = true;
  el.setupView.hidden = false;
});

el.resetDrum = function () {
  el.drumNumber.textContent = '?';
  el.drumNumber.classList.remove('winner');
  el.drumMsg.textContent = 'Нажми «Разыграть приз»';
  el.resultBox.hidden = true;
  el.historyBox.hidden = true;
  el.btnVerifyLink.hidden = true;
};

function makeRange(from, to) {
  const arr = new Array(to - from + 1);
  for (let i = 0; i < arr.length; i++) arr[i] = from + i;
  return arr;
}

async function computeNextWinner() {
  const idx = await randomIndex(state.seed, state.prizeNo, state.pool.length);
  const winner = state.pool[idx];
  state.pool.splice(idx, 1);
  state.winners.push(winner);
  state.prizeNo++;
  return winner;
}

function animateTo(winner) {
  return new Promise((resolve) => {
    const target = winner;
    const start = performance.now();
    const duration = 2200;
    let lastFrame = 0;
    el.drumNumber.classList.remove('winner');
    el.drumMsg.textContent = 'Определяем победителя…';
    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      const interval = 18 + eased * 170;
      if (now - lastFrame > interval) {
        lastFrame = now;
        if (t >= 1) {
          el.drumNumber.textContent = String(target);
          el.drumNumber.classList.add('winner');
          el.drumMsg.textContent = 'Победитель!';
          resolve();
          return;
        }
        el.drumNumber.textContent = String(visualRand(state.from, state.to));
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

function visualRand(a, b) {
  return a + Math.floor(Math.random() * (b - a + 1));
}

function randomHex(byteCount) {
  const arr = new Uint8Array(byteCount);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

const useSubtle = !!globalThis.crypto && !!crypto.subtle && typeof crypto.subtle.digest === 'function';

async function sha256Hex(str) {
  if (useSubtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return sha256Fallback(str);
}

async function randomIndex(seedHex, drawId, modulus) {
  const digest = await sha256Hex(seedHex + ':' + drawId);
  const MOD = BigInt(modulus);
  const FLAGS = 1n << 64n;
  const limit = FLAGS - (FLAGS % MOD);
  for (let off = 0; off < 64; off += 8) {
    let u = 0n;
    for (let i = 0; i < 8; i++) {
      u = (u << 8n) | BigInt(parseInt(digest.slice(off * 2 + i * 2, off * 2 + i * 2 + 2), 16));
    }
    if (u < limit) return Number(u % MOD);
  }
  return 0;
}

function sha256Fallback(input) {
  function rotr(v, b) { return (v >>> b) | (v << (32 - b)); }
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  const bytes = [];
  const text = unescape(encodeURIComponent(input));
  for (let i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i));
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const hi = Math.floor(bitLen / 0x100000000);
  const lo = bitLen >>> 0;
  bytes.push(
    (hi >>> 24) & 0xff, (hi >>> 16) & 0xff, (hi >>> 8) & 0xff, hi & 0xff,
    (lo >>> 24) & 0xff, (lo >>> 16) & 0xff, (lo >>> 8) & 0xff, lo & 0xff
  );
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Array(64);
  for (let i = 0; i < bytes.length; i += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = (bytes[i + t * 4] << 24) | (bytes[i + t * 4 + 1] << 16) | (bytes[i + t * 4 + 2] << 8) | bytes[i + t * 4 + 3];
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  function hex(x) { return ('00000000' + x.toString(16)).slice(-8); }
  return hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4) + hex(h5) + hex(h6) + hex(h7);
}

function showError(msg) {
  el.formError.textContent = msg;
  el.formError.hidden = false;
}

function hideError() {
  el.formError.hidden = true;
}

function verifyUrl() {
  const p = new URLSearchParams();
  p.set('seed', state.seed);
  p.set('from', String(state.from));
  p.set('to', String(state.to));
  p.set('winners', state.winners.join(','));
  return location.href.split('?')[0] + '?' + p.toString();
}

function resultText() {
  const winner = state.winners[state.winners.length - 1];
  return 'Победитель розыгрыша от «ПромоСтарт» — участник №' + winner +
    '\n\nПроверка честности: ' + verifyUrl();
}

async function copyText(text, btn, doneText) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    if (btn) {
      const original = btn.textContent;
      btn.textContent = doneText || 'Скопировано';
      setTimeout(() => { btn.textContent = original; }, 1600);
    }
  } catch (err) {
    if (btn) btn.textContent = 'Ошибка копирования';
  }
}

el.btnCopySeed.addEventListener('click', () => copyText(state.seed, el.btnCopySeed));
el.btnCopyResult.addEventListener('click', () => copyText(resultText(), el.btnCopyResult));

function showVerifyModal() {
  el.verifyModal.hidden = false;
}

function hideVerifyModal() {
  el.verifyModal.hidden = true;
}

el.btnVerifyNow.addEventListener('click', () => {
  el.verifySeed.value = state.seed;
  el.verifyFrom.value = String(state.from);
  el.verifyTo.value = String(state.to);
  el.verifyWinners.value = state.winners.join(', ');
  el.verifyResult.hidden = true;
  showVerifyModal();
});

el.btnVerifyLink.addEventListener('click', () => {
  el.verifySeed.value = state.seed;
  el.verifyFrom.value = String(state.from);
  el.verifyTo.value = String(state.to);
  el.verifyWinners.value = state.winners.join(', ');
  el.verifyResult.hidden = true;
  showVerifyModal();
});

el.btnCloseVerify.addEventListener('click', hideVerifyModal);
el.verifyModal.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) hideVerifyModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !el.verifyModal.hidden) hideVerifyModal();
});

el.verifyForm.addEventListener('submit', (e) => {
  e.preventDefault();
  runVerification();
});

function renderVerifyResult(lines, ok) {
  el.verifyResult.className = 'verify-result ' + (ok ? 'ok' : 'fail');
  el.verifyResult.textContent = lines.join(' ');
  el.verifyResult.hidden = false;
}

async function runVerification() {
  const seed = el.verifySeed.value.trim();
  const from = parseInt(el.verifyFrom.value, 10);
  const to = parseInt(el.verifyTo.value, 10);
  const winners = el.verifyWinners.value
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => parseInt(s, 10));
  el.verifyResult.hidden = true;
  if (!seed || !Number.isInteger(from) || !Number.isInteger(to) || !winners.length || winners.some((n) => !Number.isInteger(n))) {
    el.verifyResult.className = 'verify-result neutral';
    el.verifyResult.textContent = 'Заполни все поля: seed, диапазон и хотя бы одного победителя.';
    el.verifyResult.hidden = false;
    return;
  }
  if (from < 1 || to < from) {
    el.verifyResult.className = 'verify-result neutral';
    el.verifyResult.textContent = 'Диапазон указан неверно.';
    el.verifyResult.hidden = false;
    return;
  }
  if (winners.length > to - from + 1) {
    el.verifyResult.className = 'verify-result neutral';
    el.verifyResult.textContent = 'Победителей больше, чем участников.';
    el.verifyResult.hidden = false;
    return;
  }
  const pool = makeRange(from, to);
  const report = [];
  let allOk = true;
  for (let k = 0; k < winners.length; k++) {
    const idx = await randomIndex(seed, k + 1, pool.length);
    const expected = pool[idx];
    pool.splice(idx, 1);
    const ok = expected === winners[k];
    if (!ok) allOk = false;
    report.push((k + 1) + '-й приз → №' + winners[k] + ' (по seed: №' + expected + ')' + (ok ? ' — совпадает' : ' — НЕ совпадает'));
  }
  renderVerifyResult([allOk ? '✅ Результат подтверждён.' : '❌ Результат не подтверждён.', report.join('; ')], allOk);
}

(function initFromUrl() {
  const params = new URLSearchParams(location.search);
  const seed = params.get('seed');
  const from = params.get('from');
  const to = params.get('to');
  const winners = params.get('winners');
  if (seed && from && to && winners) {
    el.verifySeed.value = seed;
    el.verifyFrom.value = from;
    el.verifyTo.value = to;
    el.verifyWinners.value = winners;
    showVerifyModal();
    runVerification();
  }
})();

if (!globalThis.crypto || typeof crypto.getRandomValues !== 'function') {
  el.setupView.hidden = true;
  el.drawView.hidden = false;
  el.poolLabel.textContent = '—';
  el.drumNumber.textContent = '!';
  el.drumMsg.textContent = 'Браузер слишком старый — нужен современный Chrome, Firefox или Safari.';
  el.btnDraw.disabled = true;
}

document.querySelectorAll('input[type="number"]').forEach((input) => {
  const wrap = document.createElement('div');
  wrap.className = 'number';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);

  const up = document.createElement('button');
  up.type = 'button';
  up.className = 'step-btn step-up';
  up.setAttribute('aria-label', 'Увеличить');
  up.tabIndex = -1;

  const down = document.createElement('button');
  down.type = 'button';
  down.className = 'step-btn step-down';
  down.setAttribute('aria-label', 'Уменьшить');
  down.tabIndex = -1;

  wrap.appendChild(up);
  wrap.appendChild(down);

  function step(delta) {
    const min = input.min === '' ? -Infinity : parseInt(input.min, 10);
    const max = input.max === '' ? Infinity : parseInt(input.max, 10);
    let value = parseInt(input.value, 10);
    if (!Number.isFinite(value)) value = Number.isFinite(min) && min > 0 ? min : 0;
    let next = value + delta;
    if (Number.isFinite(min)) next = Math.max(min, next);
    if (Number.isFinite(max)) next = Math.min(max, next);
    input.value = String(next);
  }

  up.addEventListener('click', () => step(1));
  down.addEventListener('click', () => step(-1));
});