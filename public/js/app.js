// ═══════════════════════════════════════════════
//  TRACKHORA — Frontend SPA
// ═══════════════════════════════════════════════

const API = '/api';
let charts = {};

// ─── ROTEAMENTO ──────────────────────────────────────────────
const pages = {
  dashboard:   renderDashboard,
  maquinas:    renderMaquinas,
  lancamentos: renderLancamentos,
  combustivel: renderCombustivel,
  manutencao:  renderManutencao,
  precos:      renderPrecos,
  relatorio:   renderRelatorio,
};

const pageTitles = {
  dashboard:   'Dashboard',
  maquinas:    'Máquinas Cadastradas',
  lancamentos: 'Lançamento de Horas',
  combustivel: 'Controle de Combustível (Custo)',
  manutencao:  'Manutenção',
  precos:      'Tabela de Preços',
  relatorio:   'Relatórios por Período',
};

function navigate(page) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.getElementById('page-title').textContent = pageTitles[page] || page;
  Object.values(charts).forEach(c => c.destroy());
  charts = {};
  pages[page]();
}

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.page));
});

// ─── CLOCK ───────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent = now.toLocaleTimeString('pt-BR');
  document.getElementById('clock-date').textContent = now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}
setInterval(updateClock, 1000); updateClock();

// ─── UTILS ───────────────────────────────────────────────────
async function api(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro na requisição');
  return data;
}

function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (type === 'error' ? ' error' : '');
  setTimeout(() => el.classList.remove('show'), 3000);
}

function fmt(num, dec = 1)  { return parseFloat(num || 0).toFixed(dec).replace('.', ','); }
function fmtDate(d)          { if (!d) return '—'; const [y,m,day] = d.split('T')[0].split('-'); return `${day}/${m}/${y}`; }
function today()             { return new Date().toISOString().split('T')[0]; }
function currency(v)         { return 'R$\u00a0' + parseFloat(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'); }
function lucroColor(v)       { return parseFloat(v) >= 0 ? 'var(--green)' : 'var(--red)'; }
function lucroSign(v)        { return parseFloat(v) >= 0 ? '+' : ''; }

const ATIVOS = { escavacao:'Escavação', terraplanagem:'Terraplenagem', carga:'Carga', transporte:'Transporte', 'demolição':'Demolição', compactacao:'Compactação', outros:'Outros' };

function tipoAtivBadge(t) {
  const map = { escavacao:'badge-gold', terraplanagem:'badge-blue', carga:'badge-green', transporte:'badge-blue', 'demolição':'badge-red', compactacao:'badge-gray', outros:'badge-gray' };
  return `<span class="badge ${map[t]||'badge-gray'}">${ATIVOS[t]||t}</span>`;
}

function statusBadge(s) {
  const map   = { ativo:'badge-green', inativo:'badge-gray', manutencao:'badge-red' };
  const label = { ativo:'Ativo', inativo:'Inativo', manutencao:'Manutenção' };
  return `<span class="badge ${map[s]}">${label[s]||s}</span>`;
}

function barClass(pct) { return pct >= 90 ? 'crit' : pct >= 70 ? 'warn' : ''; }

function openModal(title, html) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-overlay').classList.add('open');
}
function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

// ─── DASHBOARD ───────────────────────────────────────────────
async function renderDashboard() {
  document.getElementById('content').innerHTML = `<div class="empty-state"><div class="empty-icon">◈</div><div class="empty-text">Carregando...</div></div>`;
  try {
    const d = await api('/dashboard');
    const fin = d.financeiro;

    // Alerta topbar
    const badge = document.getElementById('alert-badge');
    if (d.alertas.length > 0) {
      badge.textContent = `⚠ ${d.alertas.length} ALERTA${d.alertas.length > 1 ? 'S' : ''} DE MANUTENÇÃO`;
      badge.classList.remove('hidden');
    } else badge.classList.add('hidden');

    document.getElementById('content').innerHTML = `

      <!-- ─── KPIs FINANCEIROS ─── -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
        <div class="kpi green">
          <div class="kpi-label">Receita (30 dias)</div>
          <div class="kpi-value" style="font-size:22px">${currency(fin.receita_mes)}</div>
          <div class="kpi-sub">${fmt(fin.horas_mes)}h trabalhadas</div>
        </div>
        <div class="kpi red">
          <div class="kpi-label">Custo Diesel (30 dias)</div>
          <div class="kpi-value" style="font-size:22px">${currency(fin.custo_diesel_mes)}</div>
          <div class="kpi-sub">${fmt(d.combustivel.litros_mes)}L abastecidos</div>
        </div>
        <div class="kpi" style="border-top-color:${lucroColor(fin.lucro_mes)}">
          <div class="kpi-label">Lucro (30 dias)</div>
          <div class="kpi-value" style="font-size:22px;color:${lucroColor(fin.lucro_mes)}">${lucroSign(fin.lucro_mes)}${currency(fin.lucro_mes)}</div>
          <div class="kpi-sub">Receita − Diesel</div>
        </div>
        <div class="kpi" style="border-top-color:#888">
          <div class="kpi-label">Máquinas Ativas</div>
          <div class="kpi-value">${d.maqStats.ativas}</div>
          <div class="kpi-sub">${d.maqStats.alerta_manut > 0 ? `<span style="color:var(--red)">⚠ ${d.maqStats.alerta_manut} alerta(s) manutenção</span>` : 'sem alertas'}</div>
        </div>
      </div>

      ${d.alertas.length > 0 ? `
      <div class="card" style="margin-bottom:16px;">
        <div class="card-title">⚠ Alertas de Manutenção</div>
        ${d.alertas.map(a => `
          <div class="alert-box ${parseFloat(a.horas_restantes) <= 0 ? '' : 'warn'}">
            <div>
              <strong style="font-family:var(--font-head)">${a.codigo} — ${a.nome}</strong>
              <div class="alert-text">Horímetro atual: ${fmt(a.horimetro_atual)}h · Próxima: ${fmt(a.horimetro_proxima_manut)}h</div>
            </div>
            <div class="alert-val">${parseFloat(a.horas_restantes) <= 0 ? 'VENCIDA' : fmt(a.horas_restantes)+'h'}</div>
          </div>
        `).join('')}
      </div>` : ''}

      <!-- ─── GRÁFICOS ─── -->
      <div class="grid-2" style="margin-bottom:16px;">
        <div class="card">
          <div class="card-title">Receita vs Diesel — últimos 14 dias</div>
          <div class="chart-container"><canvas id="chart-dias"></canvas></div>
        </div>
        <div class="card">
          <div class="card-title">Receita por atividade (30 dias)</div>
          <div class="chart-container"><canvas id="chart-atv"></canvas></div>
        </div>
      </div>

      <!-- ─── STATUS POR MÁQUINA ─── -->
      <div class="card" style="margin-bottom:16px;">
        <div class="card-title">Resultado por Máquina — últimos 30 dias</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Máquina</th>
                <th>Horas</th>
                <th>Horímetro</th>
                <th style="color:var(--green)">Receita</th>
                <th style="color:var(--red)">Custo Diesel</th>
                <th>Lucro</th>
                <th>Status</th>
                <th>Manutenção</th>
              </tr>
            </thead>
            <tbody>
              ${d.porMaquina.map(m => `
                <tr>
                  <td><strong style="font-family:var(--font-head)">${m.codigo}</strong><br><span class="td-dim">${m.nome}</span></td>
                  <td class="td-mono" style="color:var(--gold)">${fmt(m.horas_mes)}h</td>
                  <td class="td-mono">${fmt(m.horimetro_atual)}h</td>
                  <td class="td-mono" style="color:var(--green)">${parseFloat(m.receita_mes) > 0 ? currency(m.receita_mes) : '—'}</td>
                  <td class="td-mono" style="color:var(--red)">${parseFloat(m.custo_diesel_mes) > 0 ? currency(m.custo_diesel_mes) : '—'}</td>
                  <td class="td-mono" style="color:${lucroColor(m.lucro_mes)};font-weight:700">
                    ${parseFloat(m.receita_mes) > 0 || parseFloat(m.custo_diesel_mes) > 0 ? lucroSign(m.lucro_mes)+currency(m.lucro_mes) : '—'}
                  </td>
                  <td>${statusBadge(m.status)}</td>
                  <td style="font-size:12px;color:${parseFloat(m.horas_ate_manut) <= 50 ? 'var(--red)' : 'var(--text-3)'}">
                    ${m.horimetro_proxima_manut ? (parseFloat(m.horas_ate_manut) <= 0 ? '⚠ VENCIDA' : fmt(m.horas_ate_manut)+'h') : '—'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- ─── LANÇAMENTOS RECENTES ─── -->
      <div class="card">
        <div class="card-title">Últimos Lançamentos</div>
        ${d.recentes.length === 0 ? `<div class="empty-state"><div class="empty-text">Nenhum lançamento ainda</div></div>` : `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Máquina</th><th>Operador</th><th>Horas</th><th>R$/h</th><th>Receita</th><th>Atividade</th></tr></thead>
            <tbody>
              ${d.recentes.map(r => `
                <tr>
                  <td class="td-mono">${fmtDate(r.data)}</td>
                  <td><strong>${r.maquina_codigo}</strong></td>
                  <td class="td-dim">${r.operador_nome}</td>
                  <td class="td-mono" style="color:var(--gold)">${fmt(r.horas_trabalhadas)}h</td>
                  <td class="td-mono td-dim">${r.valor_hora ? currency(r.valor_hora)+'/h' : '—'}</td>
                  <td class="td-mono" style="color:var(--green)">${r.receita ? currency(r.receita) : '—'}</td>
                  <td>${tipoAtivBadge(r.tipo_atividade)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`}
      </div>
    `;

    // Gráfico Receita vs Diesel por dia
    const dias = d.porDia;
    charts.dias = new Chart(document.getElementById('chart-dias'), {
      type: 'bar',
      data: {
        labels: dias.map(x => x.dia),
        datasets: [
          { label: 'Receita', data: dias.map(x => parseFloat(x.receita || 0)),      backgroundColor: 'rgba(74,158,106,.7)',  borderColor: '#4a9e6a', borderWidth: 1 },
          { label: 'Diesel',  data: dias.map(x => parseFloat(x.custo_diesel || 0)), backgroundColor: 'rgba(192,64,64,.7)',   borderColor: '#c04040', borderWidth: 1 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#a8a49c' } } },
        scales: { x: { ticks: { color: '#a8a49c' } }, y: { ticks: { color: '#a8a49c', callback: v => 'R$'+v } } }
      }
    });

    const atv = d.porAtividade;
    charts.atv = new Chart(document.getElementById('chart-atv'), {
      type: 'doughnut',
      data: {
        labels: atv.map(x => ATIVOS[x.tipo_atividade] || x.tipo_atividade),
        datasets: [{ data: atv.map(x => parseFloat(x.receita || 0)), backgroundColor: ['#c8972a','#4a7eb8','#4a9e6a','#c04040','#8a6ab8','#4ab8b8','#686460'], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#a8a49c', boxWidth: 12 } } } }
    });

  } catch (e) { toast(e.message, 'error'); }
}

// ─── MÁQUINAS ────────────────────────────────────────────────
async function renderMaquinas() {
  const content = document.getElementById('content');
  try {
    const maquinas = await api('/maquinas');
    content.innerHTML = `
      <div class="section-header">
        <div><div class="section-title">Máquinas</div><div class="section-sub">${maquinas.length} cadastradas</div></div>
        <button class="btn btn-primary" onclick="modalNovaMaquina()">+ NOVA MÁQUINA</button>
      </div>
      ${maquinas.length === 0 ? `<div class="empty-state"><div class="empty-icon">⬡</div><div class="empty-text">Nenhuma máquina cadastrada</div></div>` : `
      <div class="maq-grid">
        ${maquinas.map(m => {
          const proxManut = parseFloat(m.horimetro_proxima_manut || 0);
          const pct = proxManut > 0 ? Math.min((parseFloat(m.horimetro_atual)/proxManut)*100,100) : 0;
          const bc = barClass(pct);
          return `
          <div class="maq-card">
            <div class="maq-card-top">
              <div>
                <div class="maq-code">${m.codigo}</div>
                <div class="maq-name">${m.nome}</div>
                <div class="maq-model">${m.modelo||''} ${m.fabricante?'· '+m.fabricante:''} ${m.ano?'· '+m.ano:''}</div>
              </div>
              ${statusBadge(m.status)}
            </div>
            <div class="hor-bar-wrap"><div class="hor-bar ${bc}" style="width:${pct}%"></div></div>
            <div class="maq-stats">
              <div><div class="maq-stat-label">Horímetro Atual</div><div class="maq-stat-val">${fmt(m.horimetro_atual)}h</div></div>
              <div><div class="maq-stat-label">Próx. Manutenção</div><div class="maq-stat-val" style="${parseFloat(m.horas_ate_manut)<=50?'color:var(--red)':''}">${fmt(m.horimetro_proxima_manut)}h</div></div>
              <div><div class="maq-stat-label">Intervalo</div><div class="maq-stat-val">${m.intervalo_manut}h</div></div>
              <div><div class="maq-stat-label">Lançamentos</div><div class="maq-stat-val">${m.total_lancamentos||0}</div></div>
            </div>
            <div class="maq-actions">
              <button class="btn btn-outline btn-sm" onclick="modalEditarMaquina(${m.id})">Editar</button>
              <button class="btn btn-danger" onclick="deletarMaquina(${m.id},'${m.codigo}')">Excluir</button>
            </div>
          </div>`;
        }).join('')}
      </div>`}
    `;
  } catch (e) { toast(e.message,'error'); }
}

async function modalNovaMaquina()      { openModal('Nova Máquina', formMaquina()); }
async function modalEditarMaquina(id)  { const m = await api('/maquinas/'+id); openModal('Editar Máquina', formMaquina(m)); }

function formMaquina(m = {}) {
  return `
    <div class="form-row form-2col">
      <div class="field"><label>Código *</label><input id="maq-codigo" value="${m.codigo||''}" placeholder="ESC-001"></div>
      <div class="field"><label>Nome *</label><input id="maq-nome" value="${m.nome||''}" placeholder="Escavadeira 01"></div>
    </div>
    <div class="form-row form-3col">
      <div class="field"><label>Modelo</label><input id="maq-modelo" value="${m.modelo||''}"></div>
      <div class="field"><label>Fabricante</label><input id="maq-fabricante" value="${m.fabricante||''}"></div>
      <div class="field"><label>Ano</label><input id="maq-ano" type="number" value="${m.ano||''}"></div>
    </div>
    <div class="form-row form-2col">
      <div class="field"><label>Número de Série</label><input id="maq-serie" value="${m.numero_serie||''}"></div>
      <div class="field"><label>Horímetro Atual (h)</label><input id="maq-horimetro" type="number" step="0.1" value="${m.horimetro_atual||0}"></div>
    </div>
    <div class="form-row form-2col">
      <div class="field"><label>Intervalo Manutenção (h)</label><input id="maq-intervalo" type="number" value="${m.intervalo_manut||250}"></div>
      ${m.id ? `<div class="field"><label>Status</label><select id="maq-status">
        <option value="ativo" ${m.status==='ativo'?'selected':''}>Ativo</option>
        <option value="inativo" ${m.status==='inativo'?'selected':''}>Inativo</option>
        <option value="manutencao" ${m.status==='manutencao'?'selected':''}>Manutenção</option>
      </select></div>` : '<div></div>'}
    </div>
    <div class="form-row"><div class="field"><label>Observações</label><textarea id="maq-obs">${m.obs||''}</textarea></div></div>
    <button class="btn btn-primary" onclick="salvarMaquina(${m.id||''})">SALVAR</button>
  `;
}

async function salvarMaquina(id) {
  const body = {
    codigo: document.getElementById('maq-codigo').value,
    nome: document.getElementById('maq-nome').value,
    modelo: document.getElementById('maq-modelo').value,
    fabricante: document.getElementById('maq-fabricante').value,
    ano: document.getElementById('maq-ano').value,
    numero_serie: document.getElementById('maq-serie').value,
    horimetro_atual: document.getElementById('maq-horimetro').value,
    intervalo_manut: document.getElementById('maq-intervalo').value,
    status: document.getElementById('maq-status')?.value || 'ativo',
    obs: document.getElementById('maq-obs').value,
  };
  try {
    if (id) await api('/maquinas/'+id, { method:'PUT', body: JSON.stringify(body) });
    else    await api('/maquinas',     { method:'POST', body: JSON.stringify(body) });
    toast('Máquina salva!'); closeModal(); renderMaquinas();
  } catch (e) { toast(e.message,'error'); }
}

async function deletarMaquina(id, codigo) {
  if (!confirm(`Excluir máquina ${codigo}?`)) return;
  try { await api('/maquinas/'+id, { method:'DELETE' }); toast('Removida.'); renderMaquinas(); }
  catch (e) { toast(e.message,'error'); }
}

// ─── TABELA DE PREÇOS ────────────────────────────────────────
async function renderPrecos() {
  const content = document.getElementById('content');
  try {
    const [maquinas, precos] = await Promise.all([api('/maquinas'), api('/precos')]);

    // Agrupa preços por máquina
    const precosMaq = {};
    precos.forEach(p => {
      if (!precosMaq[p.maquina_id]) precosMaq[p.maquina_id] = {};
      precosMaq[p.maquina_id][p.tipo_atividade] = p;
    });

    content.innerHTML = `
      <div class="section-header">
        <div>
          <div class="section-title">Tabela de Preços</div>
          <div class="section-sub">Valor cobrado por hora (R$/h) — por máquina e atividade</div>
        </div>
        <button class="btn btn-primary" onclick="modalNovoPreco()">+ DEFINIR PREÇO</button>
      </div>

      <div style="background:rgba(200,151,42,.08);border:1px solid rgba(200,151,42,.3);padding:12px 16px;margin-bottom:16px;font-size:13px;color:var(--text-2)">
        💡 Os preços definidos aqui são preenchidos automaticamente no lançamento de horas. Você ainda pode ajustar manualmente em cada lançamento.
      </div>

      ${maquinas.map(m => {
        const mp = precosMaq[m.id] || {};
        const atividades = Object.keys(ATIVOS);
        const temPreco = atividades.some(a => mp[a]);
        return `
        <div class="card" style="margin-bottom:14px;">
          <div class="card-title">
            ${m.codigo} — ${m.nome}
            ${statusBadge(m.status)}
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Atividade</th><th>Valor/hora</th><th>Ação</th></tr></thead>
              <tbody>
                ${atividades.map(a => {
                  const p = mp[a];
                  return `<tr>
                    <td>${tipoAtivBadge(a)}</td>
                    <td class="td-mono" style="color:${p?'var(--green)':'var(--text-3)'}">
                      ${p ? currency(p.valor_hora)+'/h' : '<span style="font-size:12px">não definido</span>'}
                    </td>
                    <td>
                      <button class="btn btn-outline btn-sm" onclick="modalEditarPreco(${m.id},'${a}',${p?p.valor_hora:0},${p?p.id:0})">
                        ${p ? 'Editar' : 'Definir'}
                      </button>
                      ${p ? `<button class="btn btn-danger" style="margin-left:6px" onclick="deletarPreco(${p.id})">✕</button>` : ''}
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
      }).join('')}
    `;
  } catch (e) { toast(e.message,'error'); }
}

function modalNovoPreco() {
  api('/maquinas').then(maquinas => {
    openModal('Definir Preço', `
      <div class="form-row form-2col">
        <div class="field"><label>Máquina *</label>
          <select id="preco-maquina">
            <option value="">Selecione...</option>
            ${maquinas.map(m=>`<option value="${m.id}">${m.codigo} — ${m.nome}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Atividade *</label>
          <select id="preco-atividade">
            ${Object.entries(ATIVOS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="field"><label>Valor por Hora (R$/h) *</label>
          <input id="preco-valor" type="number" step="0.01" placeholder="ex: 350,00">
        </div>
      </div>
      <button class="btn btn-primary" onclick="salvarPreco()">SALVAR PREÇO</button>
    `);
  });
}

function modalEditarPreco(maqId, atividade, valorAtual, precoId) {
  api('/maquinas').then(maquinas => {
    const maq = maquinas.find(m => m.id === maqId) || {};
    openModal('Editar Preço', `
      <div style="margin-bottom:16px;padding:10px 14px;background:var(--bg3);font-size:13px;">
        <strong>${maq.codigo} — ${maq.nome}</strong> · ${ATIVOS[atividade]||atividade}
      </div>
      <div class="form-row">
        <div class="field"><label>Valor por Hora (R$/h) *</label>
          <input id="preco-valor" type="number" step="0.01" value="${valorAtual}">
        </div>
      </div>
      <input type="hidden" id="preco-maquina" value="${maqId}">
      <input type="hidden" id="preco-atividade" value="${atividade}">
      <button class="btn btn-primary" onclick="salvarPreco()">SALVAR</button>
    `);
  });
}

async function salvarPreco() {
  const body = {
    maquina_id:     document.getElementById('preco-maquina').value,
    tipo_atividade: document.getElementById('preco-atividade').value,
    valor_hora:     document.getElementById('preco-valor').value,
  };
  try {
    await api('/precos', { method:'POST', body: JSON.stringify(body) });
    toast('Preço salvo!'); closeModal(); renderPrecos();
  } catch (e) { toast(e.message,'error'); }
}

async function deletarPreco(id) {
  if (!confirm('Remover este preço?')) return;
  try { await api('/precos/'+id, { method:'DELETE' }); toast('Removido.'); renderPrecos(); }
  catch (e) { toast(e.message,'error'); }
}

// ─── LANÇAMENTOS ─────────────────────────────────────────────
async function renderLancamentos() {
  const content = document.getElementById('content');
  try {
    const [maquinas, operadores, lancamentos] = await Promise.all([
      api('/maquinas'), api('/operadores'), api('/lancamentos')
    ]);

    content.innerHTML = `
      <div class="grid-2" style="align-items:start;">

        <!-- FORM -->
        <div class="card">
          <div class="card-title">Novo Lançamento</div>
          <div class="form-row form-2col">
            <div class="field"><label>Máquina *</label>
              <select id="lan-maquina">
                <option value="">Selecione...</option>
                ${maquinas.filter(m=>m.status==='ativo').map(m=>`<option value="${m.id}" data-hor="${m.horimetro_atual}">${m.codigo} — ${m.nome}</option>`).join('')}
              </select>
            </div>
            <div class="field"><label>Operador *</label>
              <select id="lan-operador">
                <option value="">Selecione...</option>
                ${operadores.map(o=>`<option value="${o.id}">${o.nome}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row form-2col">
            <div class="field"><label>Data *</label><input id="lan-data" type="date" value="${today()}"></div>
            <div class="field"><label>Atividade</label>
              <select id="lan-atividade">
                ${Object.entries(ATIVOS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row form-2col">
            <div class="field"><label>Horímetro Início *</label><input id="lan-hor-ini" type="number" step="0.1" placeholder="ex: 4250.0"></div>
            <div class="field"><label>Horímetro Fim *</label><input id="lan-hor-fim" type="number" step="0.1" placeholder="ex: 4258.0"></div>
          </div>
          <div class="form-row form-2col">
            <div class="field">
              <label>Valor Cobrado/hora (R$/h)</label>
              <input id="lan-valor-hora" type="number" step="0.01" placeholder="Auto (da tabela de preços)">
              <span id="lan-preco-hint" style="font-size:11px;color:var(--text-3);margin-top:3px;"></span>
            </div>
            <div class="field"><label>Local / Obra</label><input id="lan-local" type="text" placeholder="Ex: Obra Av. Central"></div>
          </div>

          <!-- Preview financeiro -->
          <div id="fin-preview" style="display:none;background:var(--bg3);border:1px solid var(--border);padding:14px 16px;margin-bottom:14px;">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:center;">
              <div>
                <div style="font-family:var(--font-head);font-size:10px;letter-spacing:1px;color:var(--text-3)">HORAS</div>
                <div id="prev-horas" style="font-family:var(--font-head);font-size:22px;color:var(--gold)">—</div>
              </div>
              <div>
                <div style="font-family:var(--font-head);font-size:10px;letter-spacing:1px;color:var(--text-3)">R$/h</div>
                <div id="prev-rph" style="font-family:var(--font-head);font-size:22px;color:var(--text-2)">—</div>
              </div>
              <div>
                <div style="font-family:var(--font-head);font-size:10px;letter-spacing:1px;color:var(--text-3)">RECEITA</div>
                <div id="prev-receita" style="font-family:var(--font-head);font-size:22px;color:var(--green)">—</div>
              </div>
            </div>
          </div>

          <div class="form-row"><div class="field"><label>Observações</label><textarea id="lan-obs" style="min-height:60px"></textarea></div></div>
          <button class="btn btn-primary" onclick="salvarLancamento()">⊕ REGISTRAR HORAS</button>
        </div>

        <!-- TABELA -->
        <div class="card">
          <div class="card-title">Histórico <span style="color:var(--text-3)">${lancamentos.length} registros</span></div>
          ${lancamentos.length === 0 ? `<div class="empty-state"><div class="empty-text">Nenhum lançamento</div></div>` : `
          <div class="table-wrap" style="max-height:560px;overflow-y:auto;">
            <table>
              <thead><tr><th>Data</th><th>Máquina</th><th>Op.</th><th>Horas</th><th>R$/h</th><th>Receita</th><th>Tipo</th><th></th></tr></thead>
              <tbody>
                ${lancamentos.map(l=>`
                  <tr>
                    <td class="td-mono">${fmtDate(l.data)}</td>
                    <td><strong>${l.maquina_codigo}</strong></td>
                    <td class="td-dim">${l.operador_nome.split(' ')[0]}</td>
                    <td class="td-mono" style="color:var(--gold)">${fmt(l.horas_trabalhadas)}h</td>
                    <td class="td-mono td-dim">${l.valor_hora ? currency(l.valor_hora)+'/h' : '—'}</td>
                    <td class="td-mono" style="color:var(--green)">${l.receita ? currency(l.receita) : '—'}</td>
                    <td>${tipoAtivBadge(l.tipo_atividade)}</td>
                    <td><button class="btn btn-danger" onclick="deletarLancamento(${l.id})">✕</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`}
        </div>
      </div>
    `;

    // Auto preenche horímetro início ao selecionar máquina
    document.getElementById('lan-maquina').addEventListener('change', async function() {
      const opt = this.options[this.selectedIndex];
      const hor = opt.getAttribute('data-hor');
      if (hor) document.getElementById('lan-hor-ini').value = parseFloat(hor).toFixed(1);
      await buscarPrecoAuto();
    });

    // Busca preço automático ao mudar atividade
    document.getElementById('lan-atividade').addEventListener('change', buscarPrecoAuto);

    // Preview financeiro ao vivo
    ['lan-hor-ini','lan-hor-fim','lan-valor-hora'].forEach(id => {
      document.getElementById(id).addEventListener('input', atualizarPreview);
    });

  } catch (e) { toast(e.message,'error'); }
}

async function buscarPrecoAuto() {
  const maqId = document.getElementById('lan-maquina').value;
  const atv   = document.getElementById('lan-atividade').value;
  const hint  = document.getElementById('lan-preco-hint');
  const input = document.getElementById('lan-valor-hora');
  if (!maqId || !atv) return;
  try {
    const p = await api(`/precos/buscar?maquina_id=${maqId}&tipo_atividade=${atv}`);
    if (p.valor_hora) {
      input.value = parseFloat(p.valor_hora).toFixed(2);
      hint.textContent = `✓ Preço da tabela: ${currency(p.valor_hora)}/h`;
      hint.style.color = 'var(--green)';
    } else {
      input.value = '';
      hint.textContent = 'Sem preço definido — insira manualmente ou configure em Tabela de Preços';
      hint.style.color = 'var(--text-3)';
    }
    atualizarPreview();
  } catch {}
}

function atualizarPreview() {
  const ini  = parseFloat(document.getElementById('lan-hor-ini').value);
  const fim  = parseFloat(document.getElementById('lan-hor-fim').value);
  const rph  = parseFloat(document.getElementById('lan-valor-hora').value);
  const prev = document.getElementById('fin-preview');
  if (ini && fim && fim > ini) {
    const horas = fim - ini;
    document.getElementById('prev-horas').textContent   = fmt(horas) + 'h';
    document.getElementById('prev-rph').textContent     = rph > 0 ? currency(rph)+'/h' : '—';
    document.getElementById('prev-receita').textContent = rph > 0 ? currency(horas * rph) : '—';
    prev.style.display = 'block';
  } else prev.style.display = 'none';
}

async function salvarLancamento() {
  const body = {
    maquina_id:       document.getElementById('lan-maquina').value,
    operador_id:      document.getElementById('lan-operador').value,
    data:             document.getElementById('lan-data').value,
    horimetro_inicio: document.getElementById('lan-hor-ini').value,
    horimetro_fim:    document.getElementById('lan-hor-fim').value,
    tipo_atividade:   document.getElementById('lan-atividade').value,
    local_obra:       document.getElementById('lan-local').value,
    valor_hora:       document.getElementById('lan-valor-hora').value,
    obs:              document.getElementById('lan-obs').value,
  };
  try {
    await api('/lancamentos', { method:'POST', body: JSON.stringify(body) });
    toast('Horas registradas!');
    renderLancamentos();
  } catch (e) { toast(e.message,'error'); }
}

async function deletarLancamento(id) {
  if (!confirm('Remover este lançamento?')) return;
  try { await api('/lancamentos/'+id, { method:'DELETE' }); toast('Removido.'); renderLancamentos(); }
  catch (e) { toast(e.message,'error'); }
}

// ─── COMBUSTÍVEL ─────────────────────────────────────────────
async function renderCombustivel() {
  const content = document.getElementById('content');
  try {
    const [maquinas, abast] = await Promise.all([api('/maquinas'), api('/abastecimentos')]);
    const totalCusto  = abast.reduce((s,a) => s + parseFloat(a.valor_total||0), 0);
    const totalLitros = abast.reduce((s,a) => s + parseFloat(a.litros||0), 0);

    content.innerHTML = `
      <div class="grid-2" style="align-items:start;">
        <div class="card">
          <div class="card-title">Registrar Abastecimento (Custo)</div>
          <div style="background:rgba(192,64,64,.08);border-left:3px solid var(--red);padding:10px 14px;margin-bottom:14px;font-size:13px;color:var(--text-2)">
            O custo do diesel é subtraído da receita para calcular o lucro.
          </div>
          <div class="form-row form-2col">
            <div class="field"><label>Máquina *</label>
              <select id="ab-maquina">
                <option value="">Selecione...</option>
                ${maquinas.map(m=>`<option value="${m.id}">${m.codigo} — ${m.nome}</option>`).join('')}
              </select>
            </div>
            <div class="field"><label>Data *</label><input id="ab-data" type="date" value="${today()}"></div>
          </div>
          <div class="form-row form-3col">
            <div class="field"><label>Horímetro (h)</label><input id="ab-hor" type="number" step="0.1"></div>
            <div class="field"><label>Litros *</label><input id="ab-litros" type="number" step="0.01"></div>
            <div class="field"><label>R$/Litro</label><input id="ab-vlitro" type="number" step="0.001" placeholder="5,990"></div>
          </div>
          <div id="ab-preview" style="display:none;background:var(--bg3);padding:10px 14px;margin-bottom:14px;">
            <span style="font-family:var(--font-head);font-size:11px;color:var(--text-3)">CUSTO TOTAL: </span>
            <span id="ab-preview-val" style="font-family:var(--font-head);font-size:20px;color:var(--red)">R$ 0,00</span>
          </div>
          <div class="form-row"><div class="field"><label>Fornecedor</label><input id="ab-forn" type="text"></div></div>
          <div class="form-row"><div class="field"><label>Observações</label><textarea id="ab-obs" style="min-height:60px"></textarea></div></div>
          <button class="btn btn-primary" onclick="salvarAbastecimento()">⊕ REGISTRAR ABASTECIMENTO</button>
        </div>

        <div class="card">
          <div class="card-title">
            Histórico
            <span style="color:var(--text-3)">Total: <strong style="color:var(--red)">${currency(totalCusto)}</strong> · ${fmt(totalLitros,0)}L</span>
          </div>
          ${abast.length === 0 ? `<div class="empty-state"><div class="empty-text">Nenhum abastecimento</div></div>` : `
          <div class="table-wrap" style="max-height:480px;overflow-y:auto;">
            <table>
              <thead><tr><th>Data</th><th>Máquina</th><th>Litros</th><th>R$/L</th><th>Custo</th><th></th></tr></thead>
              <tbody>
                ${abast.map(a=>`
                  <tr>
                    <td class="td-mono">${fmtDate(a.data)}</td>
                    <td><strong>${a.maquina_codigo}</strong></td>
                    <td class="td-mono" style="color:var(--blue)">${fmt(a.litros,2)}L</td>
                    <td class="td-mono td-dim">${a.valor_litro ? currency(a.valor_litro) : '—'}</td>
                    <td class="td-mono" style="color:var(--red)">${a.valor_total ? currency(a.valor_total) : '—'}</td>
                    <td><button class="btn btn-danger" onclick="deletarAbastecimento(${a.id})">✕</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`}
        </div>
      </div>
    `;

    // Preview custo ao vivo
    ['ab-litros','ab-vlitro'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => {
        const l = parseFloat(document.getElementById('ab-litros').value);
        const v = parseFloat(document.getElementById('ab-vlitro').value);
        const prev = document.getElementById('ab-preview');
        if (l > 0 && v > 0) {
          document.getElementById('ab-preview-val').textContent = currency(l*v);
          prev.style.display = 'block';
        } else prev.style.display = 'none';
      });
    });

  } catch (e) { toast(e.message,'error'); }
}

async function salvarAbastecimento() {
  const body = {
    maquina_id:  document.getElementById('ab-maquina').value,
    data:        document.getElementById('ab-data').value,
    horimetro:   document.getElementById('ab-hor').value,
    litros:      document.getElementById('ab-litros').value,
    valor_litro: document.getElementById('ab-vlitro').value,
    fornecedor:  document.getElementById('ab-forn').value,
    obs:         document.getElementById('ab-obs').value,
  };
  try {
    await api('/abastecimentos', { method:'POST', body: JSON.stringify(body) });
    toast('Abastecimento registrado!');
    renderCombustivel();
  } catch (e) { toast(e.message,'error'); }
}

async function deletarAbastecimento(id) {
  if (!confirm('Remover?')) return;
  try { await api('/abastecimentos/'+id, { method:'DELETE' }); toast('Removido.'); renderCombustivel(); }
  catch (e) { toast(e.message,'error'); }
}

// ─── MANUTENÇÃO ──────────────────────────────────────────────
async function renderManutencao() {
  const content = document.getElementById('content');
  try {
    const [maquinas, manuts] = await Promise.all([api('/maquinas'), api('/manutencoes')]);
    content.innerHTML = `
      <div class="grid-2" style="align-items:start;">
        <div class="card">
          <div class="card-title">Registrar Manutenção</div>
          <div class="form-row form-2col">
            <div class="field"><label>Máquina *</label>
              <select id="mt-maquina">
                <option value="">Selecione...</option>
                ${maquinas.map(m=>`<option value="${m.id}">${m.codigo} — ${m.nome}</option>`).join('')}
              </select>
            </div>
            <div class="field"><label>Data *</label><input id="mt-data" type="date" value="${today()}"></div>
          </div>
          <div class="form-row form-3col">
            <div class="field"><label>Horímetro (h)</label><input id="mt-hor" type="number" step="0.1"></div>
            <div class="field"><label>Tipo</label>
              <select id="mt-tipo">
                <option value="preventiva">Preventiva</option>
                <option value="corretiva">Corretiva</option>
                <option value="troca_oleo">Troca de Óleo</option>
                <option value="revisao">Revisão Geral</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div class="field"><label>Custo (R$)</label><input id="mt-custo" type="number" step="0.01"></div>
          </div>
          <div class="form-row form-2col">
            <div class="field"><label>Responsável</label><input id="mt-resp" type="text"></div>
            <div class="field"><label>Próx. Manutenção (h)</label><input id="mt-proxima" type="number" step="0.1" placeholder="ex: 4500"></div>
          </div>
          <div class="form-row"><div class="field"><label>Descrição *</label><textarea id="mt-desc" placeholder="Descreva o serviço realizado..."></textarea></div></div>
          <button class="btn btn-primary" onclick="salvarManutencao()">⊕ REGISTRAR MANUTENÇÃO</button>
        </div>
        <div class="card">
          <div class="card-title">Histórico de Manutenções</div>
          ${manuts.length === 0 ? `<div class="empty-state"><div class="empty-text">Nenhuma manutenção</div></div>` : `
          <div class="table-wrap" style="max-height:480px;overflow-y:auto;">
            <table>
              <thead><tr><th>Data</th><th>Máquina</th><th>Tipo</th><th>Horímetro</th><th>Custo</th><th></th></tr></thead>
              <tbody>
                ${manuts.map(m=>`
                  <tr>
                    <td class="td-mono">${fmtDate(m.data)}</td>
                    <td><strong>${m.maquina_codigo}</strong></td>
                    <td>${tipoManutBadge(m.tipo)}</td>
                    <td class="td-mono">${fmt(m.horimetro)}h</td>
                    <td class="td-mono" style="color:var(--red)">${m.custo ? currency(m.custo) : '—'}</td>
                    <td><button class="btn btn-danger" onclick="deletarManutencao(${m.id})">✕</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`}
        </div>
      </div>
    `;
  } catch (e) { toast(e.message,'error'); }
}

function tipoManutBadge(t) {
  const map   = { preventiva:'badge-green', corretiva:'badge-red', troca_oleo:'badge-gold', revisao:'badge-blue', outro:'badge-gray' };
  const label = { preventiva:'Preventiva', corretiva:'Corretiva', troca_oleo:'Troca Óleo', revisao:'Revisão', outro:'Outro' };
  return `<span class="badge ${map[t]||'badge-gray'}">${label[t]||t}</span>`;
}

async function salvarManutencao() {
  const body = {
    maquina_id: document.getElementById('mt-maquina').value,
    data:       document.getElementById('mt-data').value,
    horimetro:  document.getElementById('mt-hor').value,
    tipo:       document.getElementById('mt-tipo').value,
    descricao:  document.getElementById('mt-desc').value,
    custo:      document.getElementById('mt-custo').value,
    responsavel: document.getElementById('mt-resp').value,
    proxima_manut_horas: document.getElementById('mt-proxima').value,
  };
  try {
    await api('/manutencoes', { method:'POST', body: JSON.stringify(body) });
    toast('Manutenção registrada!');
    renderManutencao();
  } catch (e) { toast(e.message,'error'); }
}

async function deletarManutencao(id) {
  if (!confirm('Remover?')) return;
  try { await api('/manutencoes/'+id, { method:'DELETE' }); toast('Removido.'); renderManutencao(); }
  catch (e) { toast(e.message,'error'); }
}

// ─── RELATÓRIOS ──────────────────────────────────────────────
async function renderRelatorio() {
  const content = document.getElementById('content');
  const maquinas = await api('/maquinas');
  const mesInicio = today().slice(0,8) + '01';
  content.innerHTML = `
    <div class="card" style="margin-bottom:16px;">
      <div class="card-title">Filtros</div>
      <div class="form-row form-3col">
        <div class="field"><label>Data Início *</label><input id="rel-inicio" type="date" value="${mesInicio}"></div>
        <div class="field"><label>Data Fim *</label><input id="rel-fim" type="date" value="${today()}"></div>
        <div class="field"><label>Máquina</label>
          <select id="rel-maquina">
            <option value="">Todas</option>
            ${maquinas.map(m=>`<option value="${m.id}">${m.codigo} — ${m.nome}</option>`).join('')}
          </select>
        </div>
      </div>
      <button class="btn btn-primary" onclick="gerarRelatorio()">◫ GERAR RELATÓRIO</button>
    </div>
    <div id="relatorio-result"></div>
  `;
}

async function gerarRelatorio() {
  const inicio = document.getElementById('rel-inicio').value;
  const fim    = document.getElementById('rel-fim').value;
  const maqId  = document.getElementById('rel-maquina').value;
  const result = document.getElementById('relatorio-result');
  result.innerHTML = `<div class="empty-state"><div class="empty-text">Gerando...</div></div>`;
  try {
    let url = `/relatorio?data_inicio=${inicio}&data_fim=${fim}`;
    if (maqId) url += `&maquina_id=${maqId}`;
    const d = await api(url);
    const t = d.totais;

    result.innerHTML = `
      <!-- KPIs financeiros -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;">
        <div class="kpi green">
          <div class="kpi-label">Receita Total</div>
          <div class="kpi-value" style="font-size:20px">${currency(t.receita)}</div>
          <div class="kpi-sub">${fmt(t.horas)}h trabalhadas</div>
        </div>
        <div class="kpi red">
          <div class="kpi-label">Custo Diesel</div>
          <div class="kpi-value" style="font-size:20px">${currency(t.custo_diesel)}</div>
        </div>
        <div class="kpi" style="border-top-color:${lucroColor(t.lucro)}">
          <div class="kpi-label">Lucro</div>
          <div class="kpi-value" style="font-size:20px;color:${lucroColor(t.lucro)}">${lucroSign(t.lucro)}${currency(t.lucro)}</div>
          <div class="kpi-sub">Receita − Diesel</div>
        </div>
        <div class="kpi blue">
          <div class="kpi-label">Lançamentos</div>
          <div class="kpi-value">${d.lancamentos.length}</div>
        </div>
      </div>

      <!-- Resumo por máquina -->
      <div class="card" style="margin-bottom:16px;">
        <div class="card-title">Resultado por Máquina</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Máquina</th>
                <th>Horas</th>
                <th>R$/h Médio</th>
                <th style="color:var(--green)">Receita</th>
                <th style="color:var(--red)">Diesel (R$)</th>
                <th style="color:var(--text-2)">Diesel (L)</th>
                <th>Lucro</th>
                <th>Margem</th>
              </tr>
            </thead>
            <tbody>
              ${d.resumo.map(r => {
                const margem = parseFloat(r.total_receita) > 0
                  ? ((parseFloat(r.lucro) / parseFloat(r.total_receita)) * 100).toFixed(1)
                  : null;
                return `
                <tr>
                  <td><strong>${r.codigo}</strong> <span class="td-dim">${r.nome}</span></td>
                  <td class="td-mono" style="color:var(--gold)">${fmt(r.total_horas)}h</td>
                  <td class="td-mono td-dim">${parseFloat(r.media_valor_hora)>0 ? currency(r.media_valor_hora)+'/h' : '—'}</td>
                  <td class="td-mono" style="color:var(--green)">${parseFloat(r.total_receita)>0 ? currency(r.total_receita) : '—'}</td>
                  <td class="td-mono" style="color:var(--red)">${parseFloat(r.custo_diesel)>0 ? currency(r.custo_diesel) : '—'}</td>
                  <td class="td-mono td-dim">${parseFloat(r.litros_diesel)>0 ? fmt(r.litros_diesel,1)+'L' : '—'}</td>
                  <td class="td-mono" style="color:${lucroColor(r.lucro)};font-weight:700">
                    ${parseFloat(r.total_receita)>0||parseFloat(r.custo_diesel)>0 ? lucroSign(r.lucro)+currency(r.lucro) : '—'}
                  </td>
                  <td class="td-mono" style="color:${margem!==null&&parseFloat(margem)>=0?'var(--green)':'var(--red)'}">
                    ${margem !== null ? margem+'%' : '—'}
                  </td>
                </tr>`;
              }).join('')}
              <tr style="border-top:2px solid var(--border2);font-weight:700;background:var(--bg3)">
                <td>TOTAL</td>
                <td class="td-mono" style="color:var(--gold)">${fmt(t.horas)}h</td>
                <td>—</td>
                <td class="td-mono" style="color:var(--green)">${currency(t.receita)}</td>
                <td class="td-mono" style="color:var(--red)">${currency(t.custo_diesel)}</td>
                <td>—</td>
                <td class="td-mono" style="color:${lucroColor(t.lucro)};font-weight:700">${lucroSign(t.lucro)}${currency(t.lucro)}</td>
                <td class="td-mono" style="color:${lucroColor(t.lucro)}">
                  ${t.receita > 0 ? ((t.lucro/t.receita)*100).toFixed(1)+'%' : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Lançamentos detalhados -->
      <div class="card">
        <div class="card-title">Lançamentos Detalhados — ${fmtDate(inicio)} a ${fmtDate(fim)}</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Máquina</th><th>Operador</th><th>Horas</th><th>R$/h</th><th>Receita</th><th>Atividade</th><th>Local</th></tr></thead>
            <tbody>
              ${d.lancamentos.map(l=>`
                <tr>
                  <td class="td-mono">${fmtDate(l.data)}</td>
                  <td><strong>${l.maquina_codigo}</strong></td>
                  <td class="td-dim">${l.operador_nome}</td>
                  <td class="td-mono" style="color:var(--gold)">${fmt(l.horas_trabalhadas)}h</td>
                  <td class="td-mono td-dim">${l.valor_hora ? currency(l.valor_hora)+'/h' : '—'}</td>
                  <td class="td-mono" style="color:var(--green)">${l.receita ? currency(l.receita) : '—'}</td>
                  <td>${tipoAtivBadge(l.tipo_atividade)}</td>
                  <td class="td-dim">${l.local_obra||'—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) { toast(e.message,'error'); result.innerHTML=''; }
}

// ─── INIT ────────────────────────────────────────────────────
navigate('dashboard');