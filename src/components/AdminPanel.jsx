import React, { useState, useEffect } from 'react';
import { Lock, Plus, Edit2, Trash2, Check, RefreshCw, X, Image as ImageIcon } from 'lucide-react';

export default function AdminPanel({ products, onAddProduct, onUpdateProduct, onDeleteProduct }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Estados del Formulario de Producto
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
  const [isOutOfStock, setIsOutOfStock] = useState(false);
  const [isPromo, setIsPromo] = useState(false);
  const [promoPrice, setPromoPrice] = useState('');

  // Cargar contraseña guardada en sesión/local si la hay para comodidad del usuario
  useEffect(() => {
    const savedAuth = localStorage.getItem('fmateando_admin_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'montañita';
    if (password === correctPassword) {
      setIsAuthenticated(true);
      setLoginError('');
      localStorage.setItem('fmateando_admin_auth', 'true');
    } else {
      setLoginError('Contraseña incorrecta. Intenta de nuevo.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    localStorage.removeItem('fmateando_admin_auth');
  };

  // Convertir imagen cargada localmente a base64
  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFilePreview(reader.result);
        setImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Configurar las subcategorías por defecto cuando cambia la categoría
  useEffect(() => {
    if (category === 'mates') {
      setSubcategory('imperial');
      setSubSubgroup('calabaza');
    } else if (category === 'bombillas') {
      setSubcategory('todas');
      setSubSubgroup('');
    } else if (category === 'accesorios') {
      setSubcategory('todos');
      setSubSubgroup('');
    }
  }, [category]);

  // Configurar sub-subgrupos por defecto cuando cambia la subcategoría de mates
  useEffect(() => {
    if (category === 'mates') {
      if (subcategory === 'imperial') {
        setSubSubgroup('calabaza');
      } else if (subcategory === 'torpedo') {
        setSubSubgroup('comun');
      } else if (subcategory === 'galleta') {
        setSubSubgroup('comun');
      }
    } else {
      setSubSubgroup('');
    }
  }, [subcategory, category]);

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setName('');
    setDescription('');
    setPrice('');
    setImageUrl('');
    setImageFilePreview('');
    setCategory('mates');
    setSubcategory('imperial');
    setSubSubgroup('calabaza');
    setIsOutOfStock(false);
    setIsPromo(false);
    setPromoPrice('');
  };

  const handleEditClick = (product) => {
    setIsEditing(true);
    setEditId(product.id);
    setName(product.name);
    setDescription(product.description);
    setPrice(product.price);
    setImageUrl(product.image_url);
    setImageFilePreview(product.image_url);
    setCategory(product.category);
    setSubcategory(product.subcategory);
    setSubSubgroup(product.sub_subgroup || '');
    setIsOutOfStock(product.is_out_of_stock || false);
    setIsPromo(product.is_promo || false);
    setPromoPrice(product.promo_price || '');
    
    // Desplazarse al formulario
    document.getElementById('admin-form-anchor')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !price || !imageUrl) {
      alert('Por favor completa los campos obligatorios (Nombre, Precio e Imagen).');
      return;
    }

    if (isPromo && (!promoPrice || parseFloat(promoPrice) >= parseFloat(price))) {
      alert('Por favor ingresa un precio de promoción válido menor al precio original.');
      return;
    }

    const productData = {
      name,
      description,
      price: parseFloat(price),
      image_url: imageUrl,
      category,
      subcategory,
      sub_subgroup: subSubgroup,
      is_out_of_stock: isOutOfStock,
      is_promo: isPromo,
      promo_price: isPromo && promoPrice ? parseFloat(promoPrice) : null
    };

    if (isEditing) {
      await onUpdateProduct(editId, productData);
      alert('Producto actualizado con éxito');
    } else {
      await onAddProduct(productData);
      alert('Producto agregado con éxito');
    }
    resetForm();
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este producto del catálogo?')) {
      await onDeleteProduct(id);
    }
  };

  // Si no está autenticado, renderizar login simple
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
                required
              />
              {loginError && <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem' }}>{loginError}</p>}
              <button type="submit" className="btn btn-primary">
                Ingresar
              </button>
            </form>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="admin" className="admin-section">
      <div id="admin-form-anchor" className="container">
        <div className="admin-header">
          <div>
            <h2 style={{ fontSize: '2rem' }}>Panel de Administración</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Gestiona los productos visibles en el catálogo</p>
          </div>
          <button className="btn btn-outline" onClick={handleLogout}>
            Cerrar Sesión
          </button>
        </div>

        <div className="admin-layout">
          {/* Formulario de Carga / Edición */}
          <div className="admin-form-container">
            <div className="admin-panel-card bg-glass">
              <h3>{isEditing ? 'Modificar Producto' : 'Agregar Nuevo Producto'}</h3>
              
              <form onSubmit={handleSubmit} className="admin-form">
                <div className="form-group">
                  <label>Nombre del Producto *</label>
                  <input
                    type="text"
                    placeholder="Ej: Mate Torpedo Imperial"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Descripción Corta *</label>
                  <textarea
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
                  <label>Precio (ARS) *</label>
                  <input
                    type="number"
                    placeholder="Ej: 24500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="form-input"
                    min="0"
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={isOutOfStock}
                      onChange={(e) => setIsOutOfStock(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--accent-gold)' }}
                    />
                    Marcar como Agotado
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={isPromo}
                      onChange={(e) => setIsPromo(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--accent-gold)' }}
                    />
                    Marcar en Promoción
                  </label>
                </div>

                {isPromo && (
                  <div className="form-group">
                    <label>Precio de Promoción (ARS) *</label>
                    <input
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
                  <label>Categoría Principal *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="select-input"
                  >
                    <option value="mates">Mates</option>
                    <option value="bombillas">Bombillas</option>
                    <option value="accesorios">Accesorios</option>
                  </select>
                </div>

                {/* Subcategorías dinámicas si es MATE */}
                {category === 'mates' && (
                  <div className="form-group">
                    <label>Tipo de Mate (Subcategoría) *</label>
                    <select
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      className="select-input"
                    >
                      <option value="imperial">Imperial</option>
                      <option value="torpedo">Torpedo</option>
                      <option value="galleta">Galleta</option>
                    </select>
                  </div>
                )}

                {/* Sub-subgrupos dinámicos basados en la subcategoría de MATE */}
                {category === 'mates' && subcategory === 'imperial' && (
                  <div className="form-group">
                    <label>Subgrupo Imperial *</label>
                    <select
                      value={subSubgroup}
                      onChange={(e) => setSubSubgroup(e.target.value)}
                      className="select-input"
                    >
                      <option value="calabaza">Calabaza</option>
                      <option value="algarrobo">Algarrobo</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                )}

                {category === 'mates' && subcategory === 'torpedo' && (
                  <div className="form-group">
                    <label>Subgrupo Torpedo *</label>
                    <select
                      value={subSubgroup}
                      onChange={(e) => setSubSubgroup(e.target.value)}
                      className="select-input"
                    >
                      <option value="comun">Torpedo Común</option>
                      <option value="base_bolita">Base Bolita</option>
                    </select>
                  </div>
                )}

                {category === 'mates' && subcategory === 'galleta' && (
                  <div className="form-group">
                    <label>Subgrupo Galleta *</label>
                    <select
                      value={subSubgroup}
                      onChange={(e) => setSubSubgroup(e.target.value)}
                      className="select-input"
                    >
                      <option value="comun">Galleta Común</option>
                      <option value="virola">Con Virola</option>
                    </select>
                  </div>
                )}

                {/* Subida de Foto */}
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
                  />
                  <input
                    type="text"
                    placeholder="O pega URL de imagen directa..."
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setImageFilePreview(e.target.value);
                    }}
                    className="form-input"
                    style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary btn-form-submit" style={{ flex: 1 }}>
                    {isEditing ? <RefreshCw size={16} /> : <Plus size={16} />}
                    {isEditing ? 'Actualizar' : 'Agregar'}
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

          {/* Grilla de productos cargados para control */}
          <div className="admin-products-table">
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', marginBottom: '1.5rem' }}>
              Productos Cargados ({products.length})
            </h3>
            
            <div className="products-table-list">
              {products.map((product) => (
                <div key={product.id} className="table-row">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="table-row-img"
                  />
                  <div className="table-row-details">
                    <h4 className="table-row-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {product.name}
                      {product.is_out_of_stock && (
                        <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: 'rgba(204,90,90,0.15)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', borderRadius: '9999px', fontWeight: 'bold' }}>
                          AGOTADO
                        </span>
                      )}
                      {product.is_promo && (
                        <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: 'rgba(61,111,76,0.15)', border: '1px solid var(--accent-green)', color: '#4ade80', borderRadius: '9999px', fontWeight: 'bold' }}>
                          PROMO
                        </span>
                      )}
                    </h4>
                    <p className="table-row-meta">
                      {product.category} {product.subcategory !== 'todos' && product.subcategory !== 'todas' ? `> ${product.subcategory}` : ''}
                      {product.sub_subgroup ? ` > ${product.sub_subgroup}` : ''}
                    </p>
                  </div>
                  <div className="table-row-price" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
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
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      className="btn-table-action delete"
                      onClick={() => handleDeleteClick(product.id)}
                      title="Eliminar producto"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
              
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
