CREATE TABLE IF NOT EXISTS runner_perfiles (
  usuario_id BIGINT UNSIGNED NOT NULL,
  nivel_max_desbloqueado TINYINT UNSIGNED NOT NULL DEFAULT 1,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id),
  CONSTRAINT fk_runner_perfiles_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS runner_records (
  usuario_id BIGINT UNSIGNED NOT NULL,
  nivel TINYINT UNSIGNED NOT NULL,
  mejor_puntaje INT UNSIGNED NOT NULL DEFAULT 0,
  mejor_distancia INT UNSIGNED NOT NULL DEFAULT 0,
  victorias INT UNSIGNED NOT NULL DEFAULT 0,
  partidas INT UNSIGNED NOT NULL DEFAULT 0,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, nivel),
  KEY idx_runner_records_ranking (nivel, mejor_puntaje DESC),
  CONSTRAINT fk_runner_records_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS runner_partidas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NOT NULL,
  nivel TINYINT UNSIGNED NOT NULL,
  puntaje INT UNSIGNED NOT NULL,
  distancia INT UNSIGNED NOT NULL,
  duracion_segundos SMALLINT UNSIGNED NOT NULL,
  vidas_restantes TINYINT UNSIGNED NOT NULL,
  victoria BOOLEAN NOT NULL DEFAULT FALSE,
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_runner_partidas_usuario (usuario_id, creada_en),
  KEY idx_runner_partidas_ranking (nivel, puntaje DESC),
  CONSTRAINT fk_runner_partidas_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
