let board = [];
let selected = null;
let whiteTurn = true;
const chessboard = document.getElementById('chessboard');

// Initialize chess.js game
const game = new Chess();
function createBoard() {
    chessboard.innerHTML = '';
    board = fenToBoard(game.fen());  // ← important
    console.log("Current board:", board); // logs board to browser console
    selected = null;
    whiteTurn = true;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const square = document.createElement('div');
            square.classList.add('square', (r + c) % 2 === 0 ? 'white' : 'black');
            const piece = board[r][c];
            if (piece !== '') {
                const img = document.createElement('img');
                img.src = `pieces/${piece}.png`; // ensure these exist
                img.draggable = false;
                square.appendChild(img);
            }
            square.addEventListener('click', () => squareClick(r, c));
            chessboard.appendChild(square);
        }
    }
}





createBoard();  // your board setup

// ✅ Button actions go here, outside any function

// Reset game
document.getElementById('resetBtn').addEventListener('click', () => {
    game.reset();
    board = fenToBoard(game.fen());
    updateBoard();
    whiteTurn = true;
});

// Undo last move (twice if you want to undo both player + AI)
document.getElementById('undoBtn').addEventListener('click', () => {
    game.undo(); // undo player move
    game.undo(); // undo AI move (optional)
    board = fenToBoard(game.fen());
    updateBoard();
    whiteTurn = true; // ensure it's player's turn
});

// Placeholder online button
document.getElementById('onlineBtn').addEventListener('click', () => {
    alert("Play Online coming soon! 🚀");
});



async function squareClick(r, c) {
    const clickedPiece = board[r][c];

    // Deselect any previously selected square
    document.querySelectorAll('.square').forEach(sq => sq.classList.remove('selected'));

    if (selected) {
        const from = coordsToAlgebraic(selected.row, selected.col);
        const to = coordsToAlgebraic(r, c);

        const move = game.move({ from, to, promotion: 'q' }); // auto-queen promotion
        if (!move) {
            console.log("Illegal move attempted");
            selected = null;
            return;
        }

        // Update board to match game state
        board = fenToBoard(game.fen());
        updateBoard();
        logMoves();   // 👈 add this
        
        selected = null;
        whiteTurn = !whiteTurn;
        checkEndgame('white');

        if (!whiteTurn) {
            // Stockfish move
            try {
                const bestMove = await getStockfishMove(game.fen());
                game.move({ from: bestMove.slice(0, 2), to: bestMove.slice(2, 4), promotion: 'q' });
                board = fenToBoard(game.fen());
                updateBoard();
                logMoves();
                checkEndgame('black');  
                whiteTurn = true;
            } catch (err) {
                console.error("Error during Stockfish move:", err);
            }
        }
    } else {
        // Only select your own pieces
        if (clickedPiece && clickedPiece[0] === 'w') {
            selected = { row: r, col: c };
            // Highlight the selected square
            chessboard.children[r * 8 + c].classList.add('selected');
        }
    }
}


// Update board UI
function updateBoard() {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const square = chessboard.children[r * 8 + c];
            square.innerHTML = '';
            const piece = board[r][c];
            if (piece !== '') {
                const img = document.createElement('img');
                img.src = `pieces/${piece}.png`;
                img.draggable = false;
                square.appendChild(img);
            }
        }
    }
}
function checkEndgame(winnerColor) {
    if (game.game_over()) {
        if (game.in_checkmate()) {
            showEndgamePopup(`${winnerColor} won by checkmate!`);
        } else if (game.in_stalemate()) {
            showEndgamePopup("Draw by stalemate!");
        } else if (game.in_threefold_repetition()) {
            showEndgamePopup("Draw by threefold repetition!");
        } else if (game.insufficient_material()) {
            showEndgamePopup("Draw by insufficient material!");
        } else if (game.in_draw()) {
            showEndgamePopup("Draw!");
        }
    }
}

function showEndgamePopup(message) {
    const popup = document.getElementById('endgamePopup');
    const popupMessage = document.getElementById('popupMessage');
    popupMessage.textContent = message;
    popup.classList.remove('hidden');
}

// Close popup
document.getElementById('popupClose').addEventListener('click', () => {
    document.getElementById('endgamePopup').classList.add('hidden');
});

function logMoves() {
  const log = document.getElementById('moveLog');
  const moves = game.history(); // SAN moves from chess.js
  let html = "<h2>Moves</h2>";

  for (let i = 0; i < moves.length; i += 2) {
    const white = moves[i] || "";
    const black = moves[i + 1] || "";
    html += `<div class="moveRow"><span>${i / 2 + 1}.</span> ${white} ${black}</div>`;
  }

  log.innerHTML = html;
}

// Call backend Stockfish
async function getStockfishMove(fen) {
    console.log('Sending FEN to Stockfish:', fen);
    const response = await fetch('/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen })
    });
    const data = await response.json();
    console.log('Stockfish returned:', data);
    return data.bestmove;
}

// Helpers

function coordsToAlgebraic(row, col) {
    const file = String.fromCharCode('a'.charCodeAt(0) + col);
    const rank = 8 - row;
    return file + rank;
}

function fenToBoard(fen) {
    const rows = fen.split(' ')[0].split('/');
    return rows.map(row => {
        const arr = [];
        for (let char of row) {
            if (isNaN(char)) arr.push((char === char.toUpperCase() ? 'w' : 'b') + char.toLowerCase());
            else for (let i = 0; i < parseInt(char); i++) arr.push('');
        }
        return arr;
    });
}
