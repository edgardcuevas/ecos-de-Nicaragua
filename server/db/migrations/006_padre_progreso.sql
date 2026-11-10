CREATE TABLE IF NOT EXISTS padre_perfiles (
  usuario_id BIGINT UNSIGNED NOT NULL,
  nivel_max_desbloqueado TINYINT UNSIGNED NOT NULL DEFAULT 1,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id),
  CONSTRAINT chk_padre_perfiles_nivel CHECK (nivel_max_desbloqueado BETWEEN 1 AND 5),
  CONSTRAINT fk_padre_perfiles_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS padre_records (
  usuario_id BIGINT UNSIGNED NOT NULL,
  modo ENUM('campana', 'infinita') NOT NULL,
  nivel TINYINT UNSIGNED NOT NULL DEFAULT 0,
  mejor_puntaje INT UNSIGNED NOT NULL DEFAULT 0,
  mejor_rondas INT UNSIGNED NOT NULL DEFAULT 0,
  victorias INT UNSIGNED NOT NULL DEFAULT 0,
  partidas INT UNSIGNED NOT NULL DEFAULT 0,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, modo, nivel),
  KEY idx_padre_records_ranking (modo, nivel, mejor_puntaje DESC),
  CONSTRAINT chk_padre_records_modo CHECK (
    (modo = 'campana' AND nivel BETWEEN 1 AND 5)
    OR (modo = 'infinita' AND nivel = 0)
  ),
  CONSTRAINT fk_padre_records_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS padre_partidas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NOT NULL,
  modo ENUM('campana', 'infinita') NOT NULL,
  nivel TINYINT UNSIGNED NOT NULL DEFAULT 0,
  puntaje INT UNSIGNED NOT NULL,
  rondas INT UNSIGNED NOT NULL DEFAULT 0,
  duracion_segundos SMALLINT UNSIGNED NOT NULL,
  vidas_restantes TINYINT UNSIGNED NOT NULL,
  objetos_usados TINYINT UNSIGNED NOT NULL DEFAULT 0,
  aldeanos INT UNSIGNED NOT NULL DEFAULT 0,
  perro INT UNSIGNED NOT NULL DEFAULT 0,
  monaguillo INT UNSIGNED NOT NULL DEFAULT 0,
  beata INT UNSIGNED NOT NULL DEFAULT 0,
  valiente INT UNSIGNED NOT NULL DEFAULT 0,
  salvados INT UNSIGNED NOT NULL DEFAULT 0,
  victoria BOOLEAN NOT NULL DEFAULT FALSE,
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_padre_partidas_usuario (usuario_id, creada_en),
  KEY idx_padre_partidas_ranking (modo, nivel, puntaje DESC),
  CONSTRAINT chk_padre_partidas_modo CHECK (
    (modo = 'campana' AND nivel BETWEEN 1 AND 5)
    OR (modo = 'infinita' AND nivel = 0)
  ),
  CONSTRAINT fk_padre_partidas_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
