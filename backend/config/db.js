// ============================================================
// Database Configuration — PostgreSQL Connection Pool
// ============================================================
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'helpdesk_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,                // Maximum pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

// Test connection on startup
pool.on('connect', () => {
    console.log('📦 Connected to PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL pool error:', err.message);
});

/**
 * Execute a query using the connection pool
 * @param {string} text - SQL query or function call
 * @param {Array} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = async (text, params) => {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        if (process.env.NODE_ENV === 'development') {
            console.log(`🔍 Query (${duration}ms):`, text.substring(0, 80));
        }
        return result;
    } catch (error) {
        console.error('❌ Query error:', error.message);
        throw error;
    }
};

module.exports = { pool, query };
