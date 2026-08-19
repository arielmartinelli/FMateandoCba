import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, Truck, MapPin, Phone, Coffee, Heart, Shield } from 'lucide-react';
import { productService, isSoldOut, effectivePrice } from './productService';
import Catalog from './components/Catalog';
import CureGuide from './components/CureGuide';
import Cart from './components/Cart';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contactName, setContactName] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  // Estado real de la persistencia: de dónde salen los datos y si algo falló.
  const [dataSource, setDataSource] = useState('local');
  const [dataError, setDataError] = useState(null);
  const [needsSeed, setNeedsSeed] = useState(false);

  const handleCustomQuery = (e) => {
    e.preventDefault();
    if (!contactName.trim() || !contactMessage.trim()) return;

    const rawPhone = import.meta.env.VITE_WHATSAPP_NUMBER || '5493518013657';
    const whatsappPhone = rawPhone.replace(/\s+/g, '').replace(/-/g, '').replace(/\+/g, '');

    const message = `Hola! Mi nombre es *${contactName.trim()}*.\nTengo la siguiente consulta sobre sus mates:\n\n💬 "${contactMessage.trim()}"`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
    setContactName('');
    setContactMessage('');
  };

  // Cargar productos al iniciar la aplicación (y bajo demanda desde el panel)
  const loadProducts = useCallback(async ({ forzarRecarga = false } = {}) => {
    setLoading(true);
    const res = await productService.getProducts({ forzarRecarga });
    setProducts(res.products || []);
    setDataSource(res.source);
    setDataError(res.ok ? res.warning || null : res.error);
    setNeedsSeed(!!res.needsSeed);
    setLoading(false);
    return res;
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Cargar carrito desde LocalStorage si existe
  useEffect(() => {
    const savedCart = localStorage.getItem('fmateando_cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  // Guardar carrito en LocalStorage cuando cambia
  const saveCart = (newCart) => {
    setCart(newCart);
    localStorage.setItem('fmateando_cart', JSON.stringify(newCart));
  };

  // Manejar acciones del carrito de pedido
  const handleAddToCart = (product) => {
    if (isSoldOut(product)) return;

    // Si el producto está en promoción, usar su precio promo, de lo contrario el regular
    const cartProduct = { ...product, price: effectivePrice(product) };

    // Si la cantidad de stock está gestionada, no dejamos pedir más de lo que hay.
    const maxQty =
      product.stock_quantity !== null && product.stock_quantity !== undefined
        ? product.stock_quantity
        : Infinity;

    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      const nextQty = Math.min(existingItem.quantity + 1, maxQty);
      const updated = cart.map((item) =>
        item.id === product.id ? { ...item, quantity: nextQty } : item
      );
      saveCart(updated);
    } else {
      const updated = [...cart, { ...cartProduct, quantity: 1 }];
      saveCart(updated);
    }
    // Abrir el carrito automáticamente para mejorar el feedback visual
    setIsCartOpen(true);
  };

  const handleUpdateCartQty = (id, newQty) => {
    if (newQty < 1) {
      handleRemoveFromCart(id);
      return;
    }
    const updated = cart.map((item) =>
      item.id === id ? { ...item, quantity: newQty } : item
    );
    saveCart(updated);
  };

  const handleRemoveFromCart = (id) => {
    const updated = cart.filter((item) => item.id !== id);
    saveCart(updated);
  };

  const handleClearCart = () => {
    saveCart([]);
  };

  /* ------------------------------------------------------------------------ */
  /*  Operaciones del Administrador                                            */
  /*  Todas devuelven { ok, error } para que el panel muestre el resultado real */
  /*  en vez de asumir éxito (que era el bug de fondo del stock).               */
  /* ------------------------------------------------------------------------ */

  const handleAddProduct = async (productData) => {
    const res = await productService.addProduct(productData);
    if (res.ok) {
      setProducts((prev) => [res.product, ...prev]);
      setNeedsSeed(false);
    }
    return res;
  };

  const handleUpdateProduct = async (id, updates) => {
    const res = await productService.updateProduct(id, updates);
    if (res.ok) {
      setProducts((prev) =>
        prev.map((p) => (String(p.id) === String(id) ? { ...p, ...res.product } : p))
      );
      // Si el producto quedó sin stock, lo sacamos del carrito del visitante.
      if (isSoldOut(res.product)) {
        setCart((prev) => {
          const next = prev.filter((item) => String(item.id) !== String(id));
          localStorage.setItem('fmateando_cart', JSON.stringify(next));
          return next;
        });
      }
    }
    return res;
  };

  const handleDeleteProduct = async (id) => {
    const res = await productService.deleteProduct(id);
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => String(p.id) !== String(id)));
      setCart((prev) => {
        const next = prev.filter((item) => String(item.id) !== String(id));
        localStorage.setItem('fmateando_cart', JSON.stringify(next));
        return next;
      });
    }
    return res;
  };

  const handleExportBackup = () => productService.exportBackup(products);

  const handleExportCatalogoEstatico = () => productService.exportarCatalogoEstatico(products);

  const handleRestoreBackupFile = async (file) => {
    const text = await file.text();
    const parsed = productService.parseBackup(text);
    if (!parsed.ok) return parsed;

    const res = await productService.restoreProducts(parsed.products, {
      reason: `importación del archivo ${file.name}`,
      currentProducts: products
    });
    if (res.ok) setProducts(res.products);
    return res;
  };

  const handleRestoreInitial = async () => {
    const res = await productService.restoreInitialProducts(products);
    if (res.ok) setProducts(res.products);
    return res;
  };

  const handleSeedCatalog = async (options) => {
    const res = await productService.seedInitialCatalog(options);
    if (res.ok) {
      setProducts(res.products);
      setNeedsSeed(false);
      setDataSource(res.source);
    }
    return res;
  };

  const handleCreateSnapshot = async (reason) =>
    productService.createSnapshot(reason || 'copia manual', products);

  const handleRestoreSnapshot = async (snapshotId) => {
    const res = await productService.restoreSnapshot(snapshotId, products);
    if (res.ok) setProducts(res.products);
    return res;
  };

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <>
      {/* Banner Informativo Superior (Envíos, Sin Local) */}
      <div className="info-banner">
        <div className="container info-banner-inner">
          <div className="info-item">
            <Truck size={14} />
            <span>Hacemos envíos a todo el país</span>
          </div>
          <div className="info-item">
            <MapPin size={14} />
            <span>Venta Online (Sin local físico por el momento)</span>
          </div>
          <div className="info-item">
            <Coffee size={14} />
            <span>Mates 100% artesanales</span>
          </div>
        </div>
      </div>

      {/* Header & Navegación */}
      <header className="bg-glass">
        <div className="container header-inner">
          <a href="#" className="logo" onClick={() => setShowAdmin(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <img src="/fmateando/logo.jpeg" alt="F Mateando CBA" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--border-color)', objectFit: 'cover' }} />
            <span className="logo-accent" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 'bold' }}>F Mateando CBA</span>
          </a>

          <ul className="nav-links">
            <li>
              <a 
                href="#inicio" 
                className={!showAdmin ? 'active' : ''} 
                onClick={() => setShowAdmin(false)}
              >
                Inicio
              </a>
            </li>
            <li>
              <a 
                href="#catalogo" 
                onClick={() => setShowAdmin(false)}
              >
                Catálogo
              </a>
            </li>
            <li>
              <a 
                href="#curado" 
                onClick={() => setShowAdmin(false)}
              >
                Cómo Curar
              </a>
            </li>
            <li>
              <a 
                href="#contacto" 
                onClick={() => setShowAdmin(false)}
              >
                Contacto
              </a>
            </li>
            <li>
              <a 
                href="#admin" 
                className={showAdmin ? 'active' : ''} 
                onClick={(e) => {
                  e.preventDefault();
                  setShowAdmin(!showAdmin);
                }}
              >
                Administrar
              </a>
            </li>
          </ul>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Botón Administrador en Móvil */}
            <button
              className="btn btn-outline"
              style={{ padding: '0.5rem', borderRadius: '50%', display: 'inline-flex' }}
              onClick={() => setShowAdmin(!showAdmin)}
              title="Panel de Administración"
            >
              <Shield size={18} className={showAdmin ? 'text-gold' : ''} />
            </button>

            {/* Botón Carrito */}
            <button
              className="btn btn-primary"
              onClick={() => setIsCartOpen(true)}
              style={{ position: 'relative', padding: '0.6rem 1.2rem' }}
            >
              <ShoppingBag size={18} />
              <span style={{ display: 'none' }} className="cart-text">Pedido</span>
              {totalCartItems > 0 && (
                <span className="cart-badge">{totalCartItems}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Vistas de la Aplicación */}
      {showAdmin ? (
        <AdminPanel
          products={products}
          loading={loading}
          dataSource={dataSource}
          dataError={dataError}
          needsSeed={needsSeed}
          onReload={loadProducts}
          onAddProduct={handleAddProduct}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
          onExportBackup={handleExportBackup}
          onExportCatalogoEstatico={handleExportCatalogoEstatico}
          onRestoreBackupFile={handleRestoreBackupFile}
          onRestoreInitial={handleRestoreInitial}
          onSeedCatalog={handleSeedCatalog}
          onCreateSnapshot={handleCreateSnapshot}
          onRestoreSnapshot={handleRestoreSnapshot}
        />
      ) : (
        <>
          {/* Hero Section */}
          <section id="inicio" className="hero">
            <div className="container hero-grid">
              <div className="hero-content">
                <div className="hero-badge">
                  <Coffee size={14} />
                  <span>Pasión por las tradiciones argentinas</span>
                </div>
                <h1>El verdadero ritual de un buen cebador</h1>
                <p>
                  En <strong>FMateando CBA</strong>, desde Córdoba Capital, te acercamos mates de algarrobo, calabaza y mucho más. Elegimos productos de calidad para que disfrutes del verdadero ritual del mate, con envíos a todo el país.
                </p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <a href="#catalogo" className="btn btn-primary">
                    Explorar Catálogo
                  </a>
                  <a href="#curado" className="btn btn-secondary">
                    Guía de Curado
                  </a>
                </div>
              </div>
              
              <div className="hero-image-container">
                <div className="hero-image-wrapper">
                  <img
                    src="/fmateando/mates/imperial/WhatsApp Image 2026-06-22 at 21.24.05 (1).jpeg"
                    alt="Mate Imperial Artesanal"
                    className="hero-image"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Catálogo de Productos */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-secondary)' }}>
              Cargando catálogo premium...
            </div>
          ) : (
            <Catalog products={products} onAddToCart={handleAddToCart} />
          )}

          {/* Guía de Curado */}
          <CureGuide />

          {/* Sección de Contacto */}
          <section id="contacto" className="contact-section">
            <div className="container">
              <div className="section-title">
                <h2>Contacto</h2>
                <p>¿Tienes dudas o buscas asesoramiento personalizado? Escríbenos</p>
              </div>

              <div className="contact-grid bg-glass">
                <div className="contact-info-cards">
                  <div className="contact-card">
                    <div className="contact-card-icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                    </div>
                    <div>
                      <h4 style={{ fontFamily: 'var(--font-heading)', margin: 0, fontWeight: 600 }}>WhatsApp</h4>
                      <p style={{ margin: '0.1rem 0 0.3rem 0', color: 'var(--text-secondary)' }}>+54 9 351 801-3657</p>
                      <a
                        href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || '5493518013657'}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="contact-link"
                      >
                        Chatear ahora &rarr;
                      </a>
                    </div>
                  </div>

                  <div className="contact-card">
                    <div className="contact-card-icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                      </svg>
                    </div>
                    <div>
                      <h4 style={{ fontFamily: 'var(--font-heading)', margin: 0, fontWeight: 600 }}>Instagram</h4>
                      <p style={{ margin: '0.1rem 0 0.3rem 0', color: 'var(--text-secondary)' }}>@FMateandoCba</p>
                      <a
                        href="https://instagram.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="contact-link"
                      >
                        Seguinos en Instagram &rarr;
                      </a>
                    </div>
                  </div>

                  <div className="contact-card">
                    <div className="contact-card-icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 style={{ fontFamily: 'var(--font-heading)', margin: 0, fontWeight: 600 }}>Atención Online</h4>
                      <p style={{ margin: '0.1rem 0 0.3rem 0', color: 'var(--text-secondary)' }}>Lunes a Sábado — 9:00 a 20:00 hs</p>
                      <span className="contact-badge-online">Online</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleCustomQuery} className="contact-form">
                  <h3 style={{ fontFamily: 'var(--font-heading)', margin: 0, fontSize: '1.25rem' }}>Envíanos una Consulta</h3>
                  
                  <div className="form-group">
                    <label htmlFor="contactName">Nombre Completo *</label>
                    <input
                      type="text"
                      id="contactName"
                      placeholder="Ej: Ariel Pérez"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="contactMessage">Tu Consulta *</label>
                    <textarea
                      id="contactMessage"
                      placeholder="Hola, ¿en qué zona de Córdoba están para coordinar envío o tienen envíos gratis?"
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      className="form-input"
                      rows="4"
                      style={{ resize: 'none' }}
                      required
                    ></textarea>
                  </div>

                  <button type="submit" className="btn btn-green">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ marginRight: '0.4rem' }}
                    >
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    Enviar Consulta a WhatsApp
                  </button>
                </form>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Carrito de Pedidos Flotante */}
      <button className="cart-floating-btn" onClick={() => setIsCartOpen(true)}>
        <ShoppingBag size={26} />
        {totalCartItems > 0 && <span className="cart-badge">{totalCartItems}</span>}
      </button>

      {/* Drawer del Carrito */}
      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
      />

      {/* Footer */}
      <footer>
        <div className="container footer-inner">
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', justifyContent: 'center' }}>
            <img src="/fmateando/logo.jpeg" alt="F Mateando CBA" style={{ width: '45px', height: '45px', borderRadius: '50%', border: '1px solid var(--border-color)', objectFit: 'cover' }} />
            <span className="logo-accent" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 'bold' }}>F Mateando CBA</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', fontSize: '0.9rem' }}>
            Emprendimiento cordobés dedicado a acercarte los mates más premium y accesorios con la mejor relación calidad-precio del mercado.
          </p>

          <div className="footer-socials">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link"
              title="Síguenos en Instagram"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </a>
            <a
              href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || '5493518013657'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="social-link"
              title="Escríbenos por WhatsApp"
            >
              <Phone size={18} />
            </a>
          </div>

          <ul className="footer-nav">
            <li>
              <a href="#inicio" onClick={() => setShowAdmin(false)}>
                Inicio
              </a>
            </li>
            <li>
              <a href="#catalogo" onClick={() => setShowAdmin(false)}>
                Catálogo
              </a>
            </li>
            <li>
              <a href="#curado" onClick={() => setShowAdmin(false)}>
                Cómo Curar
              </a>
            </li>
            <li>
              <a href="#contacto" onClick={() => setShowAdmin(false)}>
                Contacto
              </a>
            </li>
            <li>
              <a href="#admin" onClick={(e) => {
                e.preventDefault();
                setShowAdmin(true);
              }}>
                Panel Admin
              </a>
            </li>
          </ul>

          <div className="footer-copy">
            &copy; {new Date().getFullYear()} F Mateando CBA. Todos los derechos reservados. <br />
            Hecho con <Heart size={10} style={{ color: 'var(--accent-red)', display: 'inline' }} /> para los amantes del mate.
          </div>
        </div>
      </footer>
    </>
  );
}
