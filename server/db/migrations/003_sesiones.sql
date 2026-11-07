ALTER TABLE usuarios
  ADD COLUMN sesion_version INT UNSIGNED NOT NULL DEFAULT 0
    AFTER estado_suscripcion;

CREATE TABLE IF NOT EXISTS sesiones (
  session_id VARCHAR(128) NOT NULL,
  expira_en INT UNSIGNED NOT NULL,
  datos MEDIUMTEXT,
  PRIMARY KEY (session_id),
  KEY idx_sesiones_expira (expira_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
