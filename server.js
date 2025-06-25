require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env

const express = require('express');
const mysql = require('mysql2/promise'); // Usamos a versão com 'promise' para async/await
const cors = require('cors'); // Middleware para permitir CORS (Cross-Origin Resource Sharing)
const bcrypt = require('bcrypt'); // Para criptografia de senhas
const jwt = require('jsonwebtoken'); // Para autenticação JWT   


const app = express();
const port = process.env.PORT || 3000; // Porta que seu back-end vai escutar (do .env ou 3000)

// Middleware para permitir CORS (Cross-Origin Resource Sharing)
// Essencial para que seu front-end possa se comunicar com este back-end
app.use(cors());

// Middleware para parsear JSON no corpo das requisições
app.use(express.json());



// Middleware para verificar o JWT (Autenticação)
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'Token de autenticação ausente.' });
    }

    console.log('JWT_SECRET sendo usado para verificar:', process.env.JWT_SECRET); // <-- ADICIONE ESTA LINHA TEMPORARIAMENTE

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Erro de verificação do JWT:', err); // <-- ADICIONE ESTA LINHA TAMBÉM
            return res.status(403).json({ message: 'Token de autenticação inválido ou expirado.' });
        }
        req.user = user;
        next();
    });
}

// Middleware para verificar o papel do usuário (Autorização)
// Ex: authorizeRole(['super_admin']) ou authorizeRole(['viewer', 'super_admin'])
function authorizeRole(roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para esta ação.' });
        }
        next(); // Prossegue se o usuário tiver o papel necessário
    };
}


// --- Configuração do Banco de Dados MySQL ---
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'guia_ferramentas_db'
};

let connection; // Variável para armazenar a conexão com o banco de dados

async function connectToDatabase() {
    try {
        // Conectar inicialmente sem especificar o banco de dados para criar ele se não existir
        // Isso é útil se o banco de dados ainda não foi criado manualmente
        connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });
        console.log('Conectado ao servidor MySQL!');

        // Tentar criar o banco de dados se não existir
        await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        console.log(`Banco de dados '${dbConfig.database}' verificado/criado.`);

        // Fechar a conexão inicial e abrir uma nova já no banco de dados específico
        await connection.end(); // Fechar a conexão que não está conectada a um DB específico
        connection = await mysql.createConnection(dbConfig); // Abrir nova conexão já com o DB
        console.log(`Conectado ao banco de dados '${dbConfig.database}'.`);

        // Criar a tabela 'ferramentas' se não existir
        const createFerramentasTableSql = `
            CREATE TABLE IF NOT EXISTS ferramentas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                descricao TEXT NOT NULL,
                url_principal VARCHAR(2048) NOT NULL,
                tipo VARCHAR(100) NOT NULL,
                plataforma_associada VARCHAR(100),
                status_uso VARCHAR(50),
                tags JSON,
                link_download_windows VARCHAR(2048),
                link_download_linux VARCHAR(2048),
                necessita_download BOOLEAN NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await connection.execute(createFerramentasTableSql);
        console.log('Tabela "ferramentas" verificada/criada.');

        // Criar a tabela 'users' se não existir
        const createUsersTableSql = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'viewer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await connection.execute(createUsersTableSql);
        console.log('Tabela "users" verificada/criada.');

    } catch (error) {
        console.error('Erro ao conectar ou inicializar o banco de dados:', error);
        // Em um ambiente de produção, você pode querer sair do processo ou tentar reconectar
        process.exit(1); // Sai do aplicativo se não conseguir conectar ao DB
    }
}

// Chamar a função para conectar ao banco de dados ao iniciar o servidor
connectToDatabase();

// --- Rotas da API (continuam vazias por enquanto, adicionaremos a autenticação primeiro) ---

// Rota de teste simples
app.get('/', (req, res) => {
    res.send('API Guia de Ferramentas está funcionando!');
});



// --- Rotas de Autenticação ---

// --- Rota para Login de Usuários ---
app.post('/api/auth/login', async (req, res) => {
    // ALTERADO: Agora espera 'email' em vez de 'username'
    const { email, password } = req.body;

    // Validação básica de entrada
    if (!email || !password) { 
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' }); 
    }

    try {
        const db = req.app.locals.dbConnection(); // Obtém a conexão com o banco de dados

        const [users] = await db.execute(
            'SELECT id, username, email, password, role FROM users WHERE email = ?',
            [email]
        );

        const user = users[0];

        // Verificar se o usuário existe
        if (!user) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // Comparar a senha fornecida com a senha hasheada no banco de dados
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // Se as credenciais estiverem corretas, gerar um JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, role: user.role }, // Adicionado email ao payload
            process.env.JWT_SECRET, // Sua chave secreta do .env
            { expiresIn: '1h' } // Token expira em 1 hora
        );

        // Retornar o token (e talvez informações básicas do usuário, exceto a senha)
        res.status(200).json({
            message: 'Login realizado com sucesso!',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao fazer login.' });
    }
});



// Rota para Registro de Usuários
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Validação básica de entrada
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Todos os campos (username, email, password) são obrigatórios.' });
    }

    try {
        const db = req.app.locals.dbConnection(); // Obtém a conexão com o banco de dados

        // Verificar se o usuário ou e-mail já existem
        const [existingUser] = await db.execute(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({ message: 'Nome de usuário ou e-mail já cadastrado.' });
        }

        // Hash da senha
        const saltRounds = 10; // Custo do hash (quanto maior, mais seguro, mas mais lento)
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Determinar o papel do usuário.
        // Para este momento, vamos assumir que o primeiro usuário criado é o super_admin
        // ou que todos os usuários criados por esta rota são 'viewer' por padrão.
        // Pelo que discutimos, esta rota será para usuários 'viewer'.
        // A criação do Super Admin pode ser feita manualmente ou por um script à parte.
        const userRole = 'viewer'; // Valor padrão para usuários cadastrados via esta rota

        // Inserir o novo usuário no banco de dados
        await db.execute(
            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, userRole]
        );

        res.status(201).json({ message: 'Usuário registrado com sucesso!', role: userRole });

    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao registrar usuário.' });
    }
});


// ... (código existente, incluindo as rotas de autenticação acima)

// --- Rotas da API para Ferramentas ---

// Rota para LISTAR todas as ferramentas (requer autenticação - qualquer role pode ver)
app.get('/api/ferramentas', authenticateToken, async (req, res) => {
    try {
        const db = req.app.locals.dbConnection();
        const [rows] = await db.execute('SELECT * FROM ferramentas');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Erro ao listar ferramentas:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao listar ferramentas.' });
    }
});

// Rota para OBTER uma ferramenta por ID (requer autenticação - qualquer role pode ver)
app.get('/api/ferramentas/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const db = req.app.locals.dbConnection();
        const [rows] = await db.execute('SELECT * FROM ferramentas WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Ferramenta não encontrada.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Erro ao obter ferramenta por ID:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao obter ferramenta.' });
    }
});

// Rota para CRIAR uma nova ferramenta (requer autenticação E role 'super_admin')
app.post('/api/ferramentas', authenticateToken, authorizeRole(['super_admin']), async (req, res) => {
    const {
        nome,
        descricao,
        url_principal,
        tipo,
        plataforma_associada,
        status_uso,
        tags,
        link_download_windows,
        link_download_linux,
        necessita_download
    } = req.body;

    // Validação básica
    if (!nome || !descricao || !url_principal || !tipo || necessita_download === undefined) {
        return res.status(400).json({ message: 'Campos essenciais (nome, descricao, url_principal, tipo, necessita_download) são obrigatórios.' });
    }

    try {
        const db = req.app.locals.dbConnection();
        const [result] = await db.execute(
            `INSERT INTO ferramentas (nome, descricao, url_principal, tipo, plataforma_associada, status_uso, tags, link_download_windows, link_download_linux, necessita_download) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nome,
                descricao,
                url_principal,
                tipo,
                plataforma_associada,
                status_uso,
                tags ? JSON.stringify(tags) : null, // Tags como JSON
                link_download_windows,
                link_download_linux,
                necessita_download
            ]
        );

        res.status(201).json({ message: 'Ferramenta criada com sucesso!', id: result.insertId });

    } catch (error) {
        console.error('Erro ao criar ferramenta:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao criar ferramenta.' });
    }
});

// Rota para ATUALIZAR uma ferramenta por ID (requer autenticação E role 'super_admin')
app.put('/api/ferramentas/:id', authenticateToken, authorizeRole(['super_admin']), async (req, res) => {
    const { id } = req.params;
    const {
        nome,
        descricao,
        url_principal,
        tipo,
        plataforma_associada,
        status_uso,
        tags,
        link_download_windows,
        link_download_linux,
        necessita_download
    } = req.body;

    // Validação básica (pelo menos um campo para atualizar)
    if (!nome && !descricao && !url_principal && !tipo && !plataforma_associada && !status_uso && !tags && !link_download_windows && !link_download_linux && necessita_download === undefined) {
        return res.status(400).json({ message: 'Nenhum campo fornecido para atualização.' });
    }

    const fields = [];
    const values = [];

    if (nome !== undefined) { fields.push('nome = ?'); values.push(nome); }
    if (descricao !== undefined) { fields.push('descricao = ?'); values.push(descricao); }
    if (url_principal !== undefined) { fields.push('url_principal = ?'); values.push(url_principal); }
    if (tipo !== undefined) { fields.push('tipo = ?'); values.push(tipo); }
    if (plataforma_associada !== undefined) { fields.push('plataforma_associada = ?'); values.push(plataforma_associada); }
    if (status_uso !== undefined) { fields.push('status_uso = ?'); values.push(status_uso); }
    if (tags !== undefined) { fields.push('tags = ?'); values.push(tags ? JSON.stringify(tags) : null); }
    if (link_download_windows !== undefined) { fields.push('link_download_windows = ?'); values.push(link_download_windows); }
    if (link_download_linux !== undefined) { fields.push('link_download_linux = ?'); values.push(link_download_linux); }
    if (necessita_download !== undefined) { fields.push('necessita_download = ?'); values.push(necessita_download); }


    if (fields.length === 0) {
        return res.status(400).json({ message: 'Nenhum campo válido para atualização foi fornecido.' });
    }

    values.push(id); // Adiciona o ID no final para a cláusula WHERE

    try {
        const db = req.app.locals.dbConnection();
        const [result] = await db.execute(
            `UPDATE ferramentas SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Ferramenta não encontrada ou nenhum dado alterado.' });
        }

        res.status(200).json({ message: 'Ferramenta atualizada com sucesso.' });

    } catch (error) {
        console.error('Erro ao atualizar ferramenta:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao atualizar ferramenta.' });
    }
});

// Rota para DELETAR uma ferramenta por ID (requer autenticação E role 'super_admin')
app.delete('/api/ferramentas/:id', authenticateToken, authorizeRole(['super_admin']), async (req, res) => {
    const { id } = req.params;
    try {
        const db = req.app.locals.dbConnection();
        const [result] = await db.execute('DELETE FROM ferramentas WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Ferramenta não encontrada.' });
        }

        res.status(200).json({ message: 'Ferramenta deletada com sucesso.' });

    } catch (error) {
        console.error('Erro ao deletar ferramenta:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao deletar ferramenta.' });
    }
});


// --- Exportar a conexão para que outras rotas possam usá-la ---
app.locals.dbConnection = () => connection; // Acessível via req.app.locals.dbConnection()

// Iniciar o servidor Express
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log('Aguardando requisições...');
});