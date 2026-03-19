const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

// GET dados do dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // Total de máquinas e status
    const [[maqStats]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status='ativo') AS ativas,
        SUM(status='manutencao') AS em_manutencao,
        SUM(status='inativo') AS inativas,
        SUM(CASE WHEN horimetro_proxima_manut IS NOT NULL
                  AND (horimetro_proxima_manut - horimetro_atual) <= 50
             THEN 1 ELSE 0 END) AS alerta_manut
      FROM maquinas
    `);

    // Financeiro geral — últimos 30 dias
    const [[financeiro]] = await db.query(`
      SELECT
        COALESCE(SUM(l.receita), 0)                    AS receita_mes,
        COALESCE(SUM(l.horas_trabalhadas), 0)          AS horas_mes,
        COALESCE(
          (SELECT SUM(a.valor_total)
           FROM abastecimentos a
           WHERE a.data >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)), 0
        )                                               AS custo_diesel_mes
      FROM lancamentos l
      WHERE l.data >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);
    financeiro.lucro_mes = parseFloat(financeiro.receita_mes) - parseFloat(financeiro.custo_diesel_mes);

    // Financeiro por máquina — últimos 30 dias
    const [porMaquina] = await db.query(`
      SELECT
        m.id, m.codigo, m.nome, m.status,
        m.horimetro_atual, m.horimetro_proxima_manut,
        (m.horimetro_proxima_manut - m.horimetro_atual) AS horas_ate_manut,
        COALESCE(SUM(l.horas_trabalhadas), 0)           AS horas_mes,
        COALESCE(SUM(l.receita), 0)                     AS receita_mes,
        COALESCE(
          (SELECT SUM(a.valor_total)
           FROM abastecimentos a
           WHERE a.maquina_id = m.id
             AND a.data >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)), 0
        )                                               AS custo_diesel_mes
      FROM maquinas m
      LEFT JOIN lancamentos l
             ON l.maquina_id = m.id
            AND l.data >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY m.id
      ORDER BY m.codigo
    `);
    // Lucro por máquina calculado em JS (evita subquery complexa)
    porMaquina.forEach(m => {
      m.lucro_mes = parseFloat(m.receita_mes) - parseFloat(m.custo_diesel_mes);
    });

    // Receita + custo diesel por dia (últimos 14 dias)
    const [porDia] = await db.query(`
      SELECT
        d.dia,
        COALESCE(l.receita, 0)      AS receita,
        COALESCE(ab.custo_diesel, 0) AS custo_diesel
      FROM (
        SELECT DATE_FORMAT(data, '%d/%m') AS dia, data
        FROM lancamentos
        WHERE data >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
        GROUP BY data
      ) d
      LEFT JOIN (
        SELECT data, SUM(receita) AS receita
        FROM lancamentos
        WHERE data >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
        GROUP BY data
      ) l ON l.data = d.data
      LEFT JOIN (
        SELECT data, SUM(valor_total) AS custo_diesel
        FROM abastecimentos
        WHERE data >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
        GROUP BY data
      ) ab ON ab.data = d.data
      ORDER BY d.data ASC
    `);

    // Horas e receita por atividade (30 dias)
    const [porAtividade] = await db.query(`
      SELECT tipo_atividade,
             SUM(horas_trabalhadas) AS horas,
             COALESCE(SUM(receita), 0) AS receita
      FROM lancamentos
      WHERE data >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY tipo_atividade
    `);

    // Combustível mês
    const [[combustivel]] = await db.query(`
      SELECT COALESCE(SUM(litros),0)      AS litros_mes,
             COALESCE(SUM(valor_total),0) AS custo_mes
      FROM abastecimentos
      WHERE data >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);

    // Lançamentos recentes
    const [recentes] = await db.query(`
      SELECT l.data, l.horas_trabalhadas, l.tipo_atividade,
             l.local_obra, l.valor_hora, l.receita,
             m.codigo AS maquina_codigo,
             o.nome   AS operador_nome
      FROM lancamentos l
      JOIN maquinas   m ON l.maquina_id  = m.id
      JOIN operadores o ON l.operador_id = o.id
      ORDER BY l.criado_em DESC LIMIT 8
    `);

    // Alertas de manutenção
    const [alertas] = await db.query(`
      SELECT codigo, nome, horimetro_atual, horimetro_proxima_manut,
             (horimetro_proxima_manut - horimetro_atual) AS horas_restantes
      FROM maquinas
      WHERE horimetro_proxima_manut IS NOT NULL
        AND (horimetro_proxima_manut - horimetro_atual) <= 100
      ORDER BY horas_restantes ASC
    `);

    res.json({ maqStats, financeiro, porMaquina, porDia, porAtividade, combustivel, recentes, alertas });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET relatório por período
router.get('/relatorio', async (req, res) => {
  try {
    const { data_inicio, data_fim, maquina_id } = req.query;
    if (!data_inicio || !data_fim)
      return res.status(400).json({ error: 'Informe data_inicio e data_fim' });

    let params = [data_inicio, data_fim];
    let filtroMaq = '';
    if (maquina_id) { filtroMaq = ' AND l.maquina_id = ?'; params.push(maquina_id); }

    // Lançamentos detalhados
    const [lancamentos] = await db.query(`
      SELECT l.*, m.codigo AS maquina_codigo, m.nome AS maquina_nome,
             o.nome AS operador_nome
      FROM lancamentos l
      JOIN maquinas   m ON l.maquina_id  = m.id
      JOIN operadores o ON l.operador_id = o.id
      WHERE l.data BETWEEN ? AND ? ${filtroMaq}
      ORDER BY l.data ASC, m.codigo ASC
    `, params);

    // Resumo financeiro por máquina
    let paramsComb = [data_inicio, data_fim];
    let filtroMaqComb = '';
    if (maquina_id) { filtroMaqComb = ' AND a.maquina_id = ?'; paramsComb.push(maquina_id); }

    const [resumo] = await db.query(`
      SELECT
        m.codigo, m.nome,
        COUNT(l.id)                              AS total_lancamentos,
        COALESCE(SUM(l.horas_trabalhadas), 0)    AS total_horas,
        COALESCE(SUM(l.receita), 0)              AS total_receita,
        COALESCE(AVG(l.valor_hora), 0)           AS media_valor_hora,
        MAX(l.horimetro_fim)                     AS horimetro_final,
        COALESCE(
          (SELECT SUM(a2.valor_total)
           FROM abastecimentos a2
           WHERE a2.maquina_id = m.id
             AND a2.data BETWEEN ? AND ?), 0
        )                                        AS custo_diesel,
        COALESCE(
          (SELECT SUM(a2.litros)
           FROM abastecimentos a2
           WHERE a2.maquina_id = m.id
             AND a2.data BETWEEN ? AND ?), 0
        )                                        AS litros_diesel
      FROM lancamentos l
      JOIN maquinas m ON l.maquina_id = m.id
      WHERE l.data BETWEEN ? AND ? ${filtroMaq}
      GROUP BY m.id
      ORDER BY m.codigo
    `, [data_inicio, data_fim, data_inicio, data_fim, ...params]);

    // Adiciona lucro calculado
    resumo.forEach(r => {
      r.lucro = parseFloat(r.total_receita) - parseFloat(r.custo_diesel);
    });

    // Totais gerais
    const totais = {
      horas:        resumo.reduce((s,r) => s + parseFloat(r.total_horas   || 0), 0),
      receita:      resumo.reduce((s,r) => s + parseFloat(r.total_receita || 0), 0),
      custo_diesel: resumo.reduce((s,r) => s + parseFloat(r.custo_diesel  || 0), 0),
      lucro:        0,
    };
    totais.lucro = totais.receita - totais.custo_diesel;

    res.json({ lancamentos, resumo, totais });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET operadores
router.get('/operadores', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM operadores WHERE ativo=1 ORDER BY nome');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/operadores', async (req, res) => {
  const { nome, matricula, telefone } = req.body;
  try {
    const [r] = await db.query('INSERT INTO operadores (nome, matricula, telefone) VALUES (?,?,?)', [nome, matricula, telefone]);
    res.json({ id: r.insertId, message: 'Operador cadastrado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;