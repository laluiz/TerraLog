const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME     || 'escavadeira_db',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '-03:00'
});

module.exports = pool;