# 🚜 TrackHora — Controle de Horas de Máquinas Pesadas

Sistema web completo para controle de horas de escavadeiras e tratores de esteira.
Backend: **Node.js + Express** · Banco de dados: **MySQL/MariaDB**

---

## 📋 Funcionalidades

- **Dashboard** com KPIs, gráficos e alertas de manutenção
- **Cadastro de máquinas** (escavadeiras, tratores de esteira)
- **Lançamento de horas** pelo horímetro (início/fim)
- **Controle de combustível** com custo por litro
- **Registro de manutenções** com próxima revisão
- **Relatórios por período** com resumo por máquina
- **Alertas automáticos** quando a manutenção estiver próxima

---

## ⚙️ Pré-requisitos

- [Node.js 18+](https://nodejs.org)
- [MySQL 8+](https://dev.mysql.com/downloads/) ou MariaDB 10.6+

---

## 🚀 Instalação — Passo a Passo

### 1. Configure o banco de dados

Abra o MySQL Workbench ou o terminal MySQL e execute o arquivo de schema:

```bash
mysql -u root -p < config/schema.sql
```

Ou cole o conteúdo do arquivo `config/schema.sql` direto no MySQL Workbench.

---

### 2. Configure as variáveis de ambiente

Copie o arquivo de exemplo e edite com seus dados:

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=SUA_SENHA_AQUI
DB_NAME=escavadeira_db

PORT=3000
SESSION_SECRET=qualquer_texto_aleatorio_aqui
```

---

### 3. Instale as dependências

```bash
npm install
```

---

### 4. Inicie o servidor

```bash
npm start
```

Acesse no navegador: **http://localhost:3000**

---

## 📁 Estrutura do Projeto

```
controle-horas-escavadeira/
├── server.js              ← Servidor Express principal
├── package.json
├── .env                   ← Suas configurações (não versionar!)
├── .env.example           ← Modelo de configuração
├── config/
│   ├── db.js              ← Conexão com MySQL
│   └── schema.sql         ← Script de criação do banco
├── routes/
│   ├── maquinas.js        ← CRUD de máquinas
│   ├── lancamentos.js     ← Lançamento de horas
│   ├── extras.js          ← Abastecimentos e manutenções
│   └── dashboard.js       ← Dashboard e relatórios
└── public/
    ├── index.html         ← SPA principal
    ├── css/style.css
    └── js/app.js
```

---

## 🔌 API REST

| Método | Rota                        | Descrição                    |
|--------|-----------------------------|------------------------------|
| GET    | /api/maquinas               | Lista todas as máquinas       |
| POST   | /api/maquinas               | Cadastra nova máquina         |
| PUT    | /api/maquinas/:id           | Atualiza máquina              |
| DELETE | /api/maquinas/:id           | Remove máquina                |
| GET    | /api/lancamentos            | Lista lançamentos (filtrável) |
| POST   | /api/lancamentos            | Registra horas                |
| DELETE | /api/lancamentos/:id        | Remove lançamento             |
| GET    | /api/abastecimentos         | Lista abastecimentos          |
| POST   | /api/abastecimentos         | Registra abastecimento        |
| GET    | /api/manutencoes            | Lista manutenções             |
| POST   | /api/manutencoes            | Registra manutenção           |
| GET    | /api/dashboard              | Dados do dashboard            |
| GET    | /api/relatorio              | Relatório por período         |
| GET    | /api/operadores             | Lista operadores              |
| POST   | /api/operadores             | Cadastra operador             |

---

## 💡 Dicas

- Para **desenvolvimento** com reload automático: `npm run dev` (requer `nodemon`)
- Os dados de demo (4 máquinas e 3 operadores) são inseridos automaticamente ao criar o banco
- A cada lançamento de horas, o horímetro da máquina é atualizado automaticamente
- O alerta de manutenção aparece quando restam ≤ 100 horas para a próxima revisão
