import {
  supabase,
  isSupabaseConfigured,
  supabaseConfigIssue,
  supabaseUrl
} from './supabaseClient';
import { INITIAL_PRODUCTS } from './data/initialProducts';

/* -------------------------------------------------------------------------- */
/*  Constantes                                                                 */
/* -------------------------------------------------------------------------- */

const LS_PRODUCTS = 'fmateando_products_v2';
const LS_PRODUCTS_LEGACY = 'fmateando_products';
const LS_SNAPSHOTS = 'fmateando_snapshots_v1';
const LS_SEED_LOCK = 'fmateando_seed_lock';

const MAX_LOCAL_SNAPSHOTS = 15;
const MAX_REMOTE_SNAPSHOTS = 60;

/** Columnas reales de `products`. Todo lo demás se descarta antes de escribir. */
const PRODUCT_COLUMNS = [
  'slug',
  'name',
  'description',
  'price',
  'image_url',
  'category',
  'subcategory',
  'sub_subgroup',
  'is_out_of_stock',
  'is_promo',
  'promo_price',
  'stock_quantity'
];

/* -------------------------------------------------------------------------- */
/*  Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

const ok = (extra = {}) => ({ ok: true, error: null, ...extra });
const fail = (error, extra = {}) => ({ ok: false, error, ...extra });

/** Traduce errores de Supabase/PostgREST a algo accionable en castellano. */
export function describeDbError(err) {
  if (!err) return 'Error desconocido.';
  const code = err.code || err.status || '';
  const msg = err.message || String(err);

  if (code === '22P02' || /invalid input syntax for type uuid/i.test(msg)) {
    return 'El producto que intentaste guardar no existe en la base (su ID no es un UUID válido). Suele pasar cuando el catálogo se está mostrando desde la copia local en vez de Supabase. Sembrá el catálogo en Supabase desde el panel y volvé a intentar.';
  }
  if (code === '42P01' || /relation .* does not exist/i.test(msg)) {
    return 'La tabla no existe en Supabase. Ejecutá el script supabase_schema.sql en el SQL Editor de tu proyecto.';
  }
  if (code === '42703' || /column .* does not exist/i.test(msg)) {
    return `Falta una columna en la tabla de Supabase (${msg}). Ejecutá supabase_migration_v2.sql en el SQL Editor.`;
  }
  if (code === '42501' || /row-level security|violates row-level/i.test(msg)) {
    return 'Row Level Security bloqueó la escritura. Revisá las políticas de la tabla en Supabase (ver supabase_migration_v2.sql).';
  }
  if (code === '23505' || /duplicate key/i.test(msg)) {
    return 'Ya existe un producto con ese identificador (slug duplicado).';
  }
  if (code === '413' || /payload too large|value too long/i.test(msg)) {
    return 'La imagen es demasiado pesada para guardarla dentro de la fila. Subí una foto más liviana o usá el Storage de Supabase.';
  }
  if (/Failed to fetch|NetworkError|fetch failed/i.test(msg)) {
    return 'No se pudo contactar a Supabase (red, CORS o proyecto pausado). Verificá que el proyecto esté activo y que la URL sea correcta.';
  }
  if (/Invalid API key|JWT|apikey/i.test(msg)) {
    return 'La clave de Supabase (VITE_SUPABASE_ANON_KEY) es inválida o no corresponde a este proyecto.';
  }
  return msg;
}

const toNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** Normaliza un producto venga de donde venga (Supabase, JSON, localStorage). */
export function normalizeProduct(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const price = toNumberOrNull(raw.price);
  return {
    id: raw.id ?? raw.slug ?? null,
    slug: raw.slug ?? null,
    name: String(raw.name ?? '').trim(),
    description: String(raw.description ?? '').trim(),
    price: price === null ? 0 : price,
    image_url: String(raw.image_url ?? ''),
    category: raw.category ?? 'mates',
    subcategory: raw.subcategory ?? 'todos',
    sub_subgroup: raw.sub_subgroup ?? '',
    is_out_of_stock: !!raw.is_out_of_stock,
    is_promo: !!raw.is_promo,
    promo_price: toNumberOrNull(raw.promo_price),
    stock_quantity: toNumberOrNull(raw.stock_quantity),
    created_at: raw.created_at ?? null
  };
}

const normalizeList = (list) =>
  (Array.isArray(list) ? list : []).map(normalizeProduct).filter(Boolean);

/** Deja sólo las columnas que la tabla acepta. Nunca manda `id` ni `created_at`. */
function toWritablePayload(product, { includeSlug = true } = {}) {
  const payload = {};
  for (const key of PRODUCT_COLUMNS) {
    if (key === 'slug' && !includeSlug) continue;
    if (product[key] === undefined) continue;
    payload[key] = product[key];
  }
  if (payload.price !== undefined) payload.price = toNumberOrNull(payload.price) ?? 0;
  if (payload.promo_price !== undefined) payload.promo_price = toNumberOrNull(payload.promo_price);
  if (payload.stock_quantity !== undefined) payload.stock_quantity = toNumberOrNull(payload.stock_quantity);
  if (payload.is_out_of_stock !== undefined) payload.is_out_of_stock = !!payload.is_out_of_stock;
  if (payload.is_promo !== undefined) payload.is_promo = !!payload.is_promo;
  return payload;
}

/**
 * Un producto está sin stock si está marcado como agotado O si tiene cantidad
 * gestionada y llegó a cero. Si `stock_quantity` es null la cantidad no se
 * gestiona y manda el flag de siempre (no cambia el comportamiento actual).
 */
export function isSoldOut(product) {
  if (!product) return false;
  if (product.is_out_of_stock) return true;
  return (
    product.stock_quantity !== null &&
    product.stock_quantity !== undefined &&
    product.stock_quantity <= 0
  );
}

export function effectivePrice(product) {
  return product?.is_promo && product?.promo_price ? product.promo_price : product?.price ?? 0;
}

const isUuid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/* -------------------------------------------------------------------------- */
/*  Copia local (espejo / modo sin Supabase)                                    */
/* -------------------------------------------------------------------------- */

const hasLocalStorage = (() => {
  try {
    const k = '__fm_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
})();

function readLocal(key, fallback = null) {
  if (!hasLocalStorage) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/** Devuelve `{ ok, error }`; NO lanza. La cuota llena era un fallo mudo. */
function writeLocal(key, value) {
  if (!hasLocalStorage) {
    return fail('El navegador tiene el almacenamiento local deshabilitado (¿modo incógnito?).');
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return ok();
  } catch (err) {
    if (err && (err.name === 'QuotaExceededError' || err.code === 22)) {
      return fail(
        'Se llenó el almacenamiento del navegador (límite ~5 MB). Casi siempre es por fotos pesadas guardadas como base64: subí imágenes más livianas o conectá Supabase Storage.'
      );
    }
    return fail(err.message || 'No se pudo escribir en el almacenamiento local.');
  }
}

/**
 * Lee la copia local. A diferencia de la versión anterior, NUNCA descarta lo
 * guardado por tener menos productos que el catálogo inicial — ese chequeo era
 * el que borraba todas las ediciones apenas se eliminaba un producto.
 */
function getLocalProducts() {
  let stored = readLocal(LS_PRODUCTS, null);

  if (!Array.isArray(stored)) {
    const legacy = readLocal(LS_PRODUCTS_LEGACY, null);
    if (Array.isArray(legacy) && legacy.length > 0) {
      stored = legacy;
      writeLocal(LS_PRODUCTS, legacy);
    }
  }

  if (!Array.isArray(stored)) {
    const seeded = INITIAL_PRODUCTS.map((p) => ({ ...p, id: p.slug }));
    writeLocal(LS_PRODUCTS, seeded);
    return normalizeList(seeded);
  }

  return normalizeList(stored);
}

const saveLocalProducts = (products) => writeLocal(LS_PRODUCTS, products);

/* -------------------------------------------------------------------------- */
/*  Snapshots (copias de seguridad)                                            */
/* -------------------------------------------------------------------------- */

function getLocalSnapshots() {
  const list = readLocal(LS_SNAPSHOTS, []);
  return Array.isArray(list) ? list : [];
}

function saveLocalSnapshot(snapshot) {
  const list = [snapshot, ...getLocalSnapshots()].slice(0, MAX_LOCAL_SNAPSHOTS);
  return writeLocal(LS_SNAPSHOTS, list);
}

/* -------------------------------------------------------------------------- */
/*  Servicio                                                                   */
/* -------------------------------------------------------------------------- */

export const productService = {
  /* ---------------------------------------------------------------- lectura */

  /**
   * Ya no hace seed automático a ciegas: si la tabla está vacía lo informa con
   * `needsSeed` para que el admin decida. Eso elimina la carrera que duplicaba
   * el catálogo y el bucle que reinsertaba en cada carga.
   */
  async getProducts() {
    if (!isSupabaseConfigured) {
      return {
        ...ok(),
        products: getLocalProducts(),
        source: 'local',
        needsSeed: false,
        warning: supabaseConfigIssue
      };
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const products = normalizeList(data);

      // La copia local pasa a ser sólo un espejo de lectura para emergencias.
      if (products.length > 0) saveLocalProducts(products);

      return {
        ...ok(),
        products,
        source: 'supabase',
        needsSeed: products.length === 0
      };
    } catch (err) {
      console.error('[fmateando] getProducts falló:', err);
      return {
        ...fail(describeDbError(err)),
        products: getLocalProducts(),
        source: 'local',
        needsSeed: false
      };
    }
  },

  /* -------------------------------------------------------------- escritura */

  async addProduct(input) {
    const product = normalizeProduct(input);
    if (!product) return fail('Datos de producto inválidos.');

    if (!product.slug) {
      product.slug = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    }

    if (!isSupabaseConfigured) {
      const local = getLocalProducts();
      const created = { ...product, id: product.slug, created_at: new Date().toISOString() };
      const write = saveLocalProducts([created, ...local]);
      if (!write.ok) return fail(write.error);
      return { ...ok(), product: created, source: 'local' };
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .insert([toWritablePayload(product)])
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        return fail(
          'Supabase aceptó la petición pero no devolvió la fila creada. Suele ser una política RLS de SELECT que oculta el registro nuevo.'
        );
      }
      return { ...ok(), product: normalizeProduct(data[0]), source: 'supabase' };
    } catch (err) {
      console.error('[fmateando] addProduct falló:', err);
      return fail(describeDbError(err));
    }
  },

  /**
   * Actualiza un producto. Clave del arreglo: si Supabase devuelve 0 filas
   * afectadas se considera ERROR, no éxito. Antes ese caso caía en el fallback
   * a localStorage y la UI decía "actualizado con éxito" sin haber guardado nada.
   */
  async updateProduct(id, updates) {
    if (id === null || id === undefined || id === '') {
      return fail('No se indicó qué producto actualizar.');
    }

    const patch = toWritablePayload(normalizeProduct({ ...updates, id }), { includeSlug: false });

    if (!isSupabaseConfigured) {
      const local = getLocalProducts();
      const exists = local.some((p) => String(p.id) === String(id));
      if (!exists) return fail('El producto no existe en la copia local.');
      const next = local.map((p) => (String(p.id) === String(id) ? { ...p, ...patch } : p));
      const write = saveLocalProducts(next);
      if (!write.ok) return fail(write.error);
      return {
        ...ok(),
        product: next.find((p) => String(p.id) === String(id)),
        source: 'local'
      };
    }

    if (!isUuid(String(id))) {
      return fail(
        `El producto tiene el ID "${id}", que no es un UUID de Supabase: el catálogo se está mostrando desde la copia local. Usá "Sembrar catálogo en Supabase" en el panel y recargá antes de editar.`
      );
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .update(patch)
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        return fail(
          'Supabase no actualizó ninguna fila (0 filas afectadas). O el producto ya no existe, o una política RLS está bloqueando el UPDATE. Ejecutá supabase_migration_v2.sql y volvé a intentar.'
        );
      }

      const product = normalizeProduct(data[0]);

      const local = getLocalProducts();
      saveLocalProducts(local.map((p) => (String(p.id) === String(id) ? product : p)));

      return { ...ok(), product, source: 'supabase' };
    } catch (err) {
      console.error('[fmateando] updateProduct falló:', err);
      return fail(describeDbError(err));
    }
  },

  async deleteProduct(id) {
    if (!isSupabaseConfigured) {
      const local = getLocalProducts();
      const write = saveLocalProducts(local.filter((p) => String(p.id) !== String(id)));
      if (!write.ok) return fail(write.error);
      return { ...ok(), source: 'local' };
    }

    if (!isUuid(String(id))) {
      return fail(`El producto con ID "${id}" no existe en Supabase (no es un UUID).`);
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        return fail(
          'Supabase no eliminó ninguna fila. Puede ser una política RLS de DELETE o que el producto ya no exista.'
        );
      }

      const local = getLocalProducts();
      saveLocalProducts(local.filter((p) => String(p.id) !== String(id)));

      return { ...ok(), source: 'supabase' };
    } catch (err) {
      console.error('[fmateando] deleteProduct falló:', err);
      return fail(describeDbError(err));
    }
  },

  /**
   * Ajusta sólo la cantidad de stock, sin tocar ningún otro campo.
   * `quantity === null` = "no gestionar cantidad" (vuelve al flag de agotado).
   */
  async setStockQuantity(id, quantity) {
    const value =
      quantity === null || quantity === '' ? null : Math.max(0, Math.trunc(Number(quantity) || 0));
    return this.updateProduct(id, { stock_quantity: value });
  },

  async setOutOfStock(id, isOut) {
    return this.updateProduct(id, { is_out_of_stock: !!isOut });
  },

  /* ---------------------------------------------------------------- siembra */

  /**
   * Siembra el catálogo inicial. Es idempotente: usa `slug` como clave de
   * conflicto, así que ejecutarlo dos veces no duplica nada.
   */
  async seedInitialCatalog({ force = false } = {}) {
    if (!isSupabaseConfigured) {
      const write = saveLocalProducts(INITIAL_PRODUCTS.map((p) => ({ ...p, id: p.slug })));
      if (!write.ok) return fail(write.error);
      return { ...ok(), products: getLocalProducts(), source: 'local' };
    }

    if (!force && hasLocalStorage && window.localStorage.getItem(LS_SEED_LOCK) === '1') {
      return fail('La siembra ya se intentó en esta sesión. Recargá la página o usá "Forzar siembra".');
    }

    try {
      const { count, error: countError } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true });

      if (countError) throw countError;

      if (!force && (count ?? 0) > 0) {
        return fail(`La tabla ya tiene ${count} productos. No se sembró nada para no duplicar.`);
      }

      const rows = INITIAL_PRODUCTS.map((p) => toWritablePayload(normalizeProduct(p)));
      const { data, error } = await supabase
        .from('products')
        .upsert(rows, { onConflict: 'slug', ignoreDuplicates: false })
        .select();

      if (error) throw error;

      if (hasLocalStorage) window.localStorage.setItem(LS_SEED_LOCK, '1');
      const products = normalizeList(data);
      saveLocalProducts(products);
      return { ...ok(), products, source: 'supabase' };
    } catch (err) {
      console.error('[fmateando] seedInitialCatalog falló:', err);
      return fail(describeDbError(err));
    }
  },

  /* ---------------------------------------------------------- backups JSON */

  exportBackup(products) {
    const payload = {
      app: 'fmateando-cba',
      version: 2,
      exported_at: new Date().toISOString(),
      source: isSupabaseConfigured ? 'supabase' : 'local',
      count: Array.isArray(products) ? products.length : 0,
      products: normalizeList(products)
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fmateando_backup_${new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return ok({ count: payload.count });
  },

  /** Acepta el formato nuevo (`{products:[...]}`) y el viejo (array pelado). */
  parseBackup(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return fail('El archivo no es un JSON válido.');
    }
    const list = Array.isArray(parsed) ? parsed : parsed?.products;
    if (!Array.isArray(list) || list.length === 0) {
      return fail('El archivo no contiene una lista de productos.');
    }
    const products = normalizeList(list).filter((p) => p.name && p.image_url);
    if (products.length === 0) {
      return fail('Ningún producto del archivo tiene nombre e imagen válidos.');
    }
    return { ...ok(), products, skipped: list.length - products.length };
  },

  /* -------------------------------------------------------- snapshots (BD) */

  /** Guarda una copia completa del catálogo antes/después de un cambio grande. */
  async createSnapshot(reason, products) {
    const list = normalizeList(products);
    if (list.length === 0) return fail('No hay productos para respaldar.');

    const snapshot = {
      id: `local-${Date.now()}`,
      created_at: new Date().toISOString(),
      reason: String(reason || 'manual').slice(0, 120),
      product_count: list.length,
      payload: list
    };

    if (!isSupabaseConfigured) {
      const write = saveLocalSnapshot(snapshot);
      if (!write.ok) return fail(write.error);
      return { ...ok(), snapshot, source: 'local' };
    }

    try {
      const { data, error } = await supabase
        .from('catalog_backups')
        .insert([
          {
            reason: snapshot.reason,
            product_count: snapshot.product_count,
            payload: snapshot.payload
          }
        ])
        .select('id, created_at, reason, product_count');

      if (error) throw error;

      this.pruneSnapshots().catch(() => {});

      return { ...ok(), snapshot: data?.[0] ?? snapshot, source: 'supabase' };
    } catch (err) {
      console.error('[fmateando] createSnapshot falló:', err);
      // La copia local siempre queda, aunque Supabase falle.
      saveLocalSnapshot(snapshot);
      return fail(describeDbError(err), { snapshot, source: 'local' });
    }
  },

  async listSnapshots() {
    if (!isSupabaseConfigured) {
      return {
        ...ok(),
        snapshots: getLocalSnapshots().map((s) => ({
          id: s.id,
          created_at: s.created_at,
          reason: s.reason,
          product_count: s.product_count ?? s.payload?.length ?? 0
        })),
        source: 'local'
      };
    }

    try {
      const { data, error } = await supabase
        .from('catalog_backups')
        .select('id, created_at, reason, product_count')
        .order('created_at', { ascending: false })
        .limit(MAX_REMOTE_SNAPSHOTS);

      if (error) throw error;
      return { ...ok(), snapshots: data ?? [], source: 'supabase' };
    } catch (err) {
      console.error('[fmateando] listSnapshots falló:', err);
      return {
        ...fail(describeDbError(err)),
        snapshots: getLocalSnapshots().map((s) => ({
          id: s.id,
          created_at: s.created_at,
          reason: s.reason,
          product_count: s.product_count ?? 0
        })),
        source: 'local'
      };
    }
  },

  async getSnapshotProducts(snapshotId) {
    if (!isSupabaseConfigured || String(snapshotId).startsWith('local-')) {
      const snap = getLocalSnapshots().find((s) => String(s.id) === String(snapshotId));
      if (!snap) return fail('No se encontró esa copia de seguridad.');
      return { ...ok(), products: normalizeList(snap.payload) };
    }

    try {
      const { data, error } = await supabase
        .from('catalog_backups')
        .select('payload')
        .eq('id', snapshotId)
        .single();

      if (error) throw error;
      return { ...ok(), products: normalizeList(data?.payload) };
    } catch (err) {
      return fail(describeDbError(err));
    }
  },

  async pruneSnapshots() {
    if (!isSupabaseConfigured) return ok();
    try {
      const { data, error } = await supabase
        .from('catalog_backups')
        .select('id')
        .order('created_at', { ascending: false })
        .range(MAX_REMOTE_SNAPSHOTS, MAX_REMOTE_SNAPSHOTS + 200);

      if (error || !data || data.length === 0) return ok();
      await supabase
        .from('catalog_backups')
        .delete()
        .in(
          'id',
          data.map((r) => r.id)
        );
      return ok();
    } catch {
      return ok();
    }
  },

  /* ------------------------------------------------------------ restauración */

  /**
   * Restaura una lista completa. Antes borraba TODO y después insertaba: si el
   * insert fallaba te quedabas sin catálogo. Ahora: snapshot previo → upsert por
   * slug → recién entonces borra lo que sobra. Si algo falla, nada se perdió.
   */
  async restoreProducts(list, { reason = 'restauración manual', currentProducts = [] } = {}) {
    const incoming = normalizeList(list);
    if (incoming.length === 0) return fail('La lista a restaurar está vacía.');

    if (currentProducts.length > 0) {
      await this.createSnapshot(`antes de: ${reason}`, currentProducts);
    }

    // Garantizamos un slug estable para poder hacer upsert idempotente.
    const seen = new Set();
    const withSlugs = incoming.map((p, i) => {
      let slug =
        p.slug ||
        `restored-${(p.name || 'item')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 48)}`;
      while (seen.has(slug)) slug = `${slug}-${i}`;
      seen.add(slug);
      return { ...p, slug };
    });

    if (!isSupabaseConfigured) {
      const write = saveLocalProducts(withSlugs.map((p) => ({ ...p, id: p.id || p.slug })));
      if (!write.ok) return fail(write.error);
      return { ...ok(), products: getLocalProducts(), source: 'local' };
    }

    try {
      const rows = withSlugs.map((p) => toWritablePayload(p));
      const { error } = await supabase
        .from('products')
        .upsert(rows, { onConflict: 'slug', ignoreDuplicates: false })
        .select('id');

      if (error) throw error;

      const keptSlugs = new Set(withSlugs.map((p) => p.slug));
      const { data: all, error: listError } = await supabase.from('products').select('id, slug');
      if (!listError && Array.isArray(all)) {
        const toDelete = all.filter((r) => !keptSlugs.has(r.slug)).map((r) => r.id);
        if (toDelete.length > 0) {
          await supabase.from('products').delete().in('id', toDelete);
        }
      }

      const { data: fresh } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      const products = normalizeList(fresh);
      saveLocalProducts(products);
      return { ...ok(), products, source: 'supabase' };
    } catch (err) {
      console.error('[fmateando] restoreProducts falló:', err);
      return fail(describeDbError(err));
    }
  },

  async restoreSnapshot(snapshotId, currentProducts = []) {
    const res = await this.getSnapshotProducts(snapshotId);
    if (!res.ok) return res;
    return this.restoreProducts(res.products, {
      reason: `restauración de copia ${snapshotId}`,
      currentProducts
    });
  },

  async restoreInitialProducts(currentProducts = []) {
    return this.restoreProducts(INITIAL_PRODUCTS, {
      reason: 'restablecer catálogo original de 64 productos',
      currentProducts
    });
  },

  /* ------------------------------------------------------------ diagnóstico */

  /** Prueba real de lectura y escritura. Es lo que alimenta el panel de estado. */
  async diagnose() {
    const report = {
      configured: isSupabaseConfigured,
      url: supabaseUrl ? supabaseUrl.replace(/^https:\/\//, '') : '(sin configurar)',
      configIssue: supabaseConfigIssue,
      localStorage: hasLocalStorage,
      productCount: null,
      checks: []
    };

    const push = (name, okFlag, detail) => report.checks.push({ name, ok: okFlag, detail });

    if (!isSupabaseConfigured) {
      push('Variables de entorno', false, supabaseConfigIssue);
      push(
        'Modo actual',
        false,
        'Guardando SÓLO en el navegador (localStorage). Los cambios no se ven en otros dispositivos y se pierden al limpiar el navegador.'
      );
      return report;
    }

    push('Variables de entorno', true, 'VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY presentes.');

    // 1. Lectura
    try {
      const { count, error } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true });
      if (error) throw error;
      report.productCount = count ?? 0;
      push('Lectura de products', true, `${count ?? 0} productos en la base.`);
    } catch (err) {
      push('Lectura de products', false, describeDbError(err));
      return report;
    }

    // 2. Columnas nuevas
    try {
      const { error } = await supabase.from('products').select('slug, stock_quantity').limit(1);
      if (error) throw error;
      push('Columnas slug y stock_quantity', true, 'Presentes.');
    } catch (err) {
      push('Columnas slug y stock_quantity', false, describeDbError(err));
    }

    // 3. Escritura real (round-trip sobre una fila propia, sin efectos)
    try {
      const { data: sample, error: readErr } = await supabase
        .from('products')
        .select('id, is_out_of_stock')
        .limit(1);
      if (readErr) throw readErr;

      if (!sample || sample.length === 0) {
        push('Escritura', false, 'No hay productos para probar. Sembrá el catálogo primero.');
      } else {
        const row = sample[0];
        const { data, error } = await supabase
          .from('products')
          .update({ is_out_of_stock: row.is_out_of_stock })
          .eq('id', row.id)
          .select('id');
        if (error) throw error;
        if (!data || data.length === 0) {
          push(
            'Escritura',
            false,
            '0 filas afectadas: RLS está bloqueando el UPDATE. Ejecutá supabase_migration_v2.sql en el SQL Editor de Supabase. Ésta es la causa más probable de que el stock no se guarde.'
          );
        } else {
          push('Escritura', true, 'UPDATE confirmado por la base (round-trip OK).');
        }
      }
    } catch (err) {
      push('Escritura', false, describeDbError(err));
    }

    // 4. Tabla de backups
    try {
      const { error } = await supabase
        .from('catalog_backups')
        .select('id', { count: 'exact', head: true });
      if (error) throw error;
      push('Tabla catalog_backups', true, 'Lista para guardar copias de seguridad.');
    } catch (err) {
      push('Tabla catalog_backups', false, describeDbError(err));
    }

    return report;
  }
};

export { INITIAL_PRODUCTS };
