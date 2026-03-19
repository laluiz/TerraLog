-- ============================================================
--  SISTEMA DE CONTROLE DE HORAS — ESCAVADEIRAS / TRATORES
--  Execute este arquivo para criar o banco de dados
-- ============================================================

CREATE DATABASE IF NOT EXISTS escavadeira_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE escavadeira_db;

-- ─── MÁQUINAS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maquinas (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  codigo          VARCHAR(20)  NOT NULL UNIQUE,
  nome            VARCHAR(100) NOT NULL,
  modelo          VARCHAR(100),
  fabricante      VARCHAR(100),
  ano             YEAR,
  numero_serie    VARCHAR(100),
  horimetro_atual DECIMAL(10,1) NOT NULL DEFAULT 0,
  horimetro_proxima_manut DECIMAL(10,1),
  intervalo_manut INT DEFAULT 250,        -- horas entre manutenções
  status          ENUM('ativo','inativo','manutencao') DEFAULT 'ativo',
  obs             TEXT,
  criado_em       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── OPERADORES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operadores (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nome      VARCHAR(100) NOT NULL,
  matricula VARCHAR(30) UNIQUE,
  telefone  VARCHAR(20),
  ativo     TINYINT(1) DEFAULT 1,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── LANÇAMENTOS DE HORAS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS lancamentos (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  maquina_id       INT NOT NULL,
  operador_id      INT NOT NULL,
  data             DATE NOT NULL,
  horimetro_inicio DECIMAL(10,1) NOT NULL,
  horimetro_fim    DECIMAL(10,1) NOT NULL,
  horas_trabalhadas DECIMAL(10,1) GENERATED ALWAYS AS (horimetro_fim - horimetro_inicio) STORED,
  tipo_atividade   ENUM('escavacao','terraplanagem','carga','transporte','demolição','compactacao','outros') DEFAULT 'escavacao',
  local_obra       VARCHAR(200),
  obs              TEXT,
  criado_em        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (maquina_id)  REFERENCES maquinas(id)  ON DELETE RESTRICT,
  FOREIGN KEY (operador_id) REFERENCES operadores(id) ON DELETE RESTRICT,
  CONSTRAINT chk_horimetro CHECK (horimetro_fim > horimetro_inicio)
);

-- ─── ABASTECIMENTOS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS abastecimentos (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  maquina_id   INT NOT NULL,
  data         DATE NOT NULL,
  horimetro    DECIMAL(10,1) NOT NULL,
  litros       DECIMAL(8,2)  NOT NULL,
  valor_litro  DECIMAL(8,3),
  valor_total  DECIMAL(10,2) GENERATED ALWAYS AS (litros * valor_litro) STORED,
  fornecedor   VARCHAR(100),
  obs          TEXT,
  criado_em    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (maquina_id) REFERENCES maquinas(id) ON DELETE RESTRICT
);

-- ─── MANUTENÇÕES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS manutencoes (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  maquina_id   INT NOT NULL,
  data         DATE NOT NULL,
  horimetro    DECIMAL(10,1) NOT NULL,
  tipo         ENUM('preventiva','corretiva','troca_oleo','revisao','outro') DEFAULT 'preventiva',
  descricao    TEXT NOT NULL,
  custo        DECIMAL(10,2),
  responsavel  VARCHAR(100),
  proxima_manut_horas DECIMAL(10,1),
  status       ENUM('pendente','concluida') DEFAULT 'concluida',
  criado_em    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (maquina_id) REFERENCES maquinas(id) ON DELETE RESTRICT
);

-- ─── DADOS INICIAIS (DEMO) ───────────────────────────────────
INSERT IGNORE INTO maquinas (codigo, nome, modelo, fabricante, ano, horimetro_atual, horimetro_proxima_manut, intervalo_manut) VALUES
  ('ESC-001', 'Escavadeira 01', 'PC200-8',   'Komatsu',     2019, 4250.0, 4500.0, 250),
  ('ESC-002', 'Escavadeira 02', '320 GC',    'CAT',         2021, 2100.5, 2250.0, 250),
  ('TRA-001', 'Trator Esteira 01', 'D6T',    'CAT',         2020, 6800.0, 7000.0, 250),
  ('TRA-002', 'Trator Esteira 02', 'D65PX',  'Komatsu',     2018, 9150.0, 9250.0, 250);

INSERT IGNORE INTO operadores (nome, matricula, telefone) VALUES
  ('Carlos Silva',   'OP-001', '(49) 99999-0001'),
  ('José Fernandes', 'OP-002', '(49) 99999-0002'),
  ('Marcos Ramos',   'OP-003', '(49) 99999-0003');
