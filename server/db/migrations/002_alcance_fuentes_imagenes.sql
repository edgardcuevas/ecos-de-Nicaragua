ALTER TABLE leyendas
  ADD COLUMN alcance ENUM('nacional', 'regional', 'local')
    NOT NULL DEFAULT 'regional' AFTER origen,
  ADD KEY idx_leyendas_alcance (alcance);

ALTER TABLE fuentes
  ADD COLUMN clave VARCHAR(80) NULL AFTER id,
  ADD UNIQUE KEY uq_fuentes_clave (clave);

ALTER TABLE imagenes
  ADD COLUMN es_premium BOOLEAN NOT NULL DEFAULT FALSE AFTER es_principal,
  ADD KEY idx_imagenes_principal (leyenda_id, es_principal);
