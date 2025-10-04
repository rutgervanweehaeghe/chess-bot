const express = require('express');
const { spawn } = require('child_process');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;

app.use(express.static('.'));
app.use(bodyParser.json());

app.post('/move', (req, res) => {
    const fen = req.body.fen;
    console.log("Received FEN from client:", fen);

    const stockfish = spawn('./stockfish/stockfish.exe');

    let bestMoveSent = false;

    stockfish.stdout.on('data', (data) => {
        const output = data.toString().trim();
        console.log("Stockfish output:", output);

        const lines = output.split('\n');
        for (let line of lines) {
            line = line.trim();
            if (line.startsWith('bestmove') && !bestMoveSent) {
                const tokens = line.split(' ');
                const bestmove = tokens[1];
                console.log("Best move found:", bestmove);
                bestMoveSent = true;
                res.json({ bestmove });
                stockfish.kill();
                break;
            }
        }
    });

    stockfish.stderr.on('data', (data) => {
        console.error("Stockfish error:", data.toString());
    });

    stockfish.on('exit', (code) => {
        console.log(`Stockfish exited with code ${code}`);
    });

    stockfish.stdin.write('uci\n');
    stockfish.stdin.write(`position fen ${fen}\n`);
    stockfish.stdin.write('go depth 15\n');

    // Safety: timeout in case Stockfish hangs
    setTimeout(() => {
        if (!bestMoveSent) {
            console.log("Stockfish timeout, killing process");
            res.status(500).json({ error: "Stockfish timeout" });
            stockfish.kill();
        }
    }, 10000); // 10 seconds
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
