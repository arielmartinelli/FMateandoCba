import { supabase, isSupabaseConfigured } from './supabaseClient';

// Mock Data inicial elegante con imágenes de Unsplash dedicadas
const INITIAL_PRODUCTS = [
  // MATES -> IMPERIAL
  {
    id: 'm-imp-cal',
    name: 'Mate Imperial Calabaza',
    description: 'Calabaza brasileña seleccionada, forrado en cuero vacuno legítimo con costura uruguaya y virola de alpaca cincelada.',
    price: 28900,
    image_url: '/fmateando/mates/imperial/WhatsApp Image 2026-06-22 at 21.24.00 (1).jpeg',
    category: 'mates',
    subcategory: 'imperial',
    sub_subgroup: 'calabaza',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-imp-alg',
    name: 'Mate Imperial Algarrobo',
    description: 'Tallado en madera noble de algarrobo, forrado en cuero premium con virola de alpaca cincelada artesanalmente.',
    price: 26500,
    image_url: '/fmateando/mates/imperial/WhatsApp Image 2026-06-22 at 21.24.01 (1).jpeg',
    category: 'mates',
    subcategory: 'imperial',
    sub_subgroup: 'algarrobo',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-imp-pre',
    name: 'Mate Imperial Premium',
    description: 'Calabaza premium extra-gruesa, forrado en cuero seleccionado con virola de alpaca ancha y apliques de bronce labrados a mano.',
    price: 35000,
    image_url: '/fmateando/mates/imperial/WhatsApp Image 2026-06-22 at 21.24.02.jpeg',
    category: 'mates',
    subcategory: 'imperial',
    sub_subgroup: 'premium',
    is_out_of_stock: false,
    is_promo: true,
    promo_price: 31900
  },
  // MATES -> TORPEDO
  {
    id: 'm-tor-com',
    name: 'Mate Torpedo de Calabaza',
    description: 'Mate tipo torpedo de calabaza, forrado en cuero vaqueta con virola de acero inoxidable de alta resistencia.',
    price: 18500,
    image_url: '/fmateando/mates/torpedo/WhatsApp Image 2026-06-22 at 21.24.01.jpeg',
    category: 'mates',
    subcategory: 'torpedo',
    sub_subgroup: 'comun',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-tor-bol',
    name: 'Mate Torpedo Base Bolita',
    description: 'Torpedo de calabaza seleccionada, forrado en cuero premium con base reforzada de bolitas de bronce soldadas a mano.',
    price: 22500,
    image_url: '/fmateando/mates/torpedo/WhatsApp Image 2026-06-22 at 21.24.02 (1).jpeg',
    category: 'mates',
    subcategory: 'torpedo',
    sub_subgroup: 'base_bolita',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  // MATES -> GALLETA
  {
    id: 'm-gal-com',
    name: 'Mate Galleta Común',
    description: 'Calabaza con forma aplanada natural tradicional, ideal para llevar de viaje por su cómodo agarre.',
    price: 12000,
    image_url: '/fmateando/mates/galleta/WhatsApp Image 2026-06-22 at 21.24.03 (2).jpeg',
    category: 'mates',
    subcategory: 'galleta',
    sub_subgroup: 'comun',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-gal-vir',
    name: 'Mate Galleta con Virola',
    description: 'Calabaza tipo galleta con terminación de virola de aluminio pulido y costura fina a mano.',
    price: 15500,
    image_url: '/fmateando/mates/galleta/WhatsApp Image 2026-06-22 at 21.24.04.jpeg',
    category: 'mates',
    subcategory: 'galleta',
    sub_subgroup: 'virola',
    is_out_of_stock: true,
    is_promo: false,
    promo_price: null
  },
  // MATES -> CAMIONERA
  {
    id: 'm-cam-sel',
    name: 'Mate Camionero Seleccionado',
    description: 'Boca ancha, forrado en cuero vacuno grueso seleccionado con virola de acero inoxidable.',
    price: 21900,
    image_url: '/fmateando/mates/camionera/WhatsApp Image 2026-06-22 at 21.24.07 (2).jpeg',
    category: 'mates',
    subcategory: 'camionera',
    sub_subgroup: 'comun',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  // MATES -> RUSTICO
  {
    id: 'm-rus-alg',
    name: 'Mate Rústico Algarrobo',
    description: 'Madera de algarrobo maciza torneada a mano, ideal para cebadas tradicionales aromáticas.',
    price: 14500,
    image_url: '/fmateando/mates/rustico/WhatsApp Image 2026-06-22 at 21.24.00.jpeg',
    category: 'mates',
    subcategory: 'rustico',
    sub_subgroup: 'algarrobo',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  // BOMBILLAS
  {
    id: 'b-acero-res',
    name: 'Bombilla Resorte Inoxidable',
    description: 'Cuerpo de acero inoxidable quirúrgico con resorte regulable.',
    price: 4900,
    image_url: '/fmateando/bombillas/acero/WhatsApp Image 2026-06-23 at 12.24.14.jpeg',
    category: 'bombillas',
    subcategory: 'acero',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'b-alpaca-loro',
    name: 'Bombilla Pico de Loro Alpaca',
    description: 'Alpaca maciza de alta calidad, boquilla anatómica y filtro de pala desarmable.',
    price: 9500,
    image_url: '/fmateando/bombillas/alpaca/WhatsApp Image 2026-06-23 at 12.24.17.jpeg',
    category: 'bombillas',
    subcategory: 'alpaca',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  // ACCESORIOS
  {
    id: 'a-combo-yerb',
    name: 'Combo Yerbera y Azucarera',
    description: 'Lata yerbera y azucarera forrada en ecocuero de alta resistencia con pico vertedor.',
    price: 11500,
    image_url: '/fmateando/accesorios/WhatsApp Image 2026-06-23 at 12.25.10.jpeg',
    category: 'accesorios',
    subcategory: 'todos',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'a-matera-prem',
    name: 'Bolso Matero de Cuero',
    description: 'Portamates reforzado de cuero con correa regulable y divisiones internas.',
    price: 24000,
    image_url: '/fmateando/accesorios/WhatsApp Image 2026-06-23 at 12.24.19 (2).jpeg',
    category: 'accesorios',
    subcategory: 'todos',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  // TERMOS
  {
    id: 't-acero-1l',
    name: 'Termo Acero Inoxidable 1L',
    description: 'Termo clásico de acero doble capa con pico cebador de precisión.',
    price: 32000,
    image_url: '/fmateando/termos/WhatsApp Image 2026-06-23 at 12.24.18 (3).jpeg',
    category: 'accesorios',
    subcategory: 'termos',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: true,
    promo_price: 28500
  }
];

// Helper para inicializar LocalStorage
const getLocalProducts = () => {
  const local = localStorage.getItem('fmateando_products');
  if (!local) {
    localStorage.setItem('fmateando_products', JSON.stringify(INITIAL_PRODUCTS));
    return INITIAL_PRODUCTS;
  }
  return JSON.parse(local);
};

const saveLocalProducts = (products) => {
  localStorage.setItem('fmateando_products', JSON.stringify(products));
};

export const productService = {
  // Obtener todos los productos
  async getProducts() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Si Supabase devuelve vacío pero es la primera carga, podemos poblarlo opcionalmente
        if (data.length === 0) {
          // Poblar Supabase con la mock data inicial
          const { data: inserted, error: insertError } = await supabase
            .from('products')
            .insert(INITIAL_PRODUCTS.map(({ id, ...p }) => p)) // quitamos id para que genere UUID
            .select();
          if (insertError) {
            console.error('Error insertando datos iniciales en Supabase:', insertError);
            return INITIAL_PRODUCTS;
          }
          return inserted;
        }
        return data;
      } catch (err) {
        console.error('Error con Supabase, usando LocalStorage:', err);
        return getLocalProducts();
      }
    } else {
      return getLocalProducts();
    }
  },

  // Agregar un producto nuevo
  async addProduct(product) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('products')
          .insert([product])
          .select();
        
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Error agregando a Supabase, usando LocalStorage:', err);
        const local = getLocalProducts();
        const newProduct = { ...product, id: `local-${Date.now()}` };
        local.unshift(newProduct);
        saveLocalProducts(local);
        return newProduct;
      }
    } else {
      const local = getLocalProducts();
      const newProduct = { ...product, id: `local-${Date.now()}` };
      local.unshift(newProduct);
      saveLocalProducts(local);
      return newProduct;
    }
  },

  // Modificar precio y/o foto de un producto
  async updateProduct(id, updates) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('products')
          .update(updates)
          .eq('id', id)
          .select();
        
        if (error) throw error;
        return data[0];
      } catch (err) {
        console.error('Error actualizando en Supabase, usando LocalStorage:', err);
        const local = getLocalProducts();
        const updated = local.map(p => p.id === id ? { ...p, ...updates } : p);
        saveLocalProducts(updated);
        return updated.find(p => p.id === id);
      }
    } else {
      const local = getLocalProducts();
      const updated = local.map(p => p.id === id ? { ...p, ...updates } : p);
      saveLocalProducts(updated);
      return updated.find(p => p.id === id);
    }
  },

  // Eliminar un producto
  async deleteProduct(id) {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Error eliminando de Supabase, usando LocalStorage:', err);
        const local = getLocalProducts();
        const filtered = local.filter(p => p.id !== id);
        saveLocalProducts(filtered);
        return true;
      }
    } else {
      const local = getLocalProducts();
      const filtered = local.filter(p => p.id !== id);
      saveLocalProducts(filtered);
      return true;
    }
  }
};
