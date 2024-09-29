const express = require('express');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

let saldo = 100;
let bolasSorteadas = [];
let sorteioAtivo = false;
let jogadoresOnline = 0;
let cartelasVendidas = 0;
let vencedores = [];

function gerarVencedores() {
    return [
        { nome: 'João', premio: 500 },
        { nome: 'Maria', premio: 300 },
    ];
}

function iniciarSorteio() {
    if (!sorteioAtivo) {
        sorteioAtivo = true;
        bolasSorteadas = [];
        vencedores = gerarVencedores();  
        let totalBolas = 90;
        const intervalo = setInterval(() => {
            if (bolasSorteadas.length >= totalBolas) {
                clearInterval(intervalo);
                sorteioAtivo = false;
                io.emit('sorteio-encerrado', bolasSorteadas);
                io.emit('atualizar-vencedores', vencedores);  
            } else {
                let bola = Math.floor(Math.random() * totalBolas) + 1;
                while (bolasSorteadas.includes(bola)) {
                    bola = Math.floor(Math.random() * totalBolas) + 1;
                }
                bolasSorteadas.push(bola);
                io.emit('nova-bola', bola, bolasSorteadas.length);
            }
        }, 2000); 
    }
}

app.get('/', (req, res) => {
    const message = req.query.message || null;
    res.render('dashboard', { saldo, message });
});

app.post('/apostar', (req, res) => {
    const quantidade = parseInt(req.body.quantidade);

    if (isNaN(quantidade) || quantidade <= 0) {
        return res.redirect('/?message=Erro:+Por+favor,+insira+uma+quantidade+válida+de+cartelas');
    }

    cartelasVendidas += quantidade;
    io.emit('atualizar-cartelas-vendidas', cartelasVendidas);  

    res.redirect(`/?message=Você+comprou+${quantidade}+cartelas+com+sucesso!`);
});

io.on('connection', (socket) => {
    jogadoresOnline++;
    io.emit('atualizar-jogadores-online', jogadoresOnline);  

    if (!sorteioAtivo) {
        iniciarSorteio();
    } else {
        bolasSorteadas.forEach((bola, index) => {
            socket.emit('nova-bola', bola, index + 1);
        });
    }

    socket.on('disconnect', () => {
        jogadoresOnline--;
        io.emit('atualizar-jogadores-online', jogadoresOnline);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
