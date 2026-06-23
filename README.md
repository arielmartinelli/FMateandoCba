# FMateandoCba

Catálogo digital y gestor de pedidos para **F Mateando CBA**, un emprendimiento especializado en mates (calabaza, algarrobo, premium), bombillas, termos y accesorios en Córdoba, Argentina.

## Características

- **Catálogo de Productos**: Organizado en categorías y subgrupos detallados (Imperial, Torpedo, Galleta, etc.).
- **Carrito de Pedidos**: Permite seleccionar productos, especificar cantidades y generar el pedido listo para enviar por WhatsApp.
- **Métodos de Entrega**: Selección entre envío a domicilio o retiro en punto de entrega coordinado.
- **Optimización Móvil**: Diseño responsive adaptado a pantallas móviles en formato cuadrícula.
- **Panel de Administración**: 
  - Gestión de stock (marcar como agotado).
  - Configuración de promociones y precios promocionales.
  - Carga y actualización de productos.

## Tecnologías Utilizadas

- **Frontend**: React.js, Vite, CSS moderno.
- **Base de Datos**: Supabase (con fallback automático a LocalStorage).
- **Integraciones**: WhatsApp API para envío directo de pedidos.

## Configuración del Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
VITE_WHATSAPP_NUMBER=5493512026507
VITE_ADMIN_PASSWORD=montañita
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

## Desarrollo Local

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Ejecutar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
