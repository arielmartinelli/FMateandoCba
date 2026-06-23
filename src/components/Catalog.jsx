import React, { useState, useMemo } from 'react';
import { ShoppingBag, Search, Tag, X } from 'lucide-react';

export default function Catalog({ products, onAddToCart }) {
  const [selectedCategory, setSelectedCategory] = useState('todos'); // 'todos', 'mates', 'bombillas', 'accesorios'
  const [selectedSubcategory, setSelectedSubcategory] = useState('todos'); // 'todos', 'imperial', 'torpedo', 'galleta'
  const [selectedSubSubgroup, setSelectedSubSubgroup] = useState('todos'); // 'todos', sub-subgroups...
  const [searchQuery, setSearchQuery] = useState('');

  // Resetear subniveles cuando cambia de categoría principal
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSelectedSubcategory('todos');
    setSelectedSubSubgroup('todos');
  };

  // Resetear sub-subniveles cuando cambia de subcategoría
  const handleSubcategoryChange = (subcat) => {
    setSelectedSubcategory(subcat);
    setSelectedSubSubgroup('todos');
  };

  // Determinar si debemos mostrar los subgrupos de mates
  const showMatesSubcategories = selectedCategory === 'mates';
  
  // Determinar qué sub-subgrupos mostrar según la subcategoría de Mates
  const subSubgroupsOptions = useMemo(() => {
    if (selectedCategory !== 'mates') return [];
    
    switch (selectedSubcategory) {
      case 'imperial':
        return [
          { value: 'calabaza', label: 'Calabaza' },
          { value: 'algarrobo', label: 'Algarrobo' },
          { value: 'premium', label: 'Premium' }
        ];
      case 'torpedo':
        return [
          { value: 'comun', label: 'Torpedo Común' },
          { value: 'base_bolita', label: 'Torpedo Base Bolita' }
        ];
      case 'galleta':
        return [
          { value: 'comun', label: 'Galleta Común' },
          { value: 'virola', label: 'Galleta con Virola' }
        ];
      default:
        return [];
    }
  }, [selectedCategory, selectedSubcategory]);

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // 1. Filtro de Categoría Principal
      if (selectedCategory !== 'todos' && product.category !== selectedCategory) {
        return false;
      }
      
      // 2. Filtro de Subcategoría (solo aplica si estamos en mates y no es 'todos')
      if (
        selectedCategory === 'mates' &&
        selectedSubcategory !== 'todos' &&
        product.subcategory !== selectedSubcategory
      ) {
        return false;
      }
      
      // 3. Filtro de Sub-subgrupo
      if (
        selectedCategory === 'mates' &&
        selectedSubcategory !== 'todos' &&
        selectedSubSubgroup !== 'todos' &&
        product.sub_subgroup !== selectedSubSubgroup
      ) {
        return false;
      }
      
      // 4. Filtro de Búsqueda por Texto
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesDesc = product.description.toLowerCase().includes(query);
        return matchesName || matchesDesc;
      }
      
      return true;
    });
  }, [products, selectedCategory, selectedSubcategory, selectedSubSubgroup, searchQuery]);

  return (
    <section id="catalogo" className="catalog-section">
      <div className="container">
        <div className="section-title">
          <h2>Catálogo de Productos</h2>
          <p>Explora nuestra selección artesanal de mates, bombillas y accesorios</p>
        </div>

        <div className="catalog-layout">
          {/* Barra de búsqueda y Filtros Principales */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Buscador */}
            <div style={{ position: 'relative', maxWidth: '450px', margin: '0 auto', width: '100%' }}>
              <input
                type="text"
                placeholder="Buscar mates, bombillas, termos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.5rem', borderRadius: '9999px' }}
              />
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
            </div>

            {/* Categorías Principales */}
            <div className="filter-categories">
              <button
                className={`cat-btn ${selectedCategory === 'todos' ? 'active' : ''}`}
                onClick={() => handleCategoryChange('todos')}
              >
                Todos los productos
              </button>
              <button
                className={`cat-btn ${selectedCategory === 'mates' ? 'active' : ''}`}
                onClick={() => handleCategoryChange('mates')}
              >
                Mates
              </button>
              <button
                className={`cat-btn ${selectedCategory === 'bombillas' ? 'active' : ''}`}
                onClick={() => handleCategoryChange('bombillas')}
              >
                Bombillas
              </button>
              <button
                className={`cat-btn ${selectedCategory === 'accesorios' ? 'active' : ''}`}
                onClick={() => handleCategoryChange('accesorios')}
              >
                Accesorios
              </button>
            </div>

            {/* Subcategorías de Mates */}
            {selectedCategory === 'mates' && (
              <div className="subgroup-filters">
                <button
                  className={`sub-btn ${selectedSubcategory === 'todos' ? 'active' : ''}`}
                  onClick={() => handleSubcategoryChange('todos')}
                >
                  Todos los Mates
                </button>
                <button
                  className={`sub-btn ${selectedSubcategory === 'imperial' ? 'active' : ''}`}
                  onClick={() => handleSubcategoryChange('imperial')}
                >
                  Mates Imperiales
                </button>
                <button
                  className={`sub-btn ${selectedSubcategory === 'torpedo' ? 'active' : ''}`}
                  onClick={() => handleSubcategoryChange('torpedo')}
                >
                  Mates Torpedo
                </button>
                <button
                  className={`sub-btn ${selectedSubcategory === 'galleta' ? 'active' : ''}`}
                  onClick={() => handleSubcategoryChange('galleta')}
                >
                  Mates Galleta
                </button>
                <button
                  className={`sub-btn ${selectedSubcategory === 'camionera' ? 'active' : ''}`}
                  onClick={() => handleSubcategoryChange('camionera')}
                >
                  Mates Camioneros
                </button>
                <button
                  className={`sub-btn ${selectedSubcategory === 'rustico' ? 'active' : ''}`}
                  onClick={() => handleSubcategoryChange('rustico')}
                >
                  Mates Rústicos
                </button>
              </div>
            )}

            {/* Subcategorías de Bombillas */}
            {selectedCategory === 'bombillas' && (
              <div className="subgroup-filters">
                <button
                  className={`sub-btn ${selectedSubcategory === 'todos' ? 'active' : ''}`}
                  onClick={() => handleSubcategoryChange('todos')}
                >
                  Todas las Bombillas
                </button>
                <button
                  className={`sub-btn ${selectedSubcategory === 'acero' ? 'active' : ''}`}
                  onClick={() => handleSubcategoryChange('acero')}
                >
                  Bombillas de Acero
                </button>
                <button
                  className={`sub-btn ${selectedSubcategory === 'alpaca' ? 'active' : ''}`}
                  onClick={() => handleSubcategoryChange('alpaca')}
                >
                  Bombillas de Alpaca
                </button>
              </div>
            )}

            {/* Subcategorías de Accesorios */}
            {selectedCategory === 'accesorios' && (
              <div className="subgroup-filters">
                <button
                  className={`sub-btn ${selectedSubcategory === 'todos' ? 'active' : ''}`}
                  onClick={() => handleSubcategoryChange('todos')}
                >
                  Todos los Accesorios
                </button>
                <button
                  className={`sub-btn ${selectedSubcategory === 'termos' ? 'active' : ''}`}
                  onClick={() => handleSubcategoryChange('termos')}
                >
                  Termos
                </button>
              </div>
            )}

            {/* Sub-subgrupos de Mates (Calabaza, Algarrobo, Premium, etc.) */}
            {showMatesSubcategories && selectedSubcategory !== 'todos' && subSubgroupsOptions.length > 0 && (
              <div className="subgroup-filters" style={{ marginTop: '-0.5rem' }}>
                <button
                  className={`sub-btn ${selectedSubSubgroup === 'todos' ? 'active' : ''}`}
                  onClick={() => setSelectedSubSubgroup('todos')}
                  style={{ fontSize: '0.8rem', padding: '0.3rem 1rem', borderStyle: 'dashed' }}
                >
                  Ver Todos
                </button>
                {subSubgroupsOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`sub-btn ${selectedSubSubgroup === opt.value ? 'active' : ''}`}
                    onClick={() => setSelectedSubSubgroup(opt.value)}
                    style={{ fontSize: '0.8rem', padding: '0.3rem 1rem' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grilla del catálogo */}
          <div className="catalog-grid">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                 <div key={product.id} className={`product-card ${product.is_out_of_stock ? 'out-of-stock-card' : ''}`}>
                  <div className="product-img-wrapper">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="product-img"
                      loading="lazy"
                    />
                    {product.is_out_of_stock && (
                      <div className="out-of-stock-overlay">
                        <span>AGOTADO</span>
                      </div>
                    )}
                    <span className="product-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {product.category} {product.subcategory !== 'todas' && product.subcategory !== 'todos' ? `• ${product.subcategory}` : ''}
                      {product.is_promo && (
                        <span style={{ background: '#d4af37', color: '#121212', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.55rem', fontWeight: 'bold' }}>
                          PROMO
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-desc">{product.description}</p>
                    <div className="product-footer">
                      {product.is_promo && product.promo_price ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="product-price" style={{ color: '#4ade80' }}>
                            ${product.promo_price.toLocaleString('es-AR')}
                          </span>
                          <span style={{ textDecoration: 'line-through', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ${product.price.toLocaleString('es-AR')}
                          </span>
                        </div>
                      ) : (
                        <span className="product-price">
                          ${product.price.toLocaleString('es-AR')}
                        </span>
                      )}
                      
                      {product.is_out_of_stock ? (
                        <button
                          className="btn-add-cart"
                          style={{ opacity: 0.5, cursor: 'not-allowed', background: '#222', color: '#777' }}
                          disabled
                          title="Sin stock disponible"
                        >
                          <X size={15} />
                        </button>
                      ) : (
                        <button
                          className="btn-add-cart"
                          onClick={() => onAddToCart(product)}
                          title="Agregar al pedido"
                        >
                          <ShoppingBag size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-products">
                <Tag size={40} style={{ marginBottom: '1rem', color: 'var(--text-muted)' }} />
                <h3>No encontramos productos</h3>
                <p>Prueba buscando con otros filtros o términos.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
