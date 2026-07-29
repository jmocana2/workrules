-- =============================================================================
-- MIGRACIÓN: Modelo de familias de convenios
-- =============================================================================
-- Introduce la tabla `convenio_familias` para agrupar versiones distintas de un
-- mismo convenio colectivo. Separa dos identificadores que hasta ahora se
-- guardaban indistintamente en `codigo_regcon`:
--   - codigo_convenio (14 dígitos): identifica la FAMILIA, estable entre
--     versiones.
--   - numero_expediente_regcon (NN/NN/NNNNN/YYYY): identifica la VERSIÓN,
--     único por trámite/publicación en el BOE.
--
-- La columna `codigo_regcon` queda marcada como obsoleta y se eliminará en una
-- migración posterior una vez que todo el código lea los nuevos campos.
--
-- Contexto: docs/analysis/convenio-familias-plan.md (§2 Migración de esquema).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Tabla: convenio_familias
-- -----------------------------------------------------------------------------
CREATE TABLE convenio_familias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_convenio VARCHAR(20) NOT NULL,
    nombre_canonico TEXT NOT NULL,
    sector TEXT,
    ambito_territorial TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(codigo_convenio)
);

CREATE INDEX idx_familias_codigo ON convenio_familias(codigo_convenio);

COMMENT ON TABLE convenio_familias IS
    'Agrupa versiones distintas de un mismo convenio colectivo. Una familia = un código de convenio del BOE.';
COMMENT ON COLUMN convenio_familias.codigo_convenio IS
    'Código de convenio del BOE (14 dígitos). Estable entre versiones del mismo convenio.';
COMMENT ON COLUMN convenio_familias.nombre_canonico IS
    'Nombre representativo de la familia. Se toma del primer convenio subido; editable posteriormente.';


-- -----------------------------------------------------------------------------
-- RLS: convenio_familias
-- -----------------------------------------------------------------------------
-- La tabla es metadata de agrupación pública (no contiene datos privados de
-- usuario). Se habilita RLS por consistencia con el resto del schema y se
-- expone lectura a cualquier cliente. La escritura queda restringida al
-- service_role (que bypassa RLS), usado por el indexer n8n.
ALTER TABLE convenio_familias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "familias_lectura_publica"
    ON convenio_familias FOR SELECT
    USING (true);


-- -----------------------------------------------------------------------------
-- Extensión de `convenios`
-- -----------------------------------------------------------------------------
ALTER TABLE convenios
    ADD COLUMN familia_id UUID REFERENCES convenio_familias(id) ON DELETE SET NULL,
    ADD COLUMN codigo_convenio VARCHAR(20),
    ADD COLUMN numero_expediente_regcon VARCHAR(50);

COMMENT ON COLUMN convenios.familia_id IS
    'FK a convenio_familias. NULL para convenios privados o sin código detectado; se tratan como familia unipersonal.';
COMMENT ON COLUMN convenios.codigo_convenio IS
    'Código de convenio del BOE (14 dígitos). Redundante con convenio_familias.codigo_convenio para búsquedas directas.';
COMMENT ON COLUMN convenios.numero_expediente_regcon IS
    'Número de expediente REGCON del trámite (formato NN/NN/NNNNN/YYYY). Único por versión publicada.';


-- -----------------------------------------------------------------------------
-- Índices
-- -----------------------------------------------------------------------------
-- El UNIQUE antiguo sobre codigo_regcon impedía subir versiones nuevas del
-- mismo convenio. Se sustituye por UNIQUE sobre el número de expediente, que
-- es el que sí debe ser único por trámite.
DROP INDEX IF EXISTS idx_convenios_codigo_regcon_unique;

CREATE UNIQUE INDEX idx_convenios_expediente_unique
    ON convenios(numero_expediente_regcon)
    WHERE numero_expediente_regcon IS NOT NULL;

CREATE INDEX idx_convenios_familia ON convenios(familia_id);
CREATE INDEX idx_convenios_codigo_convenio ON convenios(codigo_convenio);


-- -----------------------------------------------------------------------------
-- Deprecación de codigo_regcon
-- -----------------------------------------------------------------------------
COMMENT ON COLUMN convenios.codigo_regcon IS
    'OBSOLETO: se eliminará en una migración posterior. Usar codigo_convenio (14 dígitos) o numero_expediente_regcon según corresponda.';


-- -----------------------------------------------------------------------------
-- Vista: convenios con flag de vigencia calculado
-- -----------------------------------------------------------------------------
-- Un convenio es "vigente" si su fecha_vigencia es el máximo dentro de su
-- familia. Convenios sin familia (familia_id NULL) se consideran familia
-- unipersonal y quedan como vigentes.
--
-- Solo se consideran estados operativos: activo y activo_sin_perfil.
CREATE VIEW v_convenios_con_vigencia AS
SELECT
    c.*,
    CASE
        WHEN c.familia_id IS NULL THEN true
        WHEN c.fecha_vigencia IS NULL THEN false
        ELSE c.fecha_vigencia = MAX(c.fecha_vigencia)
            OVER (PARTITION BY c.familia_id)
    END AS is_vigente
FROM convenios c
WHERE c.estado IN ('activo', 'activo_sin_perfil');

COMMENT ON VIEW v_convenios_con_vigencia IS
    'Convenios operativos con flag is_vigente calculado como MAX(fecha_vigencia) dentro de cada familia.';
