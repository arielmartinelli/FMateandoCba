-- =============================================================================
--  F MATEANDO CBA · Esquema completo de Supabase
--
--  ¿INSTALACIÓN NUEVA?  Ejecutá SÓLO este archivo.
--  ¿YA TENÉS LA TABLA `products` CREADA?  Ejecutá `supabase_migration_v2.sql`,
--  que agrega lo que falta sin tocar tus datos ni tu stock actual.
--
--  Supabase → SQL Editor → New query → pegar → Run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Tabla de productos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Identificador estable y legible. Es la clave de conflicto de los UPSERT,
    -- así que sembrar o restaurar el catálogo nunca duplica filas.
    slug            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    price           NUMERIC NOT NULL CHECK (price >= 0),
    image_url       TEXT NOT NULL,
    category        TEXT NOT NULL,              -- 'mates' | 'bombillas' | 'accesorios'
    subcategory     TEXT NOT NULL DEFAULT 'todos',
    sub_subgroup    TEXT NOT NULL DEFAULT '',
    is_out_of_stock BOOLEAN NOT NULL DEFAULT false,
    -- NULL = no se lleva conteo de unidades (manda `is_out_of_stock`).
    -- 0 o menos = agotado automáticamente.
    stock_quantity  INTEGER CHECK (stock_quantity IS NULL OR stock_quantity >= 0),
    is_promo        BOOLEAN NOT NULL DEFAULT false,
    promo_price     NUMERIC CHECK (promo_price IS NULL OR promo_price >= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS products_created_at_idx ON public.products (created_at DESC);
CREATE INDEX IF NOT EXISTS products_category_idx   ON public.products (category, subcategory, sub_subgroup);

-- -----------------------------------------------------------------------------
-- Tabla de copias de seguridad del catálogo
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalog_backups (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    reason        TEXT NOT NULL DEFAULT 'manual',
    product_count INTEGER NOT NULL DEFAULT 0,
    payload       JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS catalog_backups_created_at_idx ON public.catalog_backups (created_at DESC);

-- -----------------------------------------------------------------------------
-- updated_at automático
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_set_updated_at ON public.products;
CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Copia de seguridad automática ante cualquier cambio (máx. 1 cada 30 minutos)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_backup_catalog()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  ultima TIMESTAMPTZ;
  filas  JSONB;
  total  INTEGER;
BEGIN
  SELECT max(created_at) INTO ultima FROM public.catalog_backups WHERE reason = 'auto';

  IF ultima IS NOT NULL AND ultima > timezone('utc', now()) - INTERVAL '30 minutes' THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_agg(to_jsonb(t)), count(*) INTO filas, total FROM public.products t;
  IF total IS NULL OR total = 0 THEN RETURN NULL; END IF;

  INSERT INTO public.catalog_backups (reason, product_count, payload)
  VALUES ('auto', total, filas);

  DELETE FROM public.catalog_backups
  WHERE reason = 'auto'
    AND id NOT IN (
      SELECT id FROM public.catalog_backups WHERE reason = 'auto'
      ORDER BY created_at DESC LIMIT 60
    );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS products_auto_backup ON public.products;
CREATE TRIGGER products_auto_backup
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH STATEMENT EXECUTE FUNCTION public.auto_backup_catalog();

-- -----------------------------------------------------------------------------
-- Row Level Security
--
--  ⚠ Estas políticas permiten escritura anónima: cualquiera con la clave pública
--  del sitio puede modificar el catálogo. Es lo mínimo para que el panel
--  funcione hoy. El endurecimiento con Supabase Auth está al final de
--  `supabase_migration_v2.sql`.
-- -----------------------------------------------------------------------------
ALTER TABLE public.products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select_public" ON public.products;
DROP POLICY IF EXISTS "products_insert_public" ON public.products;
DROP POLICY IF EXISTS "products_update_public" ON public.products;
DROP POLICY IF EXISTS "products_delete_public" ON public.products;

CREATE POLICY "products_select_public" ON public.products
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "products_insert_public" ON public.products
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "products_update_public" ON public.products
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "products_delete_public" ON public.products
  FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "catalog_backups_select" ON public.catalog_backups;
DROP POLICY IF EXISTS "catalog_backups_insert" ON public.catalog_backups;
DROP POLICY IF EXISTS "catalog_backups_delete" ON public.catalog_backups;

CREATE POLICY "catalog_backups_select" ON public.catalog_backups
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_backups_insert" ON public.catalog_backups
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "catalog_backups_delete" ON public.catalog_backups
  FOR DELETE TO anon, authenticated USING (true);

COMMIT;

-- -----------------------------------------------------------------------------
-- Después de ejecutar esto: entrá al panel de administración del sitio y usá
-- "Sembrar catálogo en Supabase" para cargar los 64 productos originales.
--
-- Opcional: Supabase → Storage → New bucket → nombre `product-images`, público.
-- Sirve para no guardar las fotos como base64 dentro de la fila.
-- -----------------------------------------------------------------------------
