const EMOJIS = {};

const boardEl = document.getElementById('board');
const BOARD_SIZE = 5;
const STORAGE_KEY = 'community_bingo';

// Load or initialize game state
let gameData = JSON.parse(localStorage.getItem(STORAGE_KEY));
if (!gameData) {
	const seed = Math.floor(Math.random() * 1e9);
	gameData = { seed, filled: [] };
	localStorage.setItem(STORAGE_KEY, JSON.stringify(gameData));
}

// PRNG from seed
function mulberry32(seed) {
	return function () {
		let t = seed += 0x6D2B79F5;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}

const rand = mulberry32(gameData.seed);

// Generate shuffled board
const icons = [...EMOJIS].sort(() => rand() - 0.5);
icons.splice(12, 0, 'FREE'); // Add "FREE" in center

function renderBoard() {
	boardEl.innerHTML = '';
	for (let i = 0; i < 25; i++) {
		const square = document.createElement('div');
		square.className = 'square';
		square.dataset.id = i;
		square.textContent = icons[i];
		if (gameData.filled.includes(i) || icons[i] === 'FREE') {
			square.classList.add('filled');
		}
		boardEl.appendChild(square);
	}
}

function fillSquare(id) {
	id = parseInt(id);
	if (!gameData.filled.includes(id) && icons[id] !== 'FREE') {
		gameData.filled.push(id);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(gameData));
		renderBoard();
	}
}

// Handle query param (e.g. ?fill=7)
const params = new URLSearchParams(location.search);
const fillId = params.get('fill');
if (fillId !== null) fillSquare(fillId);

renderBoard();