-- =============================================================================
--  F MATEANDO CBA · Migración v2
--  Arregla la persistencia del stock + agrega copias de seguridad automáticas.
--
--  CÓMO EJECUTARLO
--    Supabase → tu proyecto → SQL Editor → New query → pegar todo → Run.
--
--  ES IDEMPOTENTE: se puede correr las veces que haga falta sin romper nada
--  y SIN modificar el stock actual de ningún producto.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Columnas nuevas (aditivas: no tocan ningún dato existente)
-- -----------------------------------------------------------------------------

-- `slug`: identificador estable y legible. Permite sembrar/restaurar el catálogo
-- con UPSERT sin duplicar filas, y elimina el desajuste de IDs que hacía que la
-- app editara un producto que en la base no existía.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT;

-- `stock_quantity`: unidades disponibles. NULL = "no se gestiona cantidad",
-- que es exactamente el comportamiento actual. Por eso el stock de hoy NO cambia.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER;

-- `updated_at`: para saber cuándo se tocó cada producto por última vez.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());

-- -----------------------------------------------------------------------------
-- 2. Backfill de `slug` para las filas que ya existen
--    Primero por nombre exacto contra el catálogo original de 64 productos,
--    después generando uno a partir del nombre para cualquier resto.
-- -----------------------------------------------------------------------------

WITH catalogo(slug, name) AS (
  VALUES
  ('m-imp-1', 'Mate Imperial Calabaza Costura Uruguaya'),
  ('m-imp-2', 'Mate Imperial Algarrobo Virolado'),
  ('m-imp-3', 'Mate Imperial Premium Cincelado'),
  ('m-imp-4', 'Mate Imperial Calabaza Especial'),
  ('m-imp-5', 'Mate Imperial Algarrobo Cincelado'),
  ('m-imp-6', 'Mate Imperial Premium Alpaca'),
  ('m-imp-7', 'Mate Imperial Calabaza Cuero Negro'),
  ('m-imp-8', 'Mate Imperial Algarrobo Labrado'),
  ('m-imp-9', 'Mate Imperial Calabaza Seleccionada'),
  ('m-imp-10', 'Mate Imperial Premium Flor de Lis'),
  ('m-imp-11', 'Mate Imperial Calabaza Marrón'),
  ('m-imp-12', 'Mate Imperial Algarrobo Tradicional'),
  ('m-imp-13', 'Mate Imperial Premium Rey'),
  ('m-imp-14', 'Mate Imperial Calabaza Virolada'),
  ('m-tor-1', 'Mate Torpedo Calabaza Común'),
  ('m-tor-2', 'Mate Torpedo Base Bolita Bronce'),
  ('m-tor-3', 'Mate Torpedo Cuero Negro'),
  ('m-tor-4', 'Mate Torpedo Base Bolita Alpaca'),
  ('m-tor-5', 'Mate Torpedo Calabaza Seleccionada'),
  ('m-tor-6', 'Mate Torpedo Base Bolita Reforzado'),
  ('m-tor-7', 'Mate Torpedo Virola Inox'),
  ('m-tor-8', 'Mate Torpedo Base Bolita Cuero Vaqueta'),
  ('m-tor-9', 'Mate Torpedo Calabaza Cincelado'),
  ('m-tor-10', 'Mate Torpedo Base Bolita Artesanal'),
  ('m-tor-11', 'Mate Torpedo Cuero Marrón'),
  ('m-tor-12', 'Mate Torpedo Base Bolita Premium'),
  ('m-tor-13', 'Mate Torpedo Calabaza Gruesa'),
  ('m-tor-14', 'Mate Torpedo Base Bolita Especial'),
  ('m-tor-15', 'Mate Torpedo Cuero Labrado'),
  ('m-tor-16', 'Mate Torpedo Base Bolita Uru'),
  ('m-tor-17', 'Mate Torpedo Calabaza Mini'),
  ('m-tor-18', 'Mate Torpedo Base Bolita XL'),
  ('m-gal-1', 'Mate Galleta Común'),
  ('m-gal-2', 'Mate Galleta con Virola'),
  ('m-gal-3', 'Mate Galleta Rústico'),
  ('m-gal-4', 'Mate Galleta Virola Pulida'),
  ('m-gal-5', 'Mate Galleta Viajero'),
  ('m-gal-6', 'Mate Galleta Virola Alpaca'),
  ('m-cam-1', 'Mate Camionero Seleccionado'),
  ('m-cam-2', 'Mate Camionero Algarrobo'),
  ('m-cam-3', 'Mate Camionero Calabaza Boca Ancha'),
  ('m-rus-1', 'Mate Rústico Algarrobo'),
  ('m-rus-2', 'Mate Rústico Torneado'),
  ('b-ace-1', 'Bombilla Resorte Inoxidable'),
  ('b-ace-2', 'Bombilla Pico de Loro Acero'),
  ('b-ace-3', 'Bombilla Cuchara Acero'),
  ('b-ace-4', 'Bombilla Plana Inox'),
  ('b-ace-5', 'Bombilla Anillo Dorado Acero'),
  ('b-ace-6', 'Bombilla Desarmable Acero'),
  ('b-ace-7', 'Bombilla Curva Acero'),
  ('b-ace-8', 'Bombilla Premium Inox'),
  ('b-alp-1', 'Bombilla Pico de Loro Alpaca'),
  ('b-alp-2', 'Bombilla Cincelada Alpaca'),
  ('b-alp-3', 'Bombilla Cuchara Alpaca'),
  ('b-alp-4', 'Bombilla Boquilla Bronce Alpaca'),
  ('b-alp-5', 'Bombilla Rey Alpaca'),
  ('b-alp-6', 'Bombilla Plana Alpaca Cincelada'),
  ('t-ter-1', 'Termo Acero Inoxidable 1L'),
  ('t-ter-2', 'Termo Media Manija Acero'),
  ('t-ter-3', 'Termo Sifón 1.2L'),
  ('t-ter-4', 'Termo Engomado Negro 1L'),
  ('a-acc-1', 'Bolso Matero de Cuero'),
  ('a-acc-2', 'Combo Yerbera y Azucarera'),
  ('a-acc-3', 'Canasta Matera de Ecocuero')
)
UPDATE public.products p
SET slug = c.slug
FROM catalogo c
WHERE p.slug IS NULL
  AND lower(btrim(p.name)) = lower(btrim(c.name));

-- Resto: slug derivado del nombre (sin acentos, minúsculas, con guiones)
UPDATE public.products
SET slug = left(
      regexp_replace(
        regexp_replace(
          lower(translate(name, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')),
          '[^a-z0-9]+', '-', 'g'
        ),
        '(^-+|-+$)', '', 'g'
      ), 48)
WHERE slug IS NULL OR btrim(slug) = '';

-- Desempate por si dos productos comparten nombre
UPDATE public.products p
SET slug = p.slug || '-' || left(p.id::text, 8)
FROM (
  SELECT slug FROM public.products GROUP BY slug HAVING count(*) > 1
) d
WHERE p.slug = d.slug;

ALTER TABLE public.products ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS products_slug_key ON public.products (slug);

-- -----------------------------------------------------------------------------
-- 3. Índices de rendimiento
--    El catálogo filtra siempre por categoría/subcategoría y ordena por fecha.
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS products_created_at_idx
  ON public.products (created_at DESC);

CREATE INDEX IF NOT EXISTS products_category_idx
  ON public.products (category, subcategory, sub_subgroup);

-- -----------------------------------------------------------------------------
-- 4. `updated_at` automático
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
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
-- 5. Políticas RLS explícitas
--
--    ⚠ IMPORTANTE: estas políticas mantienen EXACTAMENTE los permisos actuales
--    (cualquiera con la clave pública puede escribir). Se reescriben una por
--    operación para que quede claro qué está permitido y para que la app pueda
--    detectar con precisión qué falla. El endurecimiento con Supabase Auth está
--    al final del archivo, comentado y listo para activar.
-- -----------------------------------------------------------------------------

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access"  ON public.products;
DROP POLICY IF EXISTS "Allow public write access" ON public.products;
DROP POLICY IF EXISTS "products_select_public"    ON public.products;
DROP POLICY IF EXISTS "products_insert_public"    ON public.products;
DROP POLICY IF EXISTS "products_update_public"    ON public.products;
DROP POLICY IF EXISTS "products_delete_public"    ON public.products;

CREATE POLICY "products_select_public" ON public.products
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "products_insert_public" ON public.products
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ESTA es la política cuya ausencia hacía que el UPDATE devolviera
-- "0 filas afectadas" sin error y el stock no se guardara.
CREATE POLICY "products_update_public" ON public.products
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "products_delete_public" ON public.products
  FOR DELETE TO anon, authenticated USING (true);

-- -----------------------------------------------------------------------------
-- 6. Copias de seguridad del catálogo
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.catalog_backups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  reason        TEXT NOT NULL DEFAULT 'manual',
  product_count INTEGER NOT NULL DEFAULT 0,
  payload       JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS catalog_backups_created_at_idx
  ON public.catalog_backups (created_at DESC);

ALTER TABLE public.catalog_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catalog_backups_select" ON public.catalog_backups;
DROP POLICY IF EXISTS "catalog_backups_insert" ON public.catalog_backups;
DROP POLICY IF EXISTS "catalog_backups_delete" ON public.catalog_backups;

CREATE POLICY "catalog_backups_select" ON public.catalog_backups
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "catalog_backups_insert" ON public.catalog_backups
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "catalog_backups_delete" ON public.catalog_backups
  FOR DELETE TO anon, authenticated USING (true);

-- -----------------------------------------------------------------------------
-- 7. Snapshot automático ante cualquier cambio (red de seguridad del lado servidor)
--    Guarda una copia completa como mucho una vez cada 30 minutos, así no crece
--    sin control cuando se editan muchos productos seguidos.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auto_backup_catalog()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  ultima TIMESTAMPTZ;
  filas  JSONB;
  total  INTEGER;
BEGIN
  SELECT max(created_at) INTO ultima
  FROM public.catalog_backups
  WHERE reason = 'auto';

  IF ultima IS NOT NULL AND ultima > timezone('utc', now()) - INTERVAL '30 minutes' THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_agg(to_jsonb(t)), count(*) INTO filas, total FROM public.products t;

  IF total IS NULL OR total = 0 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.catalog_backups (reason, product_count, payload)
  VALUES ('auto', total, filas);

  -- Retención: dejamos las 60 copias automáticas más recientes.
  DELETE FROM public.catalog_backups
  WHERE reason = 'auto'
    AND id NOT IN (
      SELECT id FROM public.catalog_backups
      WHERE reason = 'auto'
      ORDER BY created_at DESC
      LIMIT 60
    );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS products_auto_backup ON public.products;
CREATE TRIGGER products_auto_backup
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH STATEMENT EXECUTE FUNCTION public.auto_backup_catalog();

-- Copia inicial del estado actual, antes de cualquier cambio.
-- Se crea una sola vez aunque el script se ejecute varias veces.
INSERT INTO public.catalog_backups (reason, product_count, payload)
SELECT 'migración v2 · estado previo', count(*), coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
FROM public.products t
HAVING count(*) > 0
   AND NOT EXISTS (
     SELECT 1 FROM public.catalog_backups
     WHERE reason = 'migración v2 · estado previo'
   );

COMMIT;

-- =============================================================================
--  8. VERIFICACIÓN — corré esto después y revisá que dé lo esperado
-- =============================================================================
-- SELECT count(*) AS productos, count(slug) AS con_slug FROM public.products;
-- SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE schemaname = 'public' ORDER BY tablename, cmd;
-- SELECT id, created_at, reason, product_count FROM public.catalog_backups
--   ORDER BY created_at DESC LIMIT 5;

-- =============================================================================
--  9. ENDURECIMIENTO DE SEGURIDAD (aplicar en una segunda etapa)
--
--  Hoy cualquiera que lea el JavaScript del sitio puede escribir en la tabla,
--  porque la clave pública viaja en el bundle y las políticas permiten escritura
--  anónima. El arreglo correcto es Supabase Auth:
--
--    1) Supabase → Authentication → Users → Add user  (tu email + contraseña)
--    2) En la app, reemplazar el login por contraseña por supabase.auth
--       .signInWithPassword({ email, password })
--    3) Ejecutar el bloque de abajo para que sólo usuarios autenticados escriban:
--
--  DROP POLICY IF EXISTS "products_insert_public" ON public.products;
--  DROP POLICY IF EXISTS "products_update_public" ON public.products;
--  DROP POLICY IF EXISTS "products_delete_public" ON public.products;
--
--  CREATE POLICY "products_insert_auth" ON public.products
--    FOR INSERT TO authenticated WITH CHECK (true);
--  CREATE POLICY "products_update_auth" ON public.products
--    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
--  CREATE POLICY "products_delete_auth" ON public.products
--    FOR DELETE TO authenticated USING (true);
--
--  DROP POLICY IF EXISTS "catalog_backups_select" ON public.catalog_backups;
--  DROP POLICY IF EXISTS "catalog_backups_insert" ON public.catalog_backups;
--  DROP POLICY IF EXISTS "catalog_backups_delete" ON public.catalog_backups;
--  CREATE POLICY "catalog_backups_all_auth" ON public.catalog_backups
--    FOR ALL TO authenticated USING (true) WITH CHECK (true);
--
--  NO ejecutar este bloque antes de migrar el login, o el panel deja de guardar.
-- =============================================================================

-- =============================================================================
--  10. OPCIONAL · Copia diaria automática con pg_cron
--      Supabase → Database → Extensions → habilitar "pg_cron", y después:
--
--  SELECT cron.schedule(
--    'backup-diario-catalogo',
--    '0 6 * * *',                       -- 06:00 UTC = 03:00 en Argentina
--    $job$
--      INSERT INTO public.catalog_backups (reason, product_count, payload)
--      SELECT 'diario', count(*), coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
--      FROM public.products t;
--    $job$
--  );
-- =============================================================================
