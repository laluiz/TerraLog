// ─── STATE ───────────────────────────────────────────
let registros = JSON.parse(localStorage.getItem('mtrack_registros') || '[]');

const maquinas = [
  { id: 'CNC-01', nome: 'Torno CNC',        meta: 160 },
  { id: 'FRS-02', nome: 'Fresadora',         meta: 160 },
  { id: 'SOL-03', nome: 'Solda MIG',         meta: 120 },
  { id: 'PRN-04', nome: 'Prensa Hidráulica', meta: 200 },
  { id: 'INJ-05', nome: 'Injetora Plástico', meta: 180 },
];

// ─── CLOCK ───────────────────────────────────────────
function updateClock() {
  document.getElementById('clock').textContent =
    new Date().toLocaleTimeString('pt-BR');
}
setInterval(updateClock, 1000);
updateClock();

// ─── DATE DEFAULTS ───────────────────────────────────
const today = new Date().toISOString().split('T')[0];
document.getElementById('f-data').value = today;
document.getElementById('form-date-label').textContent = formatDate(today);

// Auto calcular horas ao mudar início ou fim
['f-inicio', 'f-fim'].forEach(id => {
  document.getElementById(id).addEventListener('change', calcHoras);
});

// ─── CALC HORAS ──────────────────────────────────────
function calcHoras() {
  const ini = document.getElementById('f-inicio').value;
  const fim = document.getElementById('f-fim').value;
  if (!ini || !fim) return;

  const [h1, m1] = ini.split(':').map(Number);
  const [h2, m2] = fim.split(':').map(Number);
  let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diff < 0) diff += 1440; // virada de meia-noite

  const h = (diff / 60).toFixed(1);
  document.getElementById('f-horas').value = h + 'h';
  return diff / 60;
}

// ─── SALVAR REGISTRO ─────────────────────────────────
function salvarRegistro() {
  const maq   = document.getElementById('f-maquina').value;
  const oper  = document.getElementById('f-operador').value.trim();
  const data  = document.getElementById('f-data').value;
  const ini   = document.getElementById('f-inicio').value;
  const fim   = document.getElementById('f-fim').value;
  const tipo  = document.getElementById('f-tipo').value;
  const turno = document.getElementById('f-turno').value;
  const obs   = document.getElementById('f-obs').value.trim();

  if (!maq || !oper || !data || !ini || !fim) {
    alert('Preencha: máquina, operador, data, hora início e hora fim.');
    return;
  }

  const horas = calcHoras();
  if (!horas || horas <= 0) {
    alert('Período inválido.');
    return;
  }

  const reg = {
    id: Date.now(),
    maquina: maq,
    operador: oper,
    data,
    turno,
    inicio: ini,
    fim,
    horas: parseFloat(horas.toFixed(2)),
    tipo,
    obs
  };

  registros.unshift(reg);
  salvarStorage();
  limparForm();
  renderTudo();
  showToast('✓ LANÇAMENTO REGISTRADO');
}

// ─── STORAGE ─────────────────────────────────────────
function salvarStorage() {
  localStorage.setItem('mtrack_registros', JSON.stringify(registros));
}

// ─── REMOVER ─────────────────────────────────────────
function remover(id) {
  if (!confirm('Remover este registro?')) return;
  registros = registros.filter(r => r.id !== id);
  salvarStorage();
  renderTudo();
}

// ─── LIMPAR FORM ─────────────────────────────────────
function limparForm() {
  ['f-maquina', 'f-operador', 'f-inicio', 'f-fim', 'f-horas', 'f-obs']
    .forEach(id => document.getElementById(id).value = '');
}

// ─── RENDER TABELA ───────────────────────────────────
function renderTabela() {
  const tbody = document.getElementById('tabela-body');

  if (registros.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="empty">
            <div class="empty-icon">⚙</div>
            Nenhum lançamento registrado
          </div>
        </td>
      </tr>`;
    return;
  }

  const tipoTag   = { op: 'tag-op', man: 'tag-man', par: 'tag-par', oci: 'tag-oci' };
  const tipoLabel = { op: 'Operação', man: 'Manutenção', par: 'Parada', oci: 'Ocioso' };

  tbody.innerHTML = registros.map((r, i) => `
    <tr>
      <td style="color:var(--text-dim);font-family:var(--mono);font-size:12px">
        ${String(registros.length - i).padStart(3, '0')}
      </td>
      <td>
        <strong>${r.maquina.split('—')[0].trim()}</strong><br>
        <span style="font-size:11px;color:var(--text-dim)">${r.maquina.split('—')[1]?.trim()}</span>
      </td>
      <td>${r.operador}</td>
      <td style="font-family:var(--mono);font-size:13px">${formatDate(r.data)}</td>
      <td style="font-size:12px;color:var(--text-dim)">${r.turno.split(' ')[1] || ''}</td>
      <td style="font-family:var(--mono);font-size:13px">${r.inicio}–${r.fim}</td>
      <td class="horas-val">${r.horas.toFixed(1)}h</td>
      <td><span class="tag ${tipoTag[r.tipo]}">${tipoLabel[r.tipo]}</span></td>
      <td><button class="btn btn-danger" onclick="remover(${r.id})">✕</button></td>
    </tr>
  `).join('');

  document.getElementById('table-count').textContent =
    registros.length + ' registro' + (registros.length !== 1 ? 's' : '');
}

// ─── RENDER KPIs ─────────────────────────────────────
function renderKPIs() {
  const total = registros.reduce((s, r) => s + r.horas, 0);
  const op    = registros.filter(r => r.tipo === 'op').reduce((s, r) => s + r.horas, 0);
  const par   = registros.filter(r => r.tipo === 'par' || r.tipo === 'man').reduce((s, r) => s + r.horas, 0);

  document.getElementById('kpi-total').textContent = total.toFixed(1) + 'h';
  document.getElementById('kpi-op').textContent    = op.toFixed(1) + 'h';
  document.getElementById('kpi-par').textContent   = par.toFixed(1) + 'h';
  document.getElementById('kpi-reg').textContent   = registros.length;
}

// ─── RENDER MÁQUINAS ─────────────────────────────────
function renderMaquinas() {
  const list = document.getElementById('machine-list');

  list.innerHTML = maquinas.map(m => {
    const regs    = registros.filter(r => r.maquina.startsWith(m.id));
    const total   = regs.reduce((s, r) => s + r.horas, 0);
    const pct     = Math.min((total / m.meta) * 100, 100);
    const barClass = pct >= 90 ? 'crit' : pct >= 70 ? 'warn' : '';
    const opHoras = regs.filter(r => r.tipo === 'op').reduce((s, r) => s + r.horas, 0);

    return `
      <div class="machine-card">
        <div class="mc-top">
          <div>
            <div class="mc-name">${m.nome}</div>
            <div class="mc-id">${m.id}</div>
          </div>
          <div style="font-family:var(--mono);font-size:18px;color:var(--accent)">
            ${total.toFixed(0)}h
          </div>
        </div>
        <div class="mc-bar-wrap">
          <div class="mc-bar ${barClass}" style="width:${pct}%"></div>
        </div>
        <div class="mc-stats">
          <div>Meta: <strong>${m.meta}h</strong></div>
          <div>Produt.: <strong>${opHoras.toFixed(0)}h</strong></div>
          <div>${pct.toFixed(0)}%</div>
        </div>
      </div>`;
  }).join('');
}

// ─── TOAST ───────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ─── FORMAT DATE ─────────────────────────────────────
function formatDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

// ─── INIT ────────────────────────────────────────────
function renderTudo() {
  renderTabela();
  renderKPIs();
  renderMaquinas();
}
renderTudo();