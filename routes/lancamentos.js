const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

// GET todos os lançamentos (com filtros opcionais)
router.get('/', async (req, res) => {
  try {
    const { maquina_id, operador_id, data_inicio, data_fim } = req.query;
    let sql = `
      SELECT l.*,
             m.codigo AS maquina_codigo, m.nome AS maquina_nome,
             o.nome   AS operador_nome
      FROM lancamentos l
      JOIN maquinas   m ON l.maquina_id  = m.id
      JOIN operadores o ON l.operador_id = o.id
      WHERE 1=1
    `;
    const params = [];
    if (maquina_id)  { sql += ' AND l.maquina_id = ?';  params.push(maquina_id); }
    if (operador_id) { sql += ' AND l.operador_id = ?'; params.push(operador_id); }
    if (data_inicio) { sql += ' AND l.data >= ?';       params.push(data_inicio); }
    if (data_fim)    { sql += ' AND l.data <= ?';       params.push(data_fim); }
    sql += ' ORDER BY l.data DESC, l.criado_em DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST criar lançamento — busca valor_hora da tabela_precos se não informado
router.post('/', async (req, res) => {
  const { maquina_id, operador_id, data, horimetro_inicio, horimetro_fim,
          tipo_atividade, local_obra, valor_hora, obs } = req.body;

  if (!maquina_id || !operador_id || !data || !horimetro_inicio || !horimetro_fim)
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  if (parseFloat(horimetro_fim) <= parseFloat(horimetro_inicio))
    return res.status(400).json({ error: 'Horímetro fim deve ser maior que início' });

  try {
    // Se não informou valor_hora manualmente, busca da tabela de preços
    let vhora = valor_hora ? parseFloat(valor_hora) : null;
    if (!vhora && maquina_id && tipo_atividade) {
      const [[preco]] = await db.query(
        'SELECT valor_hora FROM tabela_precos WHERE maquina_id = ? AND tipo_atividade = ?',
        [maquina_id, tipo_atividade]
      );
      if (preco) vhora = parseFloat(preco.valor_hora);
    }

    const [result] = await db.query(
      `INSERT INTO lancamentos
         (maquina_id, operador_id, data, horimetro_inicio, horimetro_fim,
          tipo_atividade, local_obra, valor_hora, obs)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [maquina_id, operador_id, data, horimetro_inicio, horimetro_fim,
       tipo_atividade || 'escavacao', local_obra, vhora, obs]
    );

    // Atualiza horímetro atual da máquina
    await db.query(
      'UPDATE maquinas SET horimetro_atual = ? WHERE id = ? AND horimetro_atual < ?',
      [horimetro_fim, maquina_id, horimetro_fim]
    );

    res.json({ id: result.insertId, valor_hora_usado: vhora, message: 'Lançamento registrado com sucesso' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE lançamento
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM lancamentos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Lançamento removido' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;