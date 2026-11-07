CREATE TABLE IF NOT EXISTS auditoria_admin (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id BIGINT UNSIGNED NOT NULL,
  accion VARCHAR(80) NOT NULL,
  entidad VARCHAR(50) NOT NULL,
  entidad_id BIGINT UNSIGNED NULL,
  datos JSON NULL,
  ip VARCHAR(45) NULL,
  user_agent VARCHAR(300) NULL,
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_auditoria_admin_fecha (admin_id, creada_en),
  KEY idx_auditoria_admin_accion (accion, creada_en),
  CONSTRAINT fk_auditoria_admin
    FOREIGN KEY (admin_id) REFERENCES usuarios (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
