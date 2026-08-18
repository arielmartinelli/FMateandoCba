/**
 * =============================================================================
 *  EXTRAER IMÁGENES BASE64 DE SUPABASE  →  ARCHIVOS EN /public
 * =============================================================================
 *
 *  QUÉ HACE
 *    1. Se conecta directo a PostgreSQL (no pasa por la API REST, así que
 *       funciona aunque el proyecto esté restringido por egress).
 *    2. Busca los productos cuya `image_url` es un base64 incrustado.
 *    3. Guarda cada foto como archivo en  public/fmateando/subidas/<slug>.webp
 *       (recomprimida y redimensionada; si no está `sharp`, las deja como .jpg).
 *    4. Genera  scripts/actualizar-imagenes.sql  con los UPDATE necesarios.
 *
 *  POR QUÉ
 *    Guardar fotos dentro de la tabla hace que CADA visita del sitio se baje
 *    la base entera. Es lo que consumió 18,88 GB de los 5 GB gratuitos.
 *    Servidas desde /public las entrega Vercel por CDN, gratis y mucho más rápido.
 *
 *  CÓMO USARLO
 *
 *    1) Copiá la cadena de conexión:
 *         Supabase → tu proyecto → Connect → "Session pooler" → URI
 *       (usa la del pooler, no la directa: funciona desde cualquier red)
 *
 *    2) En PowerShell, parado en la carpeta del proyecto:
 *
 *         npm install pg sharp --save-dev
 *         $env:DATABASE_URL="postgresql://postgres.xxxx:TU_PASSWORD@aws-0-....pooler.supabase.com:5432/postgres"
 *         node scripts/extraer-imagenes.mjs
 *
 *    3) Revisá que hayan aparecido las fotos en public/fmateando/subidas/
 *
 *    4) Abrí scripts/actualizar-imagenes.sql, copiá todo y pegalo en
 *       Supabase → SQL Editor → Run.
 *
 *    5) git add -A && git commit -m "Mover imagenes base64 a archivos" && git push
 *
 *  ⚠ El script NO modifica la base por su cuenta: sólo lee y te deja el SQL
 *    preparado para que lo revises antes de aplicarlo.
 * =============================================================================
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DEST_DIR = path.join('public', 'fmateando', 'subidas');
const URL_BASE = '/fmateando/subidas';
const SQL_OUT = path.join('scripts', 'actualizar-imagenes.sql');
const MAX_LADO = 1280;
const CALIDAD = 82;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(`
❌ Falta la variable DATABASE_URL.

   Copiala de: Supabase → tu proyecto → Connect → Session pooler → URI

   PowerShell:
     $env:DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-....pooler.supabase.com:5432/postgres"

   Bash:
     export DATABASE_URL="postgresql://..."
`);
  process.exit(1);
}

/* -------------------------------------------------------------------------- */

let pg;
try {
  pg = await import('pg');
} catch {
  console.error('❌ Falta el paquete `pg`. Instalalo con:  npm install pg --save-dev');
  process.exit(1);
}

// `sharp` es opcional: si está, comprime a WebP (mucho más liviano).
let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.warn('⚠  `sharp` no está instalado: las fotos se guardan sin recomprimir.');
  console.warn('   Para que pesen ~70% menos:  npm install sharp --save-dev\n');
}

const escapeSql = (s) => String(s).replace(/'/g, "''");

const slugify = (texto, respaldo) =>
  String(texto || respaldo || 'producto')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'producto';

const formatoMB = (bytes) => (bytes / 1024 / 1024).toFixed(2);

/* -------------------------------------------------------------------------- */

console.log('→ Conectando a PostgreSQL…');

/** Supabase exige SSL; un Postgres local puede no soportarlo. Probamos ambos. */
async function conectar() {
  for (const ssl of [{ rejectUnauthorized: false }, false]) {
    const c = new pg.default.Client({ connectionString, ssl });
    try {
      await c.connect();
      return c;
    } catch (err) {
      await c.end().catch(() => {});
      if (/does not support SSL/i.test(err.message)) continue; // reintentar sin SSL
      throw err;
    }
  }
  throw new Error('no se pudo establecer la conexión');
}

let client;
try {
  client = await conectar();
} catch (err) {
  console.error(`\n❌ No se pudo conectar: ${err.message}\n`);
  console.error('   Revisá que la contraseña de la URI sea correcta y que estés');
  console.error('   usando la cadena del "Session pooler" (puerto 5432 o 6543).\n');
  process.exit(1);
}

// ¿Existe la columna slug? (puede que todavía no se haya corrido la migración v2)
const { rows: cols } = await client.query(
  `SELECT column_name FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'products'`
);
const nombresCol = new Set(cols.map((c) => c.column_name));
const tieneSlug = nombresCol.has('slug');

if (nombresCol.size === 0) {
  console.error('❌ No se encontró la tabla public.products.');
  await client.end();
  process.exit(1);
}

const { rows: total } = await client.query(
  `SELECT count(*)::int AS n, coalesce(sum(length(image_url)), 0)::bigint AS bytes
   FROM public.products`
);
console.log(
  `→ ${total[0].n} productos · ${formatoMB(Number(total[0].bytes))} MB sólo en el campo image_url\n`
);

const { rows } = await client.query(
  `SELECT id, ${tieneSlug ? 'slug' : 'NULL AS slug'}, name, image_url
   FROM public.products
   WHERE image_url LIKE 'data:image/%'
   ORDER BY length(image_url) DESC`
);

if (rows.length === 0) {
  console.log('✅ Ningún producto tiene la imagen incrustada como base64. No hay nada que hacer.');
  await client.end();
  process.exit(0);
}

console.log(`→ ${rows.length} productos con la foto incrustada. Extrayendo…\n`);

await fs.mkdir(DEST_DIR, { recursive: true });

const sentencias = [];
const usados = new Set();
let bytesAntes = 0;
let bytesDespues = 0;
let fallidos = 0;

for (const [i, row] of rows.entries()) {
  const etiqueta = `${String(i + 1).padStart(3)}/${rows.length}`;
  try {
    const coincide = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(row.image_url);
    if (!coincide) throw new Error('el data URL no tiene un formato reconocible');

    const [, extOriginal, datos] = coincide;
    const buffer = Buffer.from(datos, 'base64');
    bytesAntes += row.image_url.length;

    // Nombre de archivo único y estable
    let base = slugify(row.slug || row.name, row.id);
    while (usados.has(base)) base = `${base}-${row.id.slice(0, 6)}`;
    usados.add(base);

    let salida;
    let nombreArchivo;

    if (sharp) {
      salida = await sharp(buffer)
        .rotate() // respeta la orientación EXIF
        .resize({ width: MAX_LADO, height: MAX_LADO, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: CALIDAD })
        .toBuffer();
      nombreArchivo = `${base}.webp`;
    } else {
      salida = buffer;
      nombreArchivo = `${base}.${extOriginal === 'jpeg' ? 'jpg' : extOriginal}`;
    }

    await fs.writeFile(path.join(DEST_DIR, nombreArchivo), salida);
    bytesDespues += salida.length;

    const nuevaUrl = `${URL_BASE}/${nombreArchivo}`;
    sentencias.push(
      `UPDATE public.products SET image_url = '${escapeSql(nuevaUrl)}' WHERE id = '${row.id}';`
    );

    const antesKb = Math.round(row.image_url.length / 1024);
    const despuesKb = Math.round(salida.length / 1024);
    console.log(`  ${etiqueta}  ${nombreArchivo.padEnd(46)} ${antesKb} KB → ${despuesKb} KB`);
  } catch (err) {
    fallidos++;
    console.warn(`  ${etiqueta}  ⚠ "${row.name}": ${err.message}`);
  }
}

await client.end();

if (sentencias.length === 0) {
  console.error('\n❌ No se pudo extraer ninguna imagen.');
  process.exit(1);
}

const cabecera = `-- =============================================================================
--  Reemplaza las imágenes base64 por rutas a archivos servidos por Vercel.
--
--  Generado por scripts/extraer-imagenes.mjs
--  ${sentencias.length} productos · ${formatoMB(bytesAntes)} MB liberados de la base
--
--  ⚠ ANTES DE EJECUTAR: subí los archivos nuevos con
--       git add -A && git commit -m "Mover imagenes base64 a archivos" && git push
--     Si ejecutás esto antes del deploy, las fotos no se van a ver hasta que suba.
-- =============================================================================

BEGIN;

-- Copia de seguridad por las dudas (podés borrar esta tabla más adelante)
CREATE TABLE IF NOT EXISTS public.products_imagenes_backup AS
  SELECT id, image_url, timezone('utc', now()) AS guardado_el
  FROM public.products WHERE false;

INSERT INTO public.products_imagenes_backup (id, image_url, guardado_el)
SELECT id, image_url, timezone('utc', now())
FROM public.products WHERE image_url LIKE 'data:image/%';

`;

const pie = `
COMMIT;

-- Verificación: debería devolver 0
-- SELECT count(*) FROM public.products WHERE image_url LIKE 'data:image/%';

-- Peso del campo image_url después del cambio (debería ser de unos pocos KB)
-- SELECT pg_size_pretty(sum(length(image_url))::bigint) FROM public.products;

-- Cuando confirmes que todas las fotos se ven bien en el sitio, podés liberar
-- el espacio del respaldo:
-- DROP TABLE public.products_imagenes_backup;
-- VACUUM FULL public.products;
`;

await fs.writeFile(SQL_OUT, cabecera + sentencias.join('\n') + pie, 'utf8');

console.log(`
─────────────────────────────────────────────────────────────
✅ Listo

   Imágenes extraídas : ${sentencias.length}${fallidos ? ` (${fallidos} con error)` : ''}
   En la base ocupaban: ${formatoMB(bytesAntes)} MB
   Como archivos pesan: ${formatoMB(bytesDespues)} MB
   Liberado de la base: ${formatoMB(bytesAntes)} MB

   Archivos  → ${DEST_DIR}/
   SQL       → ${SQL_OUT}

─────────────────────────────────────────────────────────────
 AHORA, EN ESTE ORDEN:

   1. git add -A
      git commit -m "Mover imagenes base64 a archivos estaticos"
      git push                       ← esperá a que Vercel termine el deploy

   2. Copiá ${SQL_OUT} en Supabase → SQL Editor → Run

   3. Recargá el sitio y revisá que las fotos se vean

 El orden importa: si corrés el SQL antes del deploy, las fotos quedan
 apuntando a archivos que todavía no existen en el servidor.
─────────────────────────────────────────────────────────────
`);
