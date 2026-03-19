require('dotenv').config();
const express        = require('express');
const path           = require('path');
const methodOverride = require('method-override');

const app = express();

// ─── MIDDLEWARES ──────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// ─── ROTAS DA API ─────────────────────────────────────────
app.use('/api/maquinas',    require('./routes/maquinas'));
app.use('/api/lancamentos', require('./routes/lancamentos'));
app.use('/api',             require('./routes/extras'));
app.use('/api',             require('./routes/dashboard'));

// ─── FRONTEND (SPA) ───────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── START ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║   CONTROLE DE HORAS — ESCAVADEIRAS   ║');
  console.log('  ╠══════════════════════════════════════╣');
  console.log(`  ║   Servidor: http://localhost:${PORT}      ║`);
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
});
