const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

// GET todas as máquinas
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT m.*,
        (m.horimetro_proxima_manut - m.horimetro_atual) AS horas_ate_manut,
        (SELECT COUNT(*) FROM lancamentos l WHERE l.maquina_id = m.id) AS total_lancamentos
      FROM maquinas m ORDER BY m.codigo
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET uma máquina
router.get('/:id', async (req, res) => {
  try {
    const [[maq]] = await db.query('SELECT * FROM maquinas WHERE id = ?', [req.params.id]);
    if (!maq) return res.status(404).json({ error: 'Máquina não encontrada' });
    res.json(maq);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST criar máquina
router.post('/', async (req, res) => {
  const { codigo, nome, modelo, fabricante, ano, numero_serie, horimetro_atual, intervalo_manut, obs } = req.body;
  try {
    const horProxManut = parseFloat(horimetro_atual || 0) + parseInt(intervalo_manut || 250);
    const [result] = await db.query(
      `INSERT INTO maquinas (codigo, nome, modelo, fabricante, ano, numero_serie, horimetro_atual, horimetro_proxima_manut, intervalo_manut, obs)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [codigo, nome, modelo, fabricante, ano || null, numero_serie, horimetro_atual || 0, horProxManut, intervalo_manut || 250, obs]
    );
    res.json({ id: result.insertId, message: 'Máquina cadastrada com sucesso' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT atualizar máquina
router.put('/:id', async (req, res) => {
  const { nome, modelo, fabricante, ano, numero_serie, horimetro_atual, intervalo_manut, status, obs } = req.body;
  try {
    const horProxManut = parseFloat(horimetro_atual || 0) + parseInt(intervalo_manut || 250);
    await db.query(
      `UPDATE maquinas SET nome=?, modelo=?, fabricante=?, ano=?, numero_serie=?,
       horimetro_atual=?, horimetro_proxima_manut=?, intervalo_manut=?, status=?, obs=?
       WHERE id=?`,
      [nome, modelo, fabricante, ano || null, numero_serie, horimetro_atual, horProxManut, intervalo_manut, status, obs, req.params.id]
    );
    res.json({ message: 'Máquina atualizada com sucesso' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE máquina
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM maquinas WHERE id = ?', [req.params.id]);
    res.json({ message: 'Máquina removida' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
