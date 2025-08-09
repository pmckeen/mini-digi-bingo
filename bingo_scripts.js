fetch('board_squares.json')
  .then(response => response.json())
  .then(EMOJIS => {
    const boardEl = document.getElementById('board');
    const BOARD_SIZE = 5;
    const CELLS = BOARD_SIZE * 5;
    const CENTER = Math.floor(CELLS / 2); // 12
    const STORAGE_KEY = 'community_bingo';

    let gameData = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!gameData) {
      const seed = Math.floor(Math.random() * 1e9);
      gameData = { seed, filled: [] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameData));
    }

    function mulberry32(seed) {
      return function () {
        let t = (seed += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const rand = mulberry32(gameData.seed);

    const sourceIndexMap = Array(CELLS).fill(null);
    const icons = Array(CELLS).fill('');

    const NEED = CELLS - 1; // one spot is FREE
    const src = Array.isArray(EMOJIS) && EMOJIS.length ? EMOJIS : ['❓'];

    function shuffleInPlace(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    if (src.length >= NEED) {
      const indices = shuffleInPlace([...src.keys()]).slice(0, NEED);
      let k = 0;
      for (let pos = 0; pos < CELLS; pos++) {
        if (pos === CENTER) continue;
        const sidx = indices[k++];
        sourceIndexMap[pos] = sidx;
        icons[pos] = src[sidx];
      }
    } else {
      for (let pos = 0; pos < CELLS; pos++) {
        if (pos === CENTER) continue;
        const sidx = Math.floor(rand() * src.length);
        sourceIndexMap[pos] = sidx;
        icons[pos] = src[sidx];
      }
    }

    icons[CENTER] = 'FREE';

    function renderBoard() {
      boardEl.innerHTML = '';
      for (let i = 0; i < CELLS; i++) {
        const el = document.createElement('div');
        el.className = 'square';
        el.dataset.pos = i;
        el.dataset.src = sourceIndexMap[i];
        el.textContent = icons[i];
        if (gameData.filled.includes(i) || icons[i] === 'FREE') {
          el.classList.add('filled');
        }
        boardEl.appendChild(el);
      }
    }

    function persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameData));
    }

    function fillByPosition(pos) {
      pos = Number(pos);
      if (!Number.isInteger(pos) || pos < 0 || pos >= CELLS) return;
      if (icons[pos] === 'FREE') return;
      if (!gameData.filled.includes(pos)) {
        gameData.filled.push(pos);
        persist();
      }
    }

    function fillBySourceIndex(sourceId) {
      const sid = Number(sourceId);
      if (!Number.isInteger(sid)) return;
      let changed = false;
      let found = false;
      for (let pos = 0; pos < CELLS; pos++) {
        if (pos === CENTER) continue;
        if (sourceIndexMap[pos] === sid) {
          found = true;
          if (!gameData.filled.includes(pos)) {
            gameData.filled.push(pos);
            changed = true;
          }
        }
      }
      if (!found) {
        alert(`No matching square for ID ${sid} on this board.`);
      }
      if (changed) persist();
    }

    const urlParams = new URLSearchParams(location.search);
    const fillParams = [];
    for (const [k, v] of urlParams.entries()) {
      if (k === 'fill' && v) {
        v.split(',').forEach((s) => fillParams.push(s.trim()));
      }
    }
    fillParams.forEach(fillBySourceIndex);

    renderBoard();
  });
