# F Mateando CBA — Informe técnico

**Fecha:** 18 de agosto de 2026
**Stack:** Vite 8 + React 19 · Supabase (PostgreSQL) · Vercel
**Motivo:** el stock no se guardaba. Auditoría, corrección y sistema de copias de seguridad.

---

## 0. 🔴 Causa raíz confirmada: Supabase suspendió el proyecto

El panel de diagnóstico devolvió `exceed_egress_quota`. El consumo real era **18,88 GB sobre 5 GB (378 %)** del plan Free, y Supabase restringió todos los servicios devolviendo `402` a cada consulta. Por eso el stock no se guardaba: **las escrituras venían fallando a nivel plataforma, no por el código.**

**Por qué se consumió tanto.** La tabla `products` pesaba **63 MB** porque las fotos cargadas desde el panel se guardaban como base64 dentro de la columna `image_url` (filas individuales de 280–390 KB). Y `getProducts()` hacía `select('*')` de la tabla entera en cada carga de página: **cada visitante se bajaba los 63 MB completos**. Con unas 300 visitas se llega a 18 GB. También explica por qué el sitio cargaba lento.

**Cómo se destraba, gratis.** El ciclo de facturación se reinicia el 23 de agosto de 2026 y las restricciones se levantan solas. No hay forma de levantarlas antes sin cambiar de plan. Crear otro proyecto no sirve: la cuota es **por organización**.

**Cómo se evita que vuelva a pasar** (dos arreglos, ambos gratis):

1. **Sacar las fotos de la base** con `scripts/extraer-imagenes.mjs` (ver sección 4b). Las convierte a archivos en `public/fmateando/subidas/`, que Vercel sirve por CDN con los 100 GB/mes gratis del plan Hobby. En la prueba, 10 MB de base64 pasaron a **4,6 KB** en la tabla.
2. **Caché por huella** en `getProducts()`: primero pide sólo `id, updated_at` (unos pocos KB) y descarga las filas completas únicamente si algo cambió. Las visitas repetidas dejan de transferir el catálogo.

Con las dos cosas, el consumo baja más de 1000 veces y los 5 GB gratis dejan de ser un problema.

---

## 1. Qué hay que hacer (en este orden)

| # | Acción | Dónde | Tiempo |
|---|--------|-------|--------|
| 0 | **Esperar al 23/08 o subir el plan** para destrabar el proyecto | Supabase → Settings → Billing | — |
| 1 | Ejecutar `supabase_migration_v2.sql` | Supabase → SQL Editor | 1 min |
| 2 | Correr `scripts/extraer-imagenes.mjs` y aplicar el SQL que genera | Tu máquina + SQL Editor | 15 min |
| 3 | Confirmar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Vercel (los 3 entornos) y **redeploy** | Vercel → Settings → Environment Variables | 2 min |
| 4 | Entrar al panel de admin y mirar el bloque **"Probar conexión"**: todos los chequeos en verde | El sitio | 1 min |

Nada de los pasos 1 a 4 va a funcionar mientras el proyecto siga restringido. Si el paso 4 muestra algo en rojo, el propio panel dice qué falta y cómo arreglarlo.

---

## 2. Por qué no se guardaba el stock

No era un solo bug: eran **nueve**, y varios fallaban en silencio mostrando "Producto actualizado con éxito".

### 2.1 Causa principal — el UPDATE devolvía 0 filas y se tomaba como éxito

```js
// ANTES — productService.js
const { data, error } = await supabase.from('products').update(updates).eq('id', id).select();
if (error) throw error;
if (data && data.length > 0) return data[0];
return localResult;          // ← 0 filas afectadas caía acá, sin avisar nada
```

Cuando una política RLS bloquea un `UPDATE`, PostgREST **no devuelve error**: devuelve una lista vacía. El código interpretaba eso como "bueno, uso la copia local", el panel mostraba `alert('Producto actualizado con éxito')` y al recargar la página el cambio ya no estaba.

El esquema original creaba la política de escritura como `FOR ALL USING (true)`. Es la forma más frágil de escribirla: si esa política no llega a crearse, o se pisa, o el `WITH CHECK` no aplica a `UPDATE`, la escritura queda bloqueada **sin error visible**. La migración la reemplaza por cuatro políticas explícitas — una por operación — para que nunca vuelva a ser ambiguo.

### 2.2 Los IDs de la app no coincidían con los de la base

Los 64 productos del código tienen IDs como `m-imp-1`. La tabla usa `id UUID`. Al sembrar, la app quitaba el ID para que Postgres generara UUIDs. Pero si esa siembra fallaba (por RLS, por red, por lo que sea), `getProducts()` devolvía la lista del código con IDs de texto y la app pasaba a editar productos con `.eq('id', 'm-imp-1')` contra una columna UUID → error `22P02` de Postgres → `catch` → guardado local → **perdido en la siguiente recarga**.

### 2.3 La copia local se autodestruía

```js
// ANTES — se ejecutaba en CADA lectura
if (!Array.isArray(parsed) || parsed.length < INITIAL_PRODUCTS.length) {
  localStorage.setItem('fmateando_products', JSON.stringify(INITIAL_PRODUCTS)); // 💥
  return INITIAL_PRODUCTS;
}
```

Con eliminar **un solo** producto el catálogo pasaba a 63 < 64 y la siguiente carga borraba todo y restauraba los 64 originales, con todos los precios y stock editados perdidos.

### 2.4 Re-siembra en bucle y catálogo duplicado

`getProducts()` insertaba los 64 productos cada vez que la tabla venía vacía. Dos pestañas abiertas a la vez = 128 filas. Y si el insert fallaba parcialmente, lo reintentaba en cada carga.

### 2.5 Las fotos reventaban el almacenamiento

`handleImageFileChange` guardaba la foto como base64 dentro del campo `image_url`. Una foto de celular de 3 MB se convierte en ~4 MB de texto. En modo local eso supera la cuota de ~5 MB de `localStorage`: `setItem` lanza `QuotaExceededError`, que **nadie capturaba** — el guardado moría ahí, en silencio.

### 2.6 Restaurar una copia podía dejarte sin catálogo

```js
// ANTES — borrar primero, preguntar después
await supabase.from('products').delete().neq('id', '000...000');
const { data, error } = await supabase.from('products').insert(cleanList).select();
if (!error && data) return data;   // si fallaba: catálogo borrado, nada insertado
```

### 2.7 Otros

- **La UI nunca releía la base.** Actualizaba el estado de React localmente, así que siempre "se veía" guardado aunque el servidor hubiera rechazado la escritura.
- **`alert()` como único feedback**, siempre con texto de éxito, incluso en el camino de error.
- **Variables de entorno de Vercel:** si `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` no están cargadas en Vercel (o se cargaron sin volver a desplegar), `isSupabaseConfigured` da `false` y el sitio publicado guarda todo en el navegador de cada visitante. Esto es invisible en desarrollo, donde el `.env` local sí existe.

---

## 3. Qué se cambió

### Base de datos — `supabase_migration_v2.sql`

Aditivo e idempotente. **No modifica el stock actual de ningún producto** (verificado sobre una réplica local con PostgreSQL 16: 64 productos, 5 agotados antes y después).

| Cambio | Para qué |
|--------|----------|
| Columna `slug` (única, con backfill de los 64 productos por nombre) | ID estable. Permite `UPSERT` idempotente: sembrar o restaurar dos veces ya no duplica nada |
| Columna `stock_quantity` (`INTEGER`, `NULL` por defecto) | Unidades disponibles. `NULL` = "no se lleva conteo" = comportamiento actual intacto |
| Columna `updated_at` + trigger | Saber cuándo se tocó cada producto |
| 4 políticas RLS explícitas (`SELECT` / `INSERT` / `UPDATE` / `DELETE`) | Reemplazan el `FOR ALL` ambiguo. **Éste es el arreglo del bug principal** |
| Tabla `catalog_backups` | Historial de copias del catálogo completo |
| Trigger `products_auto_backup` | Copia automática ante cualquier cambio, máximo una cada 30 minutos, retención de 60 |
| Índices en `created_at` y `(category, subcategory, sub_subgroup)` | El catálogo ordena y filtra por esos campos |

### Aplicación

| Archivo | Cambio |
|---------|--------|
| `src/data/initialProducts.js` | **Nuevo.** Los 64 productos, con `slug` en lugar de `id` |
| `src/supabaseClient.js` | Valida la configuración (detecta placeholders y URLs mal formadas) y explica qué falta |
| `src/productService.js` | Reescrito. Toda operación devuelve `{ ok, error, source }`. Cero fallbacks silenciosos. 0 filas afectadas = error. Restauración con snapshot previo y `UPSERT` antes de borrar |
| `src/components/AdminPanel.jsx` | Panel de diagnóstico en vivo, mensajes de error reales, campo y botones +/- de cantidad, panel de copias con historial restaurable, compresión de imágenes a 1280 px |
| `src/App.jsx` | Recarga desde la base, propaga errores al panel, bloquea agregar al carrito sin stock |
| `src/components/Catalog.jsx` | Usa `isSoldOut()` (flag **o** cantidad en 0) y muestra "sólo quedan N unidades" |

### Comportamiento nuevo del stock

- **Sigue funcionando el check "Marcar como Agotado"** exactamente igual que antes.
- **Nuevo, opcional:** "Llevar cantidad de unidades". Si lo activás, en 0 el producto se marca AGOTADO solo, y en 3 o menos el catálogo muestra "sólo quedan N unidades".
- Botones **+ / −** en cada fila del panel para ajustar el stock sin abrir el formulario.
- Cada cambio muestra si la base **confirmó** la escritura. Si no la confirmó, dice por qué.

---

## 4. Copias de seguridad

Tres capas, ninguna depende de las otras:

1. **Automática en servidor** — trigger de PostgreSQL. Cualquier cambio en `products` guarda el catálogo completo en `catalog_backups` (máx. 1 cada 30 min, se conservan las últimas 60). Funciona aunque el problema esté en el navegador o en el código de la app.
2. **Automática antes de operaciones destructivas** — restaurar un archivo o restablecer los 64 originales guarda primero una copia del estado actual. Ya no existe el camino "borré todo y falló el insert".
3. **Manual** — botón "Guardar copia ahora", export/import JSON, e historial con restauración de un clic desde el panel.

Además, Supabase hace backups diarios de todo el proyecto en el plan Pro (en el plan Free hay que exportar manualmente — de ahí la utilidad del export JSON).

**Opcional:** al final de `supabase_migration_v2.sql` hay un bloque comentado para programar una copia diaria a las 03:00 (hora Argentina) con `pg_cron`.

---

## 4b. Sacar las fotos de la base de datos

`scripts/extraer-imagenes.mjs` se conecta **directo a PostgreSQL** (no por la API REST, así que funciona incluso con el proyecto restringido), baja cada foto base64, la recomprime a WebP y deja un `.sql` listo para aplicar.

```powershell
# 1. Dependencias
npm install pg sharp --save-dev

# 2. Cadena de conexión: Supabase → Connect → Session pooler → URI
$env:DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-....pooler.supabase.com:5432/postgres"

# 3. Extraer
node scripts/extraer-imagenes.mjs
```

Genera `public/fmateando/subidas/*.webp` y `scripts/actualizar-imagenes.sql`.

**El orden importa:**

1. `git add -A && git commit -m "Mover imagenes base64 a archivos" && git push` — esperar el deploy de Vercel.
2. Recién entonces aplicar `scripts/actualizar-imagenes.sql` en el SQL Editor.

Si se aplica el SQL antes del deploy, las filas quedan apuntando a archivos que todavía no existen en el servidor y las fotos no se ven.

El SQL guarda una copia de los base64 en `products_imagenes_backup` antes de tocar nada. Cuando confirmes que todo se ve bien:

```sql
DROP TABLE public.products_imagenes_backup;
VACUUM FULL public.products;
```

**Verificado** contra PostgreSQL 16 con 5 productos de 2 MB cada uno: la columna `image_url` pasó de **10 MB a 4612 bytes**, con los archivos en disco y el respaldo intacto.

De ahí en adelante, cargá las fotos poniéndolas en `public/fmateando/` y pegando la ruta en el panel (`/fmateando/mates/imperial/mi-foto.webp`). El campo de subida sigue funcionando, pero ahora comprime a 1000 px y **avisa** cuando la imagen pasa de 150 KB, explicando que se guarda dentro de la base.

---

## 5. Seguridad — estado actual y plan

> Elegiste documentar ahora y migrar después. Esto es lo que hay que saber, ordenado por riesgo.

### 🔴 Crítico

**1. La contraseña del admin está en el JavaScript público.**
`VITE_ADMIN_PASSWORD=montañita` — todo lo que empieza con `VITE_` **se compila dentro del bundle**. Cualquiera puede abrir las herramientas de desarrollo, buscar en el archivo `.js` y leerla. No es un secreto.

**2. Cualquiera puede modificar tu catálogo.**
Las políticas RLS permiten escritura anónima. Con la clave pública (que también está en el bundle, y eso es normal y esperado) cualquier persona puede cambiar precios, borrar productos o vaciar la tabla con una sola llamada HTTP.

Estos dos puntos son **el mismo problema**: no hay autenticación real, sólo una comparación de texto en el navegador que no protege la base de datos.

**Solución (2–3 h de trabajo):**

1. Supabase → Authentication → Users → Add user, con tu email y una contraseña fuerte.
2. En el panel, reemplazar la comparación de texto por `supabase.auth.signInWithPassword({ email, password })`.
3. Cambiar `persistSession: false` a `true` en `supabaseClient.js` para que la sesión sobreviva a las recargas.
4. Ejecutar el bloque de endurecimiento que está comentado en `supabase_migration_v2.sql` (deja la lectura pública y restringe la escritura a `authenticated`).
5. Borrar `VITE_ADMIN_PASSWORD` del `.env` y de Vercel.

**No ejecutar el paso 4 antes del 2**, o el panel deja de guardar.

**3. La contraseña actual está en el historial de Git.**
`montañita` quedó registrada en `.env.example`, que sí está versionado. Cuando migres a Supabase Auth, no la reutilices en ningún lado.

### 🟠 Importante

**4. Sesión de admin eterna.** Estaba en `localStorage` con la clave `fmateando_admin_auth = 'true'`: quedaba abierta para siempre y se podía falsificar escribiéndola a mano en la consola. **Ya corregido:** ahora usa `sessionStorage` y se cierra al cerrar la pestaña. Sigue sin ser una barrera real hasta que exista Supabase Auth — pero deja de ser un llavero permanente.

**5. Fotos como base64 dentro de la fila.** Además del problema de cuota, infla cada respuesta de la API y el tamaño de la página. **Mitigado:** ahora se comprimen a 1280 px / JPEG 82 antes de guardar. **Recomendado:** crear un bucket público `product-images` en Supabase Storage y guardar sólo la URL.

**6. Sin límite de tasa.** La API de Supabase acepta llamadas anónimas sin restricción. Al migrar a Auth esto se resuelve solo para escritura. Para lectura, Vercel ofrece protección contra picos de tráfico en su plan Pro.

### 🟡 Recomendable

**7. Cabeceras de seguridad.** El sitio no envía `Content-Security-Policy`, `X-Frame-Options` ni `Referrer-Policy`. Se agregan con un `vercel.json` (ver sección 7).

**8. Rotar la clave publicable de Supabase** cuando termines de migrar, desde Settings → API Keys. Es pública por diseño, pero rotarla invalida cualquier script que alguien haya dejado corriendo.

**9. Enlaces de Instagram.** `href="https://instagram.com"` apunta a la raíz, no a `@FMateandoCba`.

### Puertos y superficie de exposición

No hay servidor propio ni puertos que administrar: Vercel y Supabase son servicios gestionados y sólo exponen **443/TCP (HTTPS)**. La superficie de ataque real son las políticas RLS de la base, no la red. Si en el futuro hubiera un servidor propio, ahí sí correspondería cerrar todo salvo 443 y el acceso administrativo por clave.

---

## 6. Rendimiento

Medido sobre el build de producción (`npm run build`):

| Recurso | Tamaño | Comprimido |
|---------|--------|------------|
| JavaScript | 497 KB | **138 KB** |
| CSS | 22,6 KB | 4,5 KB |
| HTML | 2,0 KB | 0,7 KB |

138 KB de JS comprimido es aceptable, pero hay margen:

1. **Íconos de `lucide-react`** — es el grueso del bundle. Ya se importa por nombre (tree-shaking activo). Se puede recortar más importando desde `lucide-react/icons/<nombre>`.
2. **Las 64 imágenes son `.jpeg` sin optimizar** — es lo más pesado que carga el visitante, muy por encima del JS. Convertirlas a WebP con `sharp` reduce entre 60 % y 80 % sin pérdida visible. Es la mejora de rendimiento con mejor relación esfuerzo/resultado.
3. **`loading="lazy"` y `decoding="async"`** — ya aplicados en el catálogo y en la tabla del panel.
4. **Índices de base de datos** — agregados en la migración.
5. **Nombres de archivo con espacios y paréntesis** (`WhatsApp Image 2026-06-22 at 21.24.00 (1).jpeg`) obligan a codificar la URL y complican el cacheo. Renombrarlos a `imperial-01.webp` mejora también el SEO.
6. **Sin `code splitting`** — el panel de administración se descarga aunque el visitante nunca lo abra. Con `React.lazy(() => import('./components/AdminPanel'))` se ahorran ~30 KB para el 99 % de las visitas.

---

## 7. Mantenimiento — lo mínimo indispensable

**`vercel.json` sugerido** (crear en la raíz del proyecto):

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    },
    {
      "source": "/fmateando/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

**Rutina:**

| Cada | Qué |
|------|-----|
| Semana | Abrir el panel → "Probar conexión". Todo verde = todo bien |
| Mes | "Exportar JSON" y guardar el archivo fuera del navegador (Drive, OneDrive) |
| Mes | `npm outdated` y actualizar parches de seguridad |
| Trimestre | Revisar en Supabase → Database → Roles quién tiene acceso |
| Al cambiar de dispositivo o navegador | Verificar que el catálogo se ve igual. Si no, es señal de que volvió a caer en modo local |

**Reglas para no volver a romperlo:**

- Cualquier variable `VITE_*` es **pública**. Nunca meter ahí una contraseña.
- Al agregar una columna a `products`, sumarla también al array `PRODUCT_COLUMNS` de `productService.js`, o se descarta en silencio.
- Después de cambiar variables de entorno en Vercel hay que **volver a desplegar**: no se aplican solas.
- Antes de un cambio grande en el catálogo: "Guardar copia ahora".

---

## 8. Verificación realizada

- Migración probada sobre PostgreSQL 16 reproduciendo el esquema y los datos actuales: 64 productos, 64 slugs únicos, 5 agotados **antes y después** de migrar.
- Migración ejecutada dos veces seguidas: sin errores, sin duplicados (idempotencia confirmada).
- `UPDATE` de stock ejecutado con el rol `anon` (el que usa el sitio): confirmado, 1 fila afectada.
- Siembra por `UPSERT` ejecutada dos veces: 64 productos, sin duplicados.
- Trigger de copia automática y de `updated_at`: verificados.
- Aplicación compilada y ejecutada en Chromium headless: catálogo con 64 productos, cambio de stock guardado, **persistido tras recargar**, copia de seguridad creada, cero errores de runtime.
- Camino de error probado con una URL de Supabase inaccesible: el panel avisa correctamente en vez de mentir con "guardado con éxito".
