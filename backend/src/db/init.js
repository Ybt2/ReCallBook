const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
};

const DB_NAME = process.env.DB_NAME || 'recallbook';

// Criamos o pool de conexões para ser usado nas rotas da API
const pool = mysql.createPool({
    ...dbConfig,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

async function initDB() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
        await connection.query(`USE \`${DB_NAME}\`;`);
        console.log(`✅ MySQL: Database '${DB_NAME}' garantida.`);

        const queries = [
            `CREATE TABLE IF NOT EXISTS Utilizadores (
                ID INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(100) UNIQUE NOT NULL,
                username VARCHAR(30) UNIQUE NOT NULL,
                password TEXT NOT NULL,
                accessed_at TIMESTAMP NULL,
                deleted_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
                LOGS TEXT NULL
            )`,
            `CREATE TABLE IF NOT EXISTS NoteBooks (
                ID INT AUTO_INCREMENT PRIMARY KEY,
                utilizadores_ID INT NOT NULL,
                titulo VARCHAR(30) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
                LOGS TEXT NULL,
                FOREIGN KEY (utilizadores_ID) REFERENCES Utilizadores(ID) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS Fontes (
                ID VARCHAR(36) PRIMARY KEY,
                notebooks_ID INT NOT NULL,
                tipo VARCHAR(50),
                estado VARCHAR(70) DEFAULT 'pendente',
                titulo VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
                LOGS TEXT NULL,
                FOREIGN KEY (notebooks_ID) REFERENCES NoteBooks(ID) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS Mensagens (
                ID INT AUTO_INCREMENT PRIMARY KEY,
                notebooks_ID INT NOT NULL,
                role ENUM('utilizador', 'assistant') NOT NULL,
                conteudo TEXT NOT NULL,
                modelo_ai VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
                LOGS TEXT NULL,
                tempo_processamento TIME,
                num_tokens INT,
                FOREIGN KEY (notebooks_ID) REFERENCES NoteBooks(ID) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS Notebook_assets (
                ID INT AUTO_INCREMENT PRIMARY KEY,
                notebook_ID INT NOT NULL,
                asset_type VARCHAR(50),
                data JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                LOGS TEXT NULL,
                FOREIGN KEY (notebook_ID) REFERENCES NoteBooks(ID) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS Mensagens_DocumentChunks (
                mensagem_ID INT NOT NULL,
                chunk_ID VARCHAR(100) NOT NULL,
                score_relevance FLOAT NULL,
                PRIMARY KEY (mensagem_ID, chunk_ID),
                FOREIGN KEY (mensagem_ID) REFERENCES Mensagens(ID) ON DELETE CASCADE
            )`
        ];

        for (let query of queries) {
            await connection.query(query);
        }

        console.log("MySQL: Tabelas verificadas/criadas.");
        await connection.end();
    } catch (error) {
        console.error("Erro ao inicializar MySQL:", error);
        process.exit(1);
    }
}

module.exports = { pool, initDB };