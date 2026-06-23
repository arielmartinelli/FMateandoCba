import React, { useState } from 'react';
import { ShoppingBag, X, Plus, Minus, Trash2, Send } from 'lucide-react';

export default function Cart({ isOpen, onClose, cartItems, onUpdateQty, onRemoveItem, onClearCart }) {
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('envio'); // 'envio' or 'retiro'

  if (!isOpen) return null;

  const totalAmount = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  // Limpiar el número de teléfono para WhatsApp
  const rawPhone = import.meta.env.VITE_WHATSAPP_NUMBER || '5493512026507';
  const whatsappPhone = rawPhone.replace(/\s+/g, '').replace(/-/g, '').replace(/\+/g, '');

  const handleSubmitOrder = (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    if (!customerName.trim()) {
      alert('Por favor ingresa tu nombre para continuar.');
      return;
    }

    // Formatear mensaje para WhatsApp
    let message = `Hola! Mi nombre es *${customerName.trim()}*.\nQuiero hacer el siguiente pedido en *F Mateando CBA*:\n\n`;
    message += `🛒 *DETALLE DEL PEDIDO:*\n`;
    
    cartItems.forEach((item) => {
      const subtotal = item.price * item.quantity;
      message += `• *${item.quantity}x* _${item.name}_ ($${item.price.toLocaleString('es-AR')} c/u) → *$${subtotal.toLocaleString('es-AR')}*\n`;
    });
    
    message += `\n💵 *TOTAL: $${totalAmount.toLocaleString('es-AR')}*\n\n`;
    
    if (deliveryMethod === 'envio') {
      message += `🚚 *Método de entrega:* Envío a domicilio\n`;
      if (customerAddress.trim()) {
        message += `📍 *Dirección de entrega:* ${customerAddress.trim()}\n`;
      } else {
        message += `📍 *Dirección de entrega:* A coordinar por aquí\n`;
      }
    } else {
      message += `🚚 *Método de entrega:* Retirar en punto de entrega\n`;
      message += `📍 *Punto de retiro:* A coordinar por aquí\n`;
    }

    message += `\n¡Quedo a la espera de confirmación de stock y detalles de pago! Muchas gracias.`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodedMessage}`;
    
    // Abrir WhatsApp en pestaña nueva
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="cart-drawer-overlay" onClick={onClose}>
      <div className="cart-drawer bg-glass" onClick={(e) => e.stopPropagation()}>
        <div className="cart-header">
          <h3>
            <ShoppingBag size={22} className="text-gold" />
            Tu Pedido
          </h3>
          <button className="btn-close-cart" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="cart-items">
          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <ShoppingBag size={48} style={{ opacity: 0.3 }} />
              <p>Tu lista de pedido está vacía</p>
              <button className="btn btn-secondary" onClick={onClose}>
                Ver Catálogo
              </button>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="cart-item-img"
                />
                <div className="cart-item-info">
                  <h4 className="cart-item-name">{item.name}</h4>
                  <span className="cart-item-price">
                    ${(item.price * item.quantity).toLocaleString('es-AR')}
                  </span>
                </div>
                <div className="cart-item-controls">
                  <button
                    className="qty-btn"
                    onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                  >
                    <Minus size={12} />
                  </button>
                  <span className="qty-num">{item.quantity}</span>
                  <button
                    className="qty-btn"
                    onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    className="btn-remove-item"
                    onClick={() => onRemoveItem(item.id)}
                    title="Eliminar ítem"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="cart-footer bg-glass">
            <div className="cart-summary-row">
              <span>Total del pedido:</span>
              <span className="cart-summary-total">
                ${totalAmount.toLocaleString('es-AR')}
              </span>
            </div>

            <form onSubmit={handleSubmitOrder} className="order-form">
              <div className="form-group">
                <label htmlFor="customerName">Nombre y Apellido *</label>
                <input
                  type="text"
                  id="customerName"
                  placeholder="Ej: Ariel Pérez"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>Método de Entrega *</label>
                <select
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(e.target.value)}
                  className="select-input"
                  style={{ width: '100%' }}
                >
                  <option value="envio">Envío a domicilio</option>
                  <option value="retiro">Retirar en punto de entrega</option>
                </select>
              </div>

              {deliveryMethod === 'envio' && (
                <div className="form-group">
                  <label htmlFor="customerAddress">Dirección de Envío (Opcional)</label>
                  <input
                    type="text"
                    id="customerAddress"
                    placeholder="Ej: Av. Colón 1234, B° Alberdi"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="form-input"
                  />
                </div>
              )}

              <button type="submit" className="btn btn-green btn-order-whatsapp" style={{ marginTop: '0.5rem' }}>
                <Send size={18} />
                Enviar Pedido a WhatsApp
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
