const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

// ─── TABELA DE PREÇOS ────────────────────────────────────────

// GET todos os preços (com nome da máquina)
router.get('/precos', async (req, res) => {
  try {
    const { maquina_id } = req.query;
    let sql = `
      SELECT tp.*, m.codigo AS maquina_codigo, m.nome AS maquina_nome
      FROM tabela_precos tp
      JOIN maquinas m ON tp.maquina_id = m.id
      WHERE 1=1
    `;
    const params = [];
    if (maquina_id) { sql += ' AND tp.maquina_id = ?'; params.push(maquina_id); }
    sql += ' ORDER BY m.codigo, tp.tipo_atividade';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET preço de uma máquina + atividade específica
router.get('/precos/buscar', async (req, res) => {
  const { maquina_id, tipo_atividade } = req.query;
  try {
    const [[row]] = await db.query(
      'SELECT valor_hora FROM tabela_precos WHERE maquina_id = ? AND tipo_atividade = ?',
      [maquina_id, tipo_atividade]
    );
    res.json(row || { valor_hora: null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST / PUT — upsert preço (insere ou atualiza)
router.post('/precos', async (req, res) => {
  const { maquina_id, tipo_atividade, valor_hora } = req.body;
  try {
    await db.query(
      `INSERT INTO tabela_precos (maquina_id, tipo_atividade, valor_hora)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE valor_hora = VALUES(valor_hora)`,
      [maquina_id, tipo_atividade, valor_hora]
    );
    res.json({ message: 'Preço salvo com sucesso' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE preço
router.delete('/precos/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM tabela_precos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Preço removido' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ABASTECIMENTOS ──────────────────────────────────────────

router.get('/abastecimentos', async (req, res) => {
  try {
    const { maquina_id, data_inicio, data_fim } = req.query;
    let sql = `
      SELECT a.*, m.codigo AS maquina_codigo, m.nome AS maquina_nome
      FROM abastecimentos a
      JOIN maquinas m ON a.maquina_id = m.id
      WHERE 1=1
    `;
    const params = [];
    if (maquina_id)  { sql += ' AND a.maquina_id = ?'; params.push(maquina_id); }
    if (data_inicio) { sql += ' AND a.data >= ?';      params.push(data_inicio); }
    if (data_fim)    { sql += ' AND a.data <= ?';      params.push(data_fim); }
    sql += ' ORDER BY a.data DESC, a.criado_em DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/abastecimentos', async (req, res) => {
  const { maquina_id, data, horimetro, litros, valor_litro, fornecedor, obs } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO abastecimentos (maquina_id, data, horimetro, litros, valor_litro, fornecedor, obs)
       VALUES (?,?,?,?,?,?,?)`,
      [maquina_id, data, horimetro, litros, valor_litro || null, fornecedor, obs]
    );
    res.json({ id: result.insertId, message: 'Abastecimento registrado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/abastecimentos/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM abastecimentos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Abastecimento removido' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── MANUTENÇÕES ─────────────────────────────────────────────

router.get('/manutencoes', async (req, res) => {
  try {
    const { maquina_id } = req.query;
    let sql = `
      SELECT mt.*, m.codigo AS maquina_codigo, m.nome AS maquina_nome
      FROM manutencoes mt
      JOIN maquinas m ON mt.maquina_id = m.id
      WHERE 1=1
    `;
    const params = [];
    if (maquina_id) { sql += ' AND mt.maquina_id = ?'; params.push(maquina_id); }
    sql += ' ORDER BY mt.data DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/manutencoes', async (req, res) => {
  const { maquina_id, data, horimetro, tipo, descricao, custo, responsavel, proxima_manut_horas } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO manutencoes (maquina_id, data, horimetro, tipo, descricao, custo, responsavel, proxima_manut_horas, status)
       VALUES (?,?,?,?,?,?,?,?,'concluida')`,
      [maquina_id, data, horimetro, tipo || 'preventiva', descricao, custo || null, responsavel, proxima_manut_horas || null]
    );
    if (proxima_manut_horas) {
      await db.query('UPDATE maquinas SET horimetro_proxima_manut = ? WHERE id = ?', [proxima_manut_horas, maquina_id]);
    }
    res.json({ id: result.insertId, message: 'Manutenção registrada' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/manutencoes/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM manutencoes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Manutenção removida' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;