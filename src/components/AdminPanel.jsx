import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  Image as ImageIcon,
  Download,
  Upload,
  RotateCcw,
  Database,
  AlertTriangle,
  CheckCircle2,
  HardDriveDownload,
  Sprout,
  Minus,
  Loader2,
  UploadCloud
} from 'lucide-react';
import { productService, isSoldOut } from '../productService';
import { isSupabaseConfigured, supabaseUrl } from '../supabaseClient';

/* -------------------------------------------------------------------------- */
/*  Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Reduce la foto antes de convertirla a base64. Sin esto, una foto de celular
 * de 3 MB se guardaba como ~4 MB de texto dentro de la fila: reventaba la cuota
 * de localStorage (fallo mudo) y hacía enormes las respuestas de Supabase.
 */
function compressImage(file, { maxSide = 1000, quality = 0.75 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve({
          dataUrl: canvas.toDataURL('image/jpeg', quality),
          width: w,
          height: h
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const approxKb = (dataUrl) =>
  typeof dataUrl === 'string' && dataUrl.startsWith('data:')
    ? Math.round((dataUrl.length * 0.75) / 1024)
    : null;

const formatDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
};

/* -------------------------------------------------------------------------- */
/*  Componente                                                                 */
/* -------------------------------------------------------------------------- */

export default function AdminPanel({
  products,
  loading = false,
  dataSource = 'local',
  dataError = null,
  needsSeed = false,
  onReload,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onExportBackup,
  onExportCatalogoEstatico,
  onRestoreBackupFile,
  onRestoreInitial,
  onSeedCatalog,
  onCreateSnapshot,
  onRestoreSnapshot
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Feedback (reemplaza los alert() que mentían diciendo "guardado con éxito")
  const [notice, setNotice] = useState(null); // { type:'ok'|'error'|'info', text }
  const [busy, setBusy] = useState(false);

  // Diagnóstico de conexión
  const [diag, setDiag] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);

  // Copias de seguridad
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);

  // Formulario
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('mates');
  const [subcategory, setSubcategory] = useState('imperial');
  const [subSubgroup, setSubSubgroup] = useState('calabaza');
  const [imageFilePreview, setImageFilePreview] = useState('');
  const [imageNote, setImageNote] = useState('');
  const [isOutOfStock, setIsOutOfStock] = useState(false);
  const [manageQuantity, setManageQuantity] = useState(false);
  const [stockQuantity, setStockQuantity] = useState('');
  const [isPromo, setIsPromo] = useState(false);
  const [promoPrice, setPromoPrice] = useState('');

  const say = useCallback((type, text) => {
    setNotice({ type, text });
    if (type === 'ok') setTimeout(() => setNotice(null), 6000);
  }, []);

  useEffect(() => {
    const savedAuth = sessionStorage.getItem('fmateando_admin_auth');
    if (savedAuth === 'true') setIsAuthenticated(true);
  }, []);

  const runDiagnosis = useCallback(async () => {
    setDiagLoading(true);
    const report = await productService.diagnose();
    setDiag(report);
    setDiagLoading(false);
    return report;
  }, []);

  const loadSnapshots = useCallback(async () => {
    setSnapshotsLoading(true);
    const res = await productService.listSnapshots();
    setSnapshots(res.snapshots || []);
    setSnapshotsLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      runDiagnosis();
      loadSnapshots();
    }
  }, [isAuthenticated, runDiagnosis, loadSnapshots]);

  const handleLogin = (e) => {
    e.preventDefault();
    const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'montañita';
    if (password === correctPassword) {
      setIsAuthenticated(true);
      setLoginError('');
      // sessionStorage: la sesión muere al cerrar la pestaña (antes quedaba
      // abierta para siempre en localStorage en cualquier navegador del mundo).
      sessionStorage.setItem('fmateando_admin_auth', 'true');
    } else {
      setLoginError('Contraseña incorrecta. Intenta de nuevo.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    sessionStorage.removeItem('fmateando_admin_auth');
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { dataUrl, width, height } = await compressImage(file);
      setImageFilePreview(dataUrl);
      setImageUrl(dataUrl);
      const kb = approxKb(dataUrl);
      setImageNote(
        `Optimizada a ${width}×${height}px · ~${kb} KB · se guarda dentro de la base de datos`
      );
      // Cada foto incrustada se descarga en CADA visita al sitio. Es lo que
      // consumió los 18,88 GB de egress: hay que avisarlo fuerte.
      if (kb > 150) {
        say(
          'info',
          `Ojo: esta foto pesa ~${kb} KB y se guarda dentro de la base de datos, así que se descarga en cada visita al sitio. Lo recomendable es poner el archivo en public/fmateando/ del proyecto y pegar acá la ruta (ej: /fmateando/mates/imperial/mi-foto.webp).`
        );
      }
    } catch (err) {
      say('error', err.message || 'No se pudo procesar la imagen.');
    }
  };

  const handleCategorySelectChange = (e) => {
    const newCategory = e.target.value;
    setCategory(newCategory);
    if (newCategory === 'mates') {
      setSubcategory('imperial');
      setSubSubgroup('calabaza');
    } else if (newCategory === 'bombillas') {
      setSubcategory('acero');
      setSubSubgroup('');
    } else if (newCategory === 'accesorios') {
      setSubcategory('todos');
      setSubSubgroup('');
    }
  };

  const handleSubcategorySelectChange = (e) => {
    const newSubcategory = e.target.value;
    setSubcategory(newSubcategory);
    if (category === 'mates') {
      if (newSubcategory === 'imperial') setSubSubgroup('calabaza');
      else if (newSubcategory === 'rustico') setSubSubgroup('algarrobo');
      else if (['torpedo', 'galleta', 'camionera'].includes(newSubcategory)) setSubSubgroup('comun');
      else setSubSubgroup('');
    } else {
      setSubSubgroup('');
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setName('');
    setDescription('');
    setPrice('');
    setImageUrl('');
    setImageFilePreview('');
    setImageNote('');
    setCategory('mates');
    setSubcategory('imperial');
    setSubSubgroup('calabaza');
    setIsOutOfStock(false);
    setManageQuantity(false);
    setStockQuantity('');
    setIsPromo(false);
    setPromoPrice('');
  };

  const handleEditClick = (product) => {
    setIsEditing(true);
    setEditId(product.id);
    setName(product.name || '');
    setDescription(product.description || '');
    setPrice(product.price !== null && product.price !== undefined ? String(product.price) : '');
    setImageUrl(product.image_url || '');
    setImageFilePreview(product.image_url || '');
    setImageNote('');
    setCategory(product.category || 'mates');
    setSubcategory(product.subcategory || 'imperial');
    setSubSubgroup(product.sub_subgroup || '');
    setIsOutOfStock(!!product.is_out_of_stock);
    const hasQty = product.stock_quantity !== null && product.stock_quantity !== undefined;
    setManageQuantity(hasQty);
    setStockQuantity(hasQty ? String(product.stock_quantity) : '');
    setIsPromo(!!product.is_promo);
    setPromoPrice(
      product.promo_price !== null && product.promo_price !== undefined
        ? String(product.promo_price)
        : ''
    );
    setNotice(null);
    document.getElementById('admin-form-anchor')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;

    if (!name.trim() || !price || !imageUrl) {
      say('error', 'Completá los campos obligatorios: Nombre, Precio e Imagen.');
      return;
    }
    if (isPromo && (!promoPrice || parseFloat(promoPrice) >= parseFloat(price))) {
      say('error', 'El precio de promoción debe ser menor al precio original.');
      return;
    }

    const productData = {
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      image_url: imageUrl,
      category,
      subcategory,
      sub_subgroup: subSubgroup,
      is_out_of_stock: isOutOfStock,
      stock_quantity: manageQuantity ? Math.max(0, parseInt(stockQuantity || '0', 10)) : null,
      is_promo: isPromo,
      promo_price: isPromo && promoPrice ? parseFloat(promoPrice) : null
    };

    setBusy(true);
    const res = isEditing
      ? await onUpdateProduct(editId, productData)
      : await onAddProduct(productData);
    setBusy(false);

    if (res?.ok) {
      say(
        'ok',
        `${isEditing ? 'Producto actualizado' : 'Producto agregado'} y confirmado por ${
          res.source === 'supabase' ? 'Supabase' : 'el navegador'
        }.`
      );
      resetForm();
    } else {
      say('error', `NO se guardó. ${res?.error || 'Error desconocido.'}`);
    }
  };

  const handleDeleteClick = async (product) => {
    if (!window.confirm(`¿Eliminar "${product.name}" del catálogo?`)) return;
    setBusy(true);
    const res = await onDeleteProduct(product.id);
    setBusy(false);
    if (res?.ok) say('ok', 'Producto eliminado.');
    else say('error', `No se pudo eliminar. ${res?.error}`);
  };

  /** Cambio rápido de stock desde la fila, sin abrir el formulario. */
  const quickStock = async (product, changes) => {
    setBusy(true);
    const res = await onUpdateProduct(product.id, { ...product, ...changes });
    setBusy(false);
    if (res?.ok) say('ok', `Stock de "${product.name}" actualizado y confirmado.`);
    else say('error', `NO se guardó el stock. ${res?.error}`);
  };

  const handleToggleOutOfStock = (product) =>
    quickStock(product, { is_out_of_stock: !product.is_out_of_stock });

  const handleAdjustQuantity = (product, delta) => {
    const current = product.stock_quantity ?? 0;
    quickStock(product, { stock_quantity: Math.max(0, current + delta) });
  };

  /* ------------------------------------------------------------- backups UI */

  const handleFileUploadBackup = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (
      !window.confirm(
        'Se va a reemplazar el catálogo con el contenido del archivo. Antes se guarda automáticamente una copia del estado actual. ¿Continuar?'
      )
    )
      return;
    setBusy(true);
    const res = await onRestoreBackupFile(file);
    setBusy(false);
    if (res?.ok) {
      say('ok', `Catálogo restaurado (${res.products?.length ?? 0} productos).`);
      loadSnapshots();
    } else {
      say('error', `No se pudo restaurar. ${res?.error}`);
    }
  };

  const handleManualSnapshot = async () => {
    setBusy(true);
    const res = await onCreateSnapshot('copia manual desde el panel');
    setBusy(false);
    if (res?.ok) {
      say('ok', `Copia de seguridad guardada en ${res.source === 'supabase' ? 'Supabase' : 'el navegador'}.`);
      loadSnapshots();
    } else {
      say('error', `No se pudo crear la copia. ${res?.error}`);
    }
  };

  const handleRestoreSnapshotClick = async (snap) => {
    if (
      !window.confirm(
        `Restaurar la copia del ${formatDate(snap.created_at)} (${snap.product_count} productos)? Antes se guarda una copia del estado actual.`
      )
    )
      return;
    setBusy(true);
    const res = await onRestoreSnapshot(snap.id);
    setBusy(false);
    if (res?.ok) {
      say('ok', `Catálogo restaurado a la copia del ${formatDate(snap.created_at)}.`);
      loadSnapshots();
    } else {
      say('error', `No se pudo restaurar. ${res?.error}`);
    }
  };

  const handleRestoreInitialClick = async () => {
    if (!window.confirm('¿Restablecer el catálogo a los 64 productos originales? Se guarda una copia previa.'))
      return;
    setBusy(true);
    const res = await onRestoreInitial();
    setBusy(false);
    if (res?.ok) {
      say('ok', 'Catálogo restablecido a los 64 productos originales.');
      loadSnapshots();
    } else {
      say('error', `No se pudo restablecer. ${res?.error}`);
    }
  };

  const handleSeedClick = async (force = false) => {
    if (force && !window.confirm('Forzar la siembra sobrescribe los productos que compartan slug. ¿Continuar?'))
      return;
    setBusy(true);
    const res = await onSeedCatalog({ force });
    setBusy(false);
    if (res?.ok) {
      say('ok', `Catálogo sembrado en ${res.source === 'supabase' ? 'Supabase' : 'el navegador'}.`);
      runDiagnosis();
    } else {
      say('error', res?.error);
    }
  };

  const handleExportClick = () => {
    const res = onExportBackup();
    say('ok', `Copia exportada (${res?.count ?? products.length} productos).`);
  };

  const handlePublicarClick = () => {
    const res = onExportCatalogoEstatico();
    say(
      'ok',
      `catalogo.json generado con ${res?.count ?? products.length} productos. Ahora reemplazá public/catalogo.json en el proyecto y hacé "git add -A", "git commit" y "git push". Cuando Vercel termine el deploy, todos los visitantes ven este stock.`
    );
  };

  /* ------------------------------------------------------------------ login */

  if (!isAuthenticated) {
    return (
      <section id="admin" className="admin-section">
        <div className="container">
          <div className="admin-login-card bg-glass">
            <Lock size={36} />
            <h3>Panel de Control</h3>
            <p>Ingresa la clave de administrador para gestionar productos.</p>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                autoComplete="current-password"
                required
              />
              {loginError && (
                <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem' }} role="alert">
                  {loginError}
                </p>
              )}
              <button type="submit" className="btn btn-primary">
                Ingresar
              </button>
            </form>
          </div>
        </div>
      </section>
    );
  }

  /* ------------------------------------------------------------------ panel */

  const usingSupabase = dataSource === 'supabase';
  const usingArchivo = dataSource === 'archivo';
  const failedChecks = diag?.checks?.filter((c) => !c.ok) ?? [];

  const tituloModo = usingSupabase
    ? 'Guardando en Supabase'
    : usingArchivo
      ? 'Mostrando el catálogo publicado en Vercel'
      : 'Guardando sólo en este navegador';

  return (
    <section id="admin" className="admin-section">
      <div id="admin-form-anchor" className="container">
        <div className="admin-header">
          <div>
            <h2 style={{ fontSize: '2rem' }}>Panel de Administración</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Gestiona los productos visibles en el catálogo</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={() => onReload({ forzarRecarga: true })}
              disabled={busy}
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
              title="Volver a leer los productos desde la base, ignorando la caché"
            >
              <RefreshCw size={15} /> Recargar
            </button>
            <button className="btn btn-outline" onClick={handleLogout} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* ----------------------------- Estado de la persistencia ---------- */}
        <div
          className="bg-glass"
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            marginBottom: '1.25rem',
            borderLeft: `4px solid ${usingSupabase ? '#4ade80' : 'var(--accent-red, #cc5a5a)'}`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <Database size={18} />
            <strong style={{ fontFamily: 'var(--font-heading)' }}>{tituloModo}</strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {isSupabaseConfigured ? supabaseUrl.replace(/^https:\/\//, '') : 'sin conexión configurada'} ·{' '}
              {loading ? 'cargando productos…' : `${products.length} productos cargados`}
            </span>
            <button
              className="btn btn-secondary"
              onClick={runDiagnosis}
              disabled={diagLoading}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', marginLeft: 'auto' }}
            >
              {diagLoading ? <Loader2 size={13} /> : <RefreshCw size={13} />} Probar conexión
            </button>
          </div>

          {!usingSupabase && (
            <p style={{ margin: '0.6rem 0 0', fontSize: '0.85rem', color: 'var(--accent-red)' }}>
              Los cambios que hagas acá quedan sólo en este navegador. Para que los vean todos, usá
              <strong> "Descargar catalogo.json"</strong> más abajo y publicalo con git push.
            </p>
          )}

          {dataError && (
            <p style={{ margin: '0.6rem 0 0', fontSize: '0.85rem', color: 'var(--accent-red)' }}>{dataError}</p>
          )}

          {diagLoading && !diag && (
            <p style={{ margin: '0.6rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Verificando la conexión con la base de datos…
            </p>
          )}

          {diag && (
            <ul style={{ margin: '0.75rem 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: '0.4rem' }}>
              {diag.checks.map((c) => (
                <li
                  key={c.name}
                  style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.82rem' }}
                >
                  {c.ok ? (
                    <CheckCircle2 size={15} style={{ color: '#4ade80', flexShrink: 0, marginTop: '2px' }} />
                  ) : (
                    <AlertTriangle size={15} style={{ color: 'var(--accent-red)', flexShrink: 0, marginTop: '2px' }} />
                  )}
                  <span>
                    <strong>{c.name}:</strong>{' '}
                    <span style={{ color: c.ok ? 'var(--text-secondary)' : 'var(--accent-red)' }}>
                      {typeof c.detail === 'string' ? c.detail : JSON.stringify(c.detail)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {(needsSeed || failedChecks.length > 0) && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.85rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => handleSeedClick(false)}
                disabled={busy}
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
              >
                <Sprout size={14} /> Sembrar catálogo en Supabase
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleSeedClick(true)}
                disabled={busy}
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
                title="Vuelve a escribir los 64 productos originales sin duplicar (upsert por slug)"
              >
                Forzar siembra
              </button>
            </div>
          )}
        </div>

        {/* ----------------------------------------- Mensajes de resultado -- */}
        {notice && (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: '0.85rem 1.1rem',
              borderRadius: '10px',
              marginBottom: '1.25rem',
              fontSize: '0.88rem',
              border: '1px solid',
              borderColor:
                notice.type === 'ok' ? '#4ade80' : notice.type === 'error' ? 'var(--accent-red)' : '#d4af37',
              background:
                notice.type === 'ok'
                  ? 'rgba(74,222,128,0.10)'
                  : notice.type === 'error'
                    ? 'rgba(204,90,90,0.12)'
                    : 'rgba(212,175,55,0.10)',
              display: 'flex',
              gap: '0.6rem',
              alignItems: 'flex-start'
            }}
          >
            {notice.type === 'ok' ? (
              <CheckCircle2 size={17} style={{ flexShrink: 0, marginTop: '1px' }} />
            ) : (
              <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: '1px' }} />
            )}
            <span style={{ flex: 1 }}>{notice.text}</span>
            <button
              onClick={() => setNotice(null)}
              aria-label="Cerrar mensaje"
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* ------------------------- Publicar el catálogo en Vercel --------- */}
        <div
          className="bg-glass"
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            marginBottom: '1.25rem',
            borderLeft: '4px solid #d4af37'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <UploadCloud size={18} />
            <strong style={{ fontFamily: 'var(--font-heading)' }}>Publicar el catálogo en la web</strong>
          </div>

          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Editá el stock acá arriba y después publicalo. No necesita base de datos: el archivo lo sirve
            Vercel, así que funciona aunque Supabase esté caído y no consume nada de su cuota.
          </p>

          <ol
            style={{
              margin: '0.6rem 0 0',
              paddingLeft: '1.2rem',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              display: 'grid',
              gap: '0.2rem'
            }}
          >
            <li>Tocá el botón: se descarga <code>catalogo.json</code></li>
            <li>Reemplazá con él el archivo <code>public/catalogo.json</code> del proyecto</li>
            <li><code>git add -A</code> → <code>git commit -m "Actualizar stock"</code> → <code>git push</code></li>
            <li>Cuando Vercel termine el deploy, todos ven el stock nuevo</li>
          </ol>

          <button
            className="btn btn-primary"
            onClick={handlePublicarClick}
            disabled={products.length === 0}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', marginTop: '0.85rem' }}
          >
            <UploadCloud size={15} /> Descargar catalogo.json ({products.length} productos)
          </button>
        </div>

        {/* --------------------------------------- Copias de seguridad ------ */}
        <div className="bg-glass" style={{ padding: '1rem 1.25rem', borderRadius: '12px', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <HardDriveDownload size={18} />
            <strong style={{ fontFamily: 'var(--font-heading)' }}>Copias de seguridad</strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Se guarda una copia automática antes de cada restauración o restablecimiento.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.85rem' }}>
            <button
              className="btn btn-primary"
              onClick={handleManualSnapshot}
              disabled={busy || products.length === 0}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
            >
              <Database size={14} /> Guardar copia ahora
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleExportClick}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
            >
              <Download size={14} /> Exportar JSON
            </button>
            <label
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem', cursor: 'pointer', margin: 0 }}
            >
              <Upload size={14} /> Importar JSON
              <input type="file" accept="application/json,.json" onChange={handleFileUploadBackup} style={{ display: 'none' }} />
            </label>
            <button
              className="btn btn-secondary"
              onClick={handleRestoreInitialClick}
              disabled={busy}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
            >
              <RotateCcw size={14} /> Restablecer 64 originales
            </button>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontFamily: 'var(--font-heading)' }}>
                Historial ({snapshots.length})
              </h4>
              <button
                onClick={loadSnapshots}
                className="btn btn-outline"
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem' }}
                disabled={snapshotsLoading}
              >
                <RefreshCw size={12} />
              </button>
            </div>

            {snapshots.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                {snapshotsLoading ? 'Cargando…' : 'Todavía no hay copias guardadas.'}
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '0.4rem', maxHeight: '220px', overflowY: 'auto' }}>
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.8rem'
                    }}
                  >
                    <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatDate(snap.created_at)}</span>
                    <span style={{ color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {snap.reason}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {snap.product_count} prod.
                    </span>
                    <button
                      className="btn btn-outline"
                      onClick={() => handleRestoreSnapshotClick(snap)}
                      disabled={busy}
                      style={{ fontSize: '0.7rem', padding: '0.25rem 0.7rem' }}
                    >
                      Restaurar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ----------------------------------------------- Formulario + tabla */}
        <div className="admin-layout">
          <div className="admin-form-container">
            <div className="admin-panel-card bg-glass">
              <h3>{isEditing ? 'Modificar Producto' : 'Agregar Nuevo Producto'}</h3>

              <form onSubmit={handleSubmit} className="admin-form">
                <div className="form-group">
                  <label htmlFor="p-name">Nombre del Producto *</label>
                  <input
                    id="p-name"
                    type="text"
                    placeholder="Ej: Mate Torpedo Imperial"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="p-desc">Descripción Corta *</label>
                  <textarea
                    id="p-desc"
                    placeholder="Breve detalle sobre materiales, virola..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="form-input"
                    rows="3"
                    style={{ resize: 'none' }}
                    required
                  ></textarea>
                </div>

                <div className="form-group">
                  <label htmlFor="p-price">Precio (ARS) *</label>
                  <input
                    id="p-price"
                    type="number"
                    placeholder="Ej: 24500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="form-input"
                    min="0"
                    required
                  />
                </div>

                {/* ---------------------------------------------- STOCK ----- */}
                <fieldset
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    margin: '0.5rem 0'
                  }}
                >
                  <legend style={{ fontSize: '0.8rem', fontFamily: 'var(--font-heading)', padding: '0 0.4rem' }}>
                    Stock
                  </legend>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isOutOfStock}
                      onChange={(e) => setIsOutOfStock(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--accent-gold)' }}
                    />
                    Marcar como Agotado
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      marginTop: '0.6rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={manageQuantity}
                      onChange={(e) => {
                        setManageQuantity(e.target.checked);
                        if (e.target.checked && stockQuantity === '') setStockQuantity('1');
                      }}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--accent-gold)' }}
                    />
                    Llevar cantidad de unidades
                  </label>

                  {manageQuantity && (
                    <div className="form-group" style={{ marginTop: '0.6rem', marginBottom: 0 }}>
                      <label htmlFor="p-qty">Unidades disponibles</label>
                      <input
                        id="p-qty"
                        type="number"
                        min="0"
                        step="1"
                        value={stockQuantity}
                        onChange={(e) => setStockQuantity(e.target.value)}
                        className="form-input"
                      />
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        En 0 el producto aparece como AGOTADO automáticamente. Si desmarcás esta opción, vuelve a
                        mandar sólo el check de arriba.
                      </small>
                    </div>
                  )}
                </fieldset>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-heading)',
                    fontSize: '0.9rem',
                    margin: '0.5rem 0'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isPromo}
                    onChange={(e) => setIsPromo(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-gold)' }}
                  />
                  Marcar en Promoción
                </label>

                {isPromo && (
                  <div className="form-group">
                    <label htmlFor="p-promo">Precio de Promoción (ARS) *</label>
                    <input
                      id="p-promo"
                      type="number"
                      placeholder="Ej: 19900"
                      value={promoPrice}
                      onChange={(e) => setPromoPrice(e.target.value)}
                      className="form-input"
                      min="0"
                      required={isPromo}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="p-cat">Categoría Principal *</label>
                  <select id="p-cat" value={category} onChange={handleCategorySelectChange} className="select-input">
                    <option value="mates">Mates</option>
                    <option value="bombillas">Bombillas</option>
                    <option value="accesorios">Accesorios</option>
                  </select>
                </div>

                {category === 'mates' && (
                  <div className="form-group">
                    <label htmlFor="p-sub">Tipo de Mate (Subcategoría) *</label>
                    <select
                      id="p-sub"
                      value={subcategory}
                      onChange={handleSubcategorySelectChange}
                      className="select-input"
                    >
                      <option value="imperial">Imperial</option>
                      <option value="torpedo">Torpedo</option>
                      <option value="galleta">Galleta</option>
                      <option value="camionera">Camionero</option>
                      <option value="rustico">Rústico</option>
                    </select>
                  </div>
                )}

                {category === 'bombillas' && (
                  <div className="form-group">
                    <label htmlFor="p-sub-b">Tipo de Bombilla *</label>
                    <select
                      id="p-sub-b"
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      className="select-input"
                    >
                      <option value="acero">Acero Inoxidable</option>
                      <option value="alpaca">Alpaca</option>
                      <option value="todas">Todas</option>
                    </select>
                  </div>
                )}

                {category === 'accesorios' && (
                  <div className="form-group">
                    <label htmlFor="p-sub-a">Tipo de Accesorio *</label>
                    <select
                      id="p-sub-a"
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      className="select-input"
                    >
                      <option value="todos">General / Accesorios</option>
                      <option value="termos">Termos</option>
                    </select>
                  </div>
                )}

                {category === 'mates' && subcategory === 'imperial' && (
                  <div className="form-group">
                    <label htmlFor="p-ss1">Subgrupo Imperial *</label>
                    <select id="p-ss1" value={subSubgroup} onChange={(e) => setSubSubgroup(e.target.value)} className="select-input">
                      <option value="calabaza">Calabaza</option>
                      <option value="algarrobo">Algarrobo</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                )}

                {category === 'mates' && subcategory === 'torpedo' && (
                  <div className="form-group">
                    <label htmlFor="p-ss2">Subgrupo Torpedo *</label>
                    <select id="p-ss2" value={subSubgroup} onChange={(e) => setSubSubgroup(e.target.value)} className="select-input">
                      <option value="comun">Torpedo Común</option>
                      <option value="base_bolita">Base Bolita</option>
                    </select>
                  </div>
                )}

                {category === 'mates' && subcategory === 'galleta' && (
                  <div className="form-group">
                    <label htmlFor="p-ss3">Subgrupo Galleta *</label>
                    <select id="p-ss3" value={subSubgroup} onChange={(e) => setSubSubgroup(e.target.value)} className="select-input">
                      <option value="comun">Galleta Común</option>
                      <option value="virola">Con Virola</option>
                    </select>
                  </div>
                )}

                {category === 'mates' && subcategory === 'camionera' && (
                  <div className="form-group">
                    <label htmlFor="p-ss4">Subgrupo Camionero *</label>
                    <select id="p-ss4" value={subSubgroup} onChange={(e) => setSubSubgroup(e.target.value)} className="select-input">
                      <option value="comun">Camionero Común</option>
                      <option value="algarrobo">Algarrobo</option>
                      <option value="calabaza">Calabaza</option>
                    </select>
                  </div>
                )}

                {category === 'mates' && subcategory === 'rustico' && (
                  <div className="form-group">
                    <label htmlFor="p-ss5">Subgrupo Rústico *</label>
                    <select id="p-ss5" value={subSubgroup} onChange={(e) => setSubSubgroup(e.target.value)} className="select-input">
                      <option value="algarrobo">Algarrobo</option>
                      <option value="comun">Común</option>
                    </select>
                  </div>
                )}

                <div className="form-group file-input-wrapper">
                  <label>Foto del Producto *</label>
                  <div className="file-input-preview">
                    {imageFilePreview ? (
                      <img src={imageFilePreview} alt="Vista previa" />
                    ) : (
                      <div className="file-input-placeholder">
                        <ImageIcon size={24} />
                        <span>Sin imagen seleccionada</span>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                    aria-label="Subir foto del producto"
                  />
                  {imageNote && (
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{imageNote}</small>
                  )}
                  <input
                    type="text"
                    placeholder="O pega URL de imagen directa..."
                    value={imageUrl.startsWith('data:') ? '' : imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setImageFilePreview(e.target.value);
                      setImageNote('');
                    }}
                    className="form-input"
                    style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}
                    aria-label="URL de la imagen"
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary btn-form-submit" style={{ flex: 1 }} disabled={busy}>
                    {isEditing ? <RefreshCw size={16} /> : <Plus size={16} />}
                    {busy ? 'Guardando…' : isEditing ? 'Actualizar' : 'Agregar'}
                  </button>
                  {isEditing && (
                    <button type="button" className="btn btn-secondary btn-form-submit" onClick={resetForm}>
                      <X size={16} />
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* ------------------------------------------------ Tabla productos */}
          <div className="admin-products-table">
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', marginBottom: '1.5rem' }}>
              Productos Cargados ({products.length})
            </h3>

            <div className="products-table-list">
              {products.map((product) => {
                const soldOut = isSoldOut(product);
                const hasQty = product.stock_quantity !== null && product.stock_quantity !== undefined;
                return (
                  <div key={product.id} className="table-row">
                    <img src={product.image_url} alt={product.name} className="table-row-img" loading="lazy" />
                    <div className="table-row-details">
                      <h4
                        className="table-row-title"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}
                      >
                        {product.name}
                        {soldOut && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              padding: '0.15rem 0.4rem',
                              background: 'rgba(204,90,90,0.15)',
                              border: '1px solid var(--accent-red)',
                              color: 'var(--accent-red)',
                              borderRadius: '9999px',
                              fontWeight: 'bold'
                            }}
                          >
                            AGOTADO
                          </span>
                        )}
                        {product.is_promo && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              padding: '0.15rem 0.4rem',
                              background: 'rgba(61,111,76,0.15)',
                              border: '1px solid var(--accent-green)',
                              color: '#4ade80',
                              borderRadius: '9999px',
                              fontWeight: 'bold'
                            }}
                          >
                            PROMO
                          </span>
                        )}
                      </h4>
                      <p className="table-row-meta">
                        {product.category}
                        {product.subcategory !== 'todos' && product.subcategory !== 'todas'
                          ? ` > ${product.subcategory}`
                          : ''}
                        {product.sub_subgroup ? ` > ${product.sub_subgroup}` : ''}
                      </p>

                      {/* Controles rápidos de stock */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          marginTop: '0.35rem',
                          flexWrap: 'wrap'
                        }}
                      >
                        <button
                          className="btn btn-outline"
                          onClick={() => handleToggleOutOfStock(product)}
                          disabled={busy}
                          style={{ fontSize: '0.68rem', padding: '0.15rem 0.55rem' }}
                          title="Alternar agotado"
                        >
                          {product.is_out_of_stock ? 'Marcar disponible' : 'Marcar agotado'}
                        </button>

                        {hasQty && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <button
                              className="btn btn-outline"
                              onClick={() => handleAdjustQuantity(product, -1)}
                              disabled={busy || product.stock_quantity <= 0}
                              style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}
                              aria-label={`Restar una unidad de ${product.name}`}
                            >
                              <Minus size={11} />
                            </button>
                            <span style={{ fontSize: '0.72rem', minWidth: '3.5rem', textAlign: 'center' }}>
                              {product.stock_quantity} u.
                            </span>
                            <button
                              className="btn btn-outline"
                              onClick={() => handleAdjustQuantity(product, 1)}
                              disabled={busy}
                              style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}
                              aria-label={`Sumar una unidad de ${product.name}`}
                            >
                              <Plus size={11} />
                            </button>
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className="table-row-price"
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}
                    >
                      {product.is_promo && product.promo_price ? (
                        <>
                          <span style={{ color: '#4ade80', fontWeight: 'bold' }}>
                            ${product.promo_price.toLocaleString('es-AR')}
                          </span>
                          <span style={{ textDecoration: 'line-through', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ${product.price.toLocaleString('es-AR')}
                          </span>
                        </>
                      ) : (
                        <span>${product.price.toLocaleString('es-AR')}</span>
                      )}
                    </div>

                    <div className="table-row-actions">
                      <button
                        className="btn-table-action edit"
                        onClick={() => handleEditClick(product)}
                        title="Editar producto"
                        aria-label={`Editar ${product.name}`}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        className="btn-table-action delete"
                        onClick={() => handleDeleteClick(product)}
                        title="Eliminar producto"
                        aria-label={`Eliminar ${product.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {products.length === 0 && (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                  No hay productos cargados en la base de datos.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
