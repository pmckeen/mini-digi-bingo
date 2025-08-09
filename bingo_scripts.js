fetch('board_squares.json')
  .then(response => response.json())
  .then(EMOJIS => {
    const boardEl = document.getElementById('board');
    const BOARD_SIZE = 5;
    const CELLS = BOARD_SIZE * 5;
    const CENTER = Math.floor(CELLS / 2); // 12
    const STORAGE_KEY = 'community_bingo';

    // --- Load/save state ---
    let gameData = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!gameData) {
      const seed = Math.floor(Math.random() * 1e9);
      gameData = { seed, filled: [] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameData));
    }

    // --- PRNG from seed (deterministic) ---
    function mulberry32(seed) {
      return function () {
        let t = (seed += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const rand = mulberry32(gameData.seed);

    // --- Build the board from the source array using the seeded RNG ---
    // We keep a mapping from board position -> source index in EMOJIS
    const sourceIndexMap = Array(CELLS).fill(null);
    const icons = Array(CELLS).fill('');

    const NEED = CELLS - 1; // one spot is FREE
    const src = Array.isArray(EMOJIS) && EMOJIS.length ? EMOJIS : ['❓'];

    // Fisher-Yates shuffle helper using our PRNG
    function shuffleInPlace(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    if (src.length >= NEED) {
      // Choose 24 distinct items
      const indices = shuffleInPlace([...src.keys()]).slice(0, NEED);
      let k = 0;
      for (let pos = 0; pos < CELLS; pos++) {
        if (pos === CENTER) continue;
        const sidx = indices[k++];
        sourceIndexMap[pos] = sidx;
        icons[pos] = src[sidx];
      }
    } else {
      // Not enough items: sample with replacement to fill the board
      for (let pos = 0; pos < CELLS; pos++) {
        if (pos === CENTER) continue;
        const sidx = Math.floor(rand() * src.length);
        sourceIndexMap[pos] = sidx;
        icons[pos] = src[sidx];
      }
    }

    // Center FREE space
    icons[CENTER] = 'FREE';

    // --- Rendering ---
    function renderBoard() {
      boardEl.innerHTML = '';
      for (let i = 0; i < CELLS; i++) {
        const el = document.createElement('div');
        el.className = 'square';
        el.dataset.pos = i; // board position
        el.dataset.src = sourceIndexMap[i]; // original source index (may be null)
        el.textContent = icons[i];
        if (gameData.filled.includes(i) || icons[i] === 'FREE') {
          el.classList.add('filled');
        }
        boardEl.appendChild(el);
      }
    }

    // --- Fill helpers ---
    function persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameData));
    }

    // Fill by board position (legacy/onclick if you add it)
    function fillByPosition(pos) {
      pos = Number(pos);
      if (!Number.isInteger(pos) || pos < 0 || pos >= CELLS) return;
      if (icons[pos] === 'FREE') return;
      if (!gameData.filled.includes(pos)) {
        gameData.filled.push(pos);
        persist();
      }
    }

    // Fill every cell whose source index equals the given ID from the JSON array
    function fillBySourceIndex(sourceId) {
      const sid = Number(sourceId);
      if (!Number.isInteger(sid)) return;
      let changed = false;
      for (let pos = 0; pos < CELLS; pos++) {
        if (pos === CENTER) continue;
        if (sourceIndexMap[pos] === sid && !gameData.filled.includes(pos)) {
          gameData.filled.push(pos);
          changed = true;
        }
      }
      if (changed) persist();
    }

    // --- Query param handling ---
    // Now `fill` refers to the *source index* in board_squares.json, not the randomized board position.
    // Supports multiple: ?fill=3 or ?fill=3,7,9 or repeated params ...&fill=3&fill=7
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
