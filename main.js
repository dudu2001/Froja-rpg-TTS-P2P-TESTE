const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os   = require('os');

let janelaPrincipal;
let servidorHttp;

function criarJanela() {
    janelaPrincipal = new BrowserWindow({
        width: 1280,
        height: 720,
        title: 'FORJA RPG - Virtual Tabletop',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    janelaPrincipal.loadFile(path.join(__dirname, 'public', 'index.html'));
}

function obterIPDaMaquina() {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        for (const alias of interfaces[devName]) {
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
                return alias.address;
        }
    }
    return 'localhost';
}

ipcMain.on('solicitar-ligar-servidor', (event) => {
    if (servidorHttp) {
        event.reply('servidor-pronto', `http://${obterIPDaMaquina()}:3000`);
        return;
    }

    const express  = require('express');
    const cors     = require('cors');
    const multer   = require('multer');

    const servidorExpress = express();
    servidorExpress.use(cors()); // Libera o CORS para as rotas HTTP nativas do Express

    servidorHttp = require('http').createServer(servidorExpress);

    const io = require('socket.io')(servidorHttp, {
        cors: {
            origin: '*', // Libera conexões de rede de qualquer origem externa
            methods: ['GET', 'POST']
        },
        maxHttpBufferSize: 5e6 // Permite payloads estáveis para transferência de dados do Canvas
    });

    // ── Upload de mapas ──────────────────────────────────────────────────────
    const storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, path.join(__dirname, 'public', 'uploads')),
        filename:    (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
    });
    const upload = multer({ storage });

    servidorExpress.use(express.static(path.join(__dirname, 'public')));
    servidorExpress.post('/api/upload', upload.single('mapa'), (req, res) => {
        if (!req.file) return res.status(400).json({ error: 'Sem arquivo' });
        res.json({ url: `/uploads/${req.file.filename}` });
    });

    // ── Estado por sala ──────────────────────────────────────────────────────
    const salas = {};

    function getSala(salaId) {
        if (!salas[salaId]) salas[salaId] = new Map();
        return salas[salaId];
    }

    // ── Socket.io — Lógica das Salas ─────────────────────────────────────────
    io.on('connection', (socket) => {
        const ip = socket.handshake.address;
        console.log(`[FORJA] Conectado: ${socket.id} (${ip})`);

        let salaAtual = null;

        // -----------------------------------------------------------------
        // entrar_sala: Associa o cliente a uma sala específica
        // -----------------------------------------------------------------
        socket.on('entrar_sala', (salaId) => {
            salaAtual = salaId;
            socket.join(salaId);

            const sala = getSala(salaId);
            sala.set(socket.id, { nick: 'Anônimo', role: 'Jogador', socket });

            console.log(`[FORJA] ${socket.id} entrou na sala: ${salaId}`);
        });

        // -----------------------------------------------------------------
        // anunciar_nick: Regista o nome e papel do utilizador no painel
        // -----------------------------------------------------------------
        socket.on('anunciar_nick', ({ nick, role }) => {
            if (!salaAtual) return;
            const sala = getSala(salaAtual);

            const info = sala.get(socket.id) || {};
            info.nick = nick || 'Anônimo';
            info.role = role || 'Jogador';
            info.socket = socket;
            sala.set(socket.id, info);

            console.log(`[FORJA] Nick anunciado: ${nick} (${role}) em ${salaAtual}`);

            socket.to(salaAtual).emit('jogador_entrou', {
                socketId: socket.id,
                nick:     info.nick,
                role:     info.role
            });

            const listaAtual = [];
            sala.forEach((v, id) => {
                if (id !== socket.id)
                    listaAtual.push({ socketId: id, nick: v.nick, role: v.role });
            });
            socket.emit('lista_jogadores', listaAtual);
        });

        // -----------------------------------------------------------------
        // transmitir_dados: Sincronismo e retransmissão de tokens/desenhos
        // -----------------------------------------------------------------
        socket.on('transmitir_dados', (data) => {
            if (!salaAtual) return;

            if (data && data.type === 'request_sync') {
                socket.to(salaAtual).emit('solicitar_full_state', { fromSocketId: socket.id });
                return;
            }

            socket.to(salaAtual).emit('receber_dados', data);
        });

        // -----------------------------------------------------------------
        // enviar_para: Comunicação direta Mestre Ponto a Ponto → Jogador
        // -----------------------------------------------------------------
        socket.on('enviar_para', ({ targetId, data }) => {
            const targetSocket = io.sockets.sockets.get(targetId);
            if (targetSocket) {
                targetSocket.emit('mensagem_privada', data);
            } else {
                console.warn(`[FORJA] enviar_para: destino ${targetId} não encontrado`);
            }
        });

        // -----------------------------------------------------------------
        // solicitar_jogadores: Retorna a lista atual de utilizadores ativos
        // -----------------------------------------------------------------
        socket.on('solicitar_jogadores', () => {
            if (!salaAtual) return;
            const sala = getSala(salaAtual);
            const lista = [];
            sala.forEach((v, id) => {
                if (id !== socket.id) lista.push({ socketId: id, nick: v.nick, role: v.role });
            });
            socket.emit('lista_jogadores', lista);
        });

        // -----------------------------------------------------------------
        // disconnect: Remove o utilizador e limpa os registos da sala
        // -----------------------------------------------------------------
        socket.on('disconnect', () => {
            console.log(`[FORJA] Desconectado: ${socket.id}`);
            if (!salaAtual) return;

            const sala = getSala(salaAtual);
            const info = sala.get(socket.id);
            sala.delete(socket.id);

            socket.to(salaAtual).emit('jogador_saiu', {
                socketId: socket.id,
                nick:     info?.nick || 'Jogador'
            });
        });
    });

    // ── Subir Servidor com Túnel de Internet Automático (Tunnelmole) ───────────
    servidorHttp.listen(3000, '0.0.0.0', async () => {
        const meuIP = obterIPDaMaquina();
        let urlPublica = `http://${meuIP}:3000`; // URL local de contingência
        
        console.log(`[FORJA] Servidor local ativo em: http://localhost:3000`);

        try {
            // Importa o módulo estável do Tunnelmole
            const { tunnelmole } = require('tunnelmole');
            
            // Cria a ponte pública segura na porta 3000 de forma nativa no Node v24
            urlPublica = await tunnelmole({ port: 3000 });
            
            console.log(`[FORJA] INTERNET ATIVA! Link para enviar aos amigos: ${urlPublica}`);
        } catch (tunnelError) {
            console.log(`[FORJA] Falha ao criar túnel externo. Operando em rede local: ${urlPublica}`);
        }

        // Devolve a URL final gerada de volta para a interface do Electron
        event.reply('servidor-pronto', urlPublica);
    });
});

app.whenReady().then(criarJanela);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });