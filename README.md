# FMateandoCba

Catálogo digital y gestor de pedidos para **F Mateando CBA**, un emprendimiento especializado en mates (calabaza, algarrobo, premium), bombillas, termos y accesorios en Córdoba, Argentina.

## Características

- **Catálogo de Productos**: Organizado en categorías y subgrupos detallados (Imperial, Torpedo, Galleta, etc.).
- **Carrito de Pedidos**: Permite seleccionar productos, especificar cantidades y generar el pedido listo para enviar por WhatsApp.
- **Métodos de Entrega**: Selección entre envío a domicilio o retiro en punto de entrega coordinado.
- **Optimización Móvil**: Diseño responsive adaptado a pantallas móviles en formato cuadrícula.
- **Panel de Administración**:
  - Gestión de stock: marcar como agotado y, opcionalmente, llevar la cantidad de unidades.
  - Configuración de promociones y precios promocionales.
  - Carga y actualización de productos (con compresión automática de fotos).
  - Diagnóstico de conexión en vivo: dice si los cambios llegaron o no a la base de datos.
  - Copias de seguridad con historial restaurable + export/import JSON.

## Tecnologías Utilizadas

- **Frontend**: React 19, Vite 8, CSS moderno.
- **Base de Datos**: Supabase (PostgreSQL). Si no está configurada, el sitio funciona en modo local y **lo avisa** en el panel.
- **Integraciones**: WhatsApp API para envío directo de pedidos.

## Puesta en marcha

### 1. Base de datos

En Supabase → **SQL Editor** → New query:

- **Proyecto nuevo:** ejecutar `supabase_schema.sql`.
- **Proyecto existente:** ejecutar `supabase_migration_v2.sql` (aditivo e idempotente, no toca los datos ni el stock actual).

### 2. Variables de entorno

Crear un archivo `.env` en la raíz:

```env
VITE_WHATSAPP_NUMBER=5493518013657
VITE_ADMIN_PASSWORD=cambiala_por_una_propia
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_publicable
```

> ⚠ Todo lo que empieza con `VITE_` se compila **dentro del JavaScript público**. `VITE_ADMIN_PASSWORD` no es un secreto: cualquiera puede leerla desde el navegador. El plan para reemplazarla por Supabase Auth está en `docs/INFORME.md`.

En **Vercel** hay que cargar las mismas variables en Settings → Environment Variables (Production, Preview y Development) y **volver a desplegar**: los cambios de variables no se aplican solos.

### 3. Verificar

Entrar al panel de administración y usar **"Probar conexión"**. Si algún chequeo aparece en rojo, el propio panel indica qué falta.

## Desarrollo Local

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run lint     # oxlint
```

## Documentación

- [`docs/INFORME.md`](docs/INFORME.md) — diagnóstico del problema de stock, cambios aplicados, plan de seguridad, rendimiento y rutina de mantenimiento.
- [`supabase_schema.sql`](supabase_schema.sql) — esquema completo para instalaciones nuevas.
- [`supabase_migration_v2.sql`](supabase_migration_v2.sql) — migración para bases existentes (incluye el bloque de endurecimiento de seguridad, comentado).
