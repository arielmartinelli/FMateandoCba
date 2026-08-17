import { supabase, isSupabaseConfigured } from './supabaseClient';

// Mock Data inicial elegante con las 64 imágenes reales de la carpeta fmateando
const INITIAL_PRODUCTS = [
  // MATES -> IMPERIAL (14)
  {
    id: 'm-imp-1',
    name: 'Mate Imperial Calabaza Costura Uruguaya',
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
    id: 'm-imp-2',
    name: 'Mate Imperial Algarrobo Virolado',
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
    id: 'm-imp-3',
    name: 'Mate Imperial Premium Cincelado',
    description: 'Calabaza premium extra-gruesa, forrado en cuero seleccionado con virola de alpaca ancha y apliques de bronce labrados a mano.',
    price: 35000,
    image_url: '/fmateando/mates/imperial/WhatsApp Image 2026-06-22 at 21.24.01 (2).jpeg',
    category: 'mates',
    subcategory: 'imperial',
    sub_subgroup: 'premium',
    is_out_of_stock: false,
    is_promo: true,
    promo_price: 31900
  },
  {
    id: 'm-imp-4',
    name: 'Mate Imperial Calabaza Especial',
    description: 'Calabaza seleccionada de paredes gruesas, virola alta de alpaca labrada.',
    price: 29500,
    image_url: '/fmateando/mates/imperial/WhatsApp Image 2026-06-22 at 21.24.02.jpeg',
    category: 'mates',
    subcategory: 'imperial',
    sub_subgroup: 'calabaza',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-imp-5',
    name: 'Mate Imperial Algarrobo Cincelado',
    description: 'Algarrobo seleccionado con tratamiento artesanal y virola de alpaca.',
    price: 27000,
    image_url: '/fmateando/mates/imperial/WhatsApp Image 2026-06-22 at 21.24.03 (1).jpeg',
    category: 'mates',
    subcategory: 'imperial',
    sub_subgroup: 'algarrobo',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-imp-6',
    name: 'Mate Imperial Premium Alpaca',
    description: 'Edición especial con virola ancha de alpaca pura y cuero vacuno de máxima calidad.',
    price: 36500,
    image_url: '/fmateando/mates/imperial/WhatsApp Image 2026-06-22 at 21.24.05 (1).jpeg',
    category: 'mates',
    subcategory: 'imperial',
    sub_subgroup: 'premium',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-imp-7',
    name: 'Mate Imperial Calabaza Cuero Negro',
    description: 'Forrado en cuero vacuno teñido en negro brillante con costura a contratono.',
    price: 28900,
    image_url: '/fmateando/mates/imperial/WhatsApp Image 2026-06-22 at 21.24.06 (1).jpeg',
    category: 'mates',
    subcategory: 'imperial',
    sub_subgroup: 'calabaza',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-imp-8',
    name: 'Mate Imperial Algarrobo Labrado',
    description: 'Madera de algarrobo con labrado rústico y virola de alpaca lisa.',
    price: 26900,
    image_url: '/fmateando/mates/imperial/WhatsApp Image 2026-06-22 at 21.24.06.jpeg',
    category: 'mates',
    subcategory: 'imperial',
    sub_subgroup: 'algarrobo',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-imp-9',
    name: 'Mate Imperial Calabaza Seleccionada',
    description: 'Calabaza uruguaya de forma impecable con virola cincelada artesanal.',
    price: 29000,
    image_url: '/fmateando/mates/imperial/WhatsApp Image 2026-06-22 at 21.24.07 (1).jpeg',
    category: 'mates',
    subcategory: 'imperial',
    sub_subgroup: 'calabaza',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-imp-10',
    name: 'Mate Imperial Premium Flor de Lis',
    description: 'Virola de alpaca trabajada con motivo Flor de Lis y apliques de bronce.',
    price: 37000,
    image_url: '/fmateando/mates/imperial/WhatsApp Image 2026-06-22 at 21.24.10 (1).jpeg',
    category: 'mates',
    subcategory: 'imperial',
    sub_subgroup: 'premium',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-imp-11',
    name: 'Mate Imperial Calabaza Marrón',
    description: 'Cuero sobrio marrón cuero con base de apoyo estable y virola alta.',
    price: 28500,
    image_url: '/fmateando/mates/imperial/WhatsApp Image 2026-06-22 at 21.24.11 (1).jpeg',
    category: 'mates',
    subcategory: 'imperial',
    sub_subgroup: 'calabaza',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-imp-12',
    name: 'Mate Imperial Algarrobo Tradicional',
    description: 'Madera de algarrobo macizo con excelente terminación suave al tacto.',
    price: 26000,
    image_url: '/fmateando/mates/imperial/WhatsApp Image 2026-06-22 at 21.24.11.jpeg',
    category: 'mates',
    subcategory: 'imperial',
    sub_subgroup: 'algarrobo',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-imp-13',
    name: 'Mate Imperial Premium Rey',
    description: 'Diseño exclusivo de gran porte, ideal para regalar o coleccionar.',
    price: 38000,
    image_url: '/fmateando/mates/imperial/WhatsApp Image 2026-06-22 at 21.24.12 (1).jpeg',
    category: 'mates',
    subcategory: 'imperial',
    sub_subgroup: 'premium',
    is_out_of_stock: false,
    is_promo: true,
    promo_price: 34900
  },
  {
    id: 'm-imp-14',
    name: 'Mate Imperial Calabaza Virolada',
    description: 'Calabaza natural con virola fina pulida a mano.',
    price: 28900,
    image_url: '/fmateando/mates/imperial/WhatsApp Image 2026-06-22 at 21.24.12.jpeg',
    category: 'mates',
    subcategory: 'imperial',
    sub_subgroup: 'calabaza',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },

  // MATES -> TORPEDO (18)
  {
    id: 'm-tor-1',
    name: 'Mate Torpedo Calabaza Común',
    description: 'Mate tipo torpedo de calabaza, forrado en cuero vaqueta con virola de acero inoxidable.',
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
    id: 'm-tor-2',
    name: 'Mate Torpedo Base Bolita Bronce',
    description: 'Torpedo de calabaza seleccionada con base reforzada de bolitas de bronce.',
    price: 22500,
    image_url: '/fmateando/mates/torpedo/WhatsApp Image 2026-06-22 at 21.24.02 (1).jpeg',
    category: 'mates',
    subcategory: 'torpedo',
    sub_subgroup: 'base_bolita',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-tor-3',
    name: 'Mate Torpedo Cuero Negro',
    description: 'Forma elegante estilizada con revestimiento de cuero vacuno negro.',
    price: 18900,
    image_url: '/fmateando/mates/torpedo/WhatsApp Image 2026-06-22 at 21.24.02 (2).jpeg',
    category: 'mates',
    subcategory: 'torpedo',
    sub_subgroup: 'comun',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-tor-4',
    name: 'Mate Torpedo Base Bolita Alpaca',
    description: 'Torpedo con base de cuatro patas de bolita en alpaca soldada.',
    price: 23000,
    image_url: '/fmateando/mates/torpedo/WhatsApp Image 2026-06-22 at 21.24.03.jpeg',
    category: 'mates',
    subcategory: 'torpedo',
    sub_subgroup: 'base_bolita',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-tor-5',
    name: 'Mate Torpedo Calabaza Seleccionada',
    description: 'Paredes gruesas para cebadas prolongadas con óptima temperatura.',
    price: 19500,
    image_url: '/fmateando/mates/torpedo/WhatsApp Image 2026-06-22 at 21.24.04 (1).jpeg',
    category: 'mates',
    subcategory: 'torpedo',
    sub_subgroup: 'comun',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-tor-6',
    name: 'Mate Torpedo Base Bolita Reforzado',
    description: 'Base de gran soporte anti-vuelco con costura fina artesanal.',
    price: 23500,
    image_url: '/fmateando/mates/torpedo/WhatsApp Image 2026-06-22 at 21.24.04 (2).jpeg',
    category: 'mates',
    subcategory: 'torpedo',
    sub_subgroup: 'base_bolita',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-tor-7',
    name: 'Mate Torpedo Virola Inox',
    description: 'Virola lisa de acero quirúrgico que no altera el sabor del mate.',
    price: 18500,
    image_url: '/fmateando/mates/torpedo/WhatsApp Image 2026-06-22 at 21.24.05 (2).jpeg',
    category: 'mates',
    subcategory: 'torpedo',
    sub_subgroup: 'comun',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-tor-8',
    name: 'Mate Torpedo Base Bolita Cuero Vaqueta',
    description: 'Cuero vaqueta rústico resistente al uso diario.',
    price: 22900,
    image_url: '/fmateando/mates/torpedo/WhatsApp Image 2026-06-22 at 21.24.05.jpeg',
    category: 'mates',
    subcategory: 'torpedo',
    sub_subgroup: 'base_bolita',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-tor-9',
    name: 'Mate Torpedo Calabaza Cincelado',
    description: 'Virola con labrado Cincelado criollo artesanal.',
    price: 19900,
    image_url: '/fmateando/mates/torpedo/WhatsApp Image 2026-06-22 at 21.24.06 (2).jpeg',
    category: 'mates',
    subcategory: 'torpedo',
    sub_subgroup: 'comun',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-tor-10',
    name: 'Mate Torpedo Base Bolita Artesanal',
    description: 'Base confeccionada a mano por artesanos orfebres.',
    price: 23900,
    image_url: '/fmateando/mates/torpedo/WhatsApp Image 2026-06-22 at 21.24.07 (3).jpeg',
    category: 'mates',
    subcategory: 'torpedo',
    sub_subgroup: 'base_bolita',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-tor-11',
    name: 'Mate Torpedo Cuero Marrón',
    description: 'Tono café clásico con costura reforzada a tono.',
    price: 18500,
    image_url: '/fmateando/mates/torpedo/WhatsApp Image 2026-06-22 at 21.24.07.jpeg',
    category: 'mates',
    subcategory: 'torpedo',
    sub_subgroup: 'comun',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-tor-12',
    name: 'Mate Torpedo Base Bolita Premium',
    description: 'Selección de calabazas grandes con virola ancha.',
    price: 24500,
    image_url: '/fmateando/mates/torpedo/WhatsApp Image 2026-06-22 at 21.24.08 (3).jpeg',
    category: 'mates',
    subcategory: 'torpedo',
    sub_subgroup: 'base_bolita',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-tor-13',
    name: 'Mate Torpedo Calabaza Gruesa',
    description: 'Gran capacidad y durabilidad para amantes del mate largo.',
    price: 19000,
    image_url: '/fmateando/mates/torpedo/WhatsApp Image 2026-06-22 at 21.24.08.jpeg',
    category: 'mates',
    subcategory: 'torpedo',
    sub_subgroup: 'comun',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-tor-14',
    name: 'Mate Torpedo Base Bolita Especial',
    description: 'Calabaza mediana muy cómoda al agarre.',
    price: 22500,
    image_url: '/fmateando/mates/torpedo/WhatsApp Image 2026-06-22 at 21.24.09.jpeg',
    category: 'mates',
    subcategory: 'torpedo',
    sub_subgroup: 'base_bolita',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-tor-15',
    name: 'Mate Torpedo Cuero Labrado',
    description: 'Textura labrada en relieve sobre el cuero.',
    price: 19500,
    image_url: '/fmateando/mates/torpedo/WhatsApp Image 2026-06-22 at 21.24.10 (2).jpeg',
    category: 'mates',
    subcategory: 'torpedo',
    sub_subgroup: 'comun',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-tor-16',
    name: 'Mate Torpedo Base Bolita Uru',
    description: 'Estilo uruguayo tradicional con base de bolitas de bronce.',
    price: 23900,
    image_url: '/fmateando/mates/torpedo/WhatsApp Image 2026-06-22 at 21.24.10 (3).jpeg',
    category: 'mates',
    subcategory: 'torpedo',
    sub_subgroup: 'base_bolita',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-tor-17',
    name: 'Mate Torpedo Calabaza Mini',
    description: 'Formato compacto ideal para cebar individualmente.',
    price: 17500,
    image_url: '/fmateando/mates/torpedo/WhatsApp Image 2026-06-22 at 21.24.12 (2).jpeg',
    category: 'mates',
    subcategory: 'torpedo',
    sub_subgroup: 'comun',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-tor-18',
    name: 'Mate Torpedo Base Bolita XL',
    description: 'Boca ancha y formato gigante con base de 4 soportes.',
    price: 24900,
    image_url: '/fmateando/mates/torpedo/WhatsApp Image 2026-06-22 at 21.24.12 (3).jpeg',
    category: 'mates',
    subcategory: 'torpedo',
    sub_subgroup: 'base_bolita',
    is_out_of_stock: false,
    is_promo: true,
    promo_price: 21900
  },

  // MATES -> GALLETA (6)
  {
    id: 'm-gal-1',
    name: 'Mate Galleta Común',
    description: 'Calabaza con forma aplanada natural tradicional, ideal para llevar de viaje.',
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
    id: 'm-gal-2',
    name: 'Mate Galleta con Virola',
    description: 'Calabaza tipo galleta con terminación de virola de aluminio pulido.',
    price: 15500,
    image_url: '/fmateando/mates/galleta/WhatsApp Image 2026-06-22 at 21.24.04.jpeg',
    category: 'mates',
    subcategory: 'galleta',
    sub_subgroup: 'virola',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-gal-3',
    name: 'Mate Galleta Rústico',
    description: 'Calabaza aplanada silvestre curada al sol.',
    price: 12500,
    image_url: '/fmateando/mates/galleta/WhatsApp Image 2026-06-22 at 21.24.09 (2).jpeg',
    category: 'mates',
    subcategory: 'galleta',
    sub_subgroup: 'comun',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-gal-4',
    name: 'Mate Galleta Virola Pulida',
    description: 'Boca con refuerzo metálico pulido y costura fina a mano.',
    price: 15900,
    image_url: '/fmateando/mates/galleta/WhatsApp Image 2026-06-22 at 21.24.10.jpeg',
    category: 'mates',
    subcategory: 'galleta',
    sub_subgroup: 'virola',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-gal-5',
    name: 'Mate Galleta Viajero',
    description: 'Diseño liviano ideal para bolso matero y viajes.',
    price: 13000,
    image_url: '/fmateando/mates/galleta/WhatsApp Image 2026-06-22 at 21.24.11 (2).jpeg',
    category: 'mates',
    subcategory: 'galleta',
    sub_subgroup: 'comun',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-gal-6',
    name: 'Mate Galleta Virola Alpaca',
    description: 'Terminación superior de alpaca con grabado artesanal.',
    price: 16500,
    image_url: '/fmateando/mates/galleta/WhatsApp Image 2026-06-22 at 21.24.11 (3).jpeg',
    category: 'mates',
    subcategory: 'galleta',
    sub_subgroup: 'virola',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },

  // MATES -> CAMIONERA (3)
  {
    id: 'm-cam-1',
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
  {
    id: 'm-cam-2',
    name: 'Mate Camionero Algarrobo',
    description: 'Formato camionero cincelado en madera de algarrobo noble.',
    price: 22500,
    image_url: '/fmateando/mates/camionera/WhatsApp Image 2026-06-22 at 21.24.08 (1).jpeg',
    category: 'mates',
    subcategory: 'camionera',
    sub_subgroup: 'algarrobo',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-cam-3',
    name: 'Mate Camionero Calabaza Boca Ancha',
    description: 'Boca súper amplia ideal para rendir la yerba al máximo.',
    price: 21500,
    image_url: '/fmateando/mates/camionera/WhatsApp Image 2026-06-22 at 21.24.08 (2).jpeg',
    category: 'mates',
    subcategory: 'camionera',
    sub_subgroup: 'calabaza',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },

  // MATES -> RUSTICO (2)
  {
    id: 'm-rus-1',
    name: 'Mate Rústico Algarrobo',
    description: 'Madera de algarrobo maciza torneada a mano, ideal para cebadas aromáticas.',
    price: 14500,
    image_url: '/fmateando/mates/rustico/WhatsApp Image 2026-06-22 at 21.24.00.jpeg',
    category: 'mates',
    subcategory: 'rustico',
    sub_subgroup: 'algarrobo',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'm-rus-2',
    name: 'Mate Rústico Torneado',
    description: 'Cuerpo de madera tallada con surcos artesanales.',
    price: 13900,
    image_url: '/fmateando/mates/rustico/WhatsApp Image 2026-06-22 at 21.24.09 (1).jpeg',
    category: 'mates',
    subcategory: 'rustico',
    sub_subgroup: 'comun',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },

  // BOMBILLAS ACERO (8)
  {
    id: 'b-ace-1',
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
    id: 'b-ace-2',
    name: 'Bombilla Pico de Loro Acero',
    description: 'Boquilla curvada anatómica de acero quirúrgico.',
    price: 5500,
    image_url: '/fmateando/bombillas/acero/WhatsApp Image 2026-06-23 at 12.24.14 (1).jpeg',
    category: 'bombillas',
    subcategory: 'acero',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'b-ace-3',
    name: 'Bombilla Cuchara Acero',
    description: 'Filtro formato cuchara microperforado anti-obstrucción.',
    price: 5200,
    image_url: '/fmateando/bombillas/acero/WhatsApp Image 2026-06-23 at 12.24.15.jpeg',
    category: 'bombillas',
    subcategory: 'acero',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'b-ace-4',
    name: 'Bombilla Plana Inox',
    description: 'Caño plano elegante de fácil limpieza.',
    price: 4800,
    image_url: '/fmateando/bombillas/acero/WhatsApp Image 2026-06-23 at 12.24.16.jpeg',
    category: 'bombillas',
    subcategory: 'acero',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'b-ace-5',
    name: 'Bombilla Anillo Dorado Acero',
    description: 'Detalle de virola dorada en boquilla de acero.',
    price: 6200,
    image_url: '/fmateando/bombillas/acero/WhatsApp Image 2026-06-23 at 12.24.16 (1).jpeg',
    category: 'bombillas',
    subcategory: 'acero',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'b-ace-6',
    name: 'Bombilla Desarmable Acero',
    description: 'Filtro desenroscable para limpieza e higiene profunda.',
    price: 5900,
    image_url: '/fmateando/bombillas/acero/WhatsApp Image 2026-06-23 at 12.24.16 (2).jpeg',
    category: 'bombillas',
    subcategory: 'acero',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'b-ace-7',
    name: 'Bombilla Curva Acero',
    description: 'Diseño ergonómico ideal para mates imperiales.',
    price: 5100,
    image_url: '/fmateando/bombillas/acero/WhatsApp Image 2026-06-23 at 12.24.16 (3).jpeg',
    category: 'bombillas',
    subcategory: 'acero',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'b-ace-8',
    name: 'Bombilla Premium Inox',
    description: 'Cuerpo reforzado pesado con boquilla pulida.',
    price: 6500,
    image_url: '/fmateando/bombillas/acero/WhatsApp Image 2026-06-23 at 12.24.18 (1).jpeg',
    category: 'bombillas',
    subcategory: 'acero',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },

  // BOMBILLAS ALPACA (6)
  {
    id: 'b-alp-1',
    name: 'Bombilla Pico de Loro Alpaca',
    description: 'Alpaca maciza de alta calidad, boquilla anatómica y filtro desarmable.',
    price: 9500,
    image_url: '/fmateando/bombillas/alpaca/WhatsApp Image 2026-06-23 at 12.24.17.jpeg',
    category: 'bombillas',
    subcategory: 'alpaca',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'b-alp-2',
    name: 'Bombilla Cincelada Alpaca',
    description: 'Caño de alpaca cincelado a mano por orfebres.',
    price: 10500,
    image_url: '/fmateando/bombillas/alpaca/WhatsApp Image 2026-06-23 at 12.24.17 (1).jpeg',
    category: 'bombillas',
    subcategory: 'alpaca',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'b-alp-3',
    name: 'Bombilla Cuchara Alpaca',
    description: 'Filtro de cuchara en alpaca maciza con excelente filtrado.',
    price: 9800,
    image_url: '/fmateando/bombillas/alpaca/WhatsApp Image 2026-06-23 at 12.24.17 (2).jpeg',
    category: 'bombillas',
    subcategory: 'alpaca',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'b-alp-4',
    name: 'Bombilla Boquilla Bronce Alpaca',
    description: 'Cuerpo de alpaca con aplique de bronce grabado.',
    price: 11200,
    image_url: '/fmateando/bombillas/alpaca/WhatsApp Image 2026-06-23 at 12.24.17 (3).jpeg',
    category: 'bombillas',
    subcategory: 'alpaca',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'b-alp-5',
    name: 'Bombilla Rey Alpaca',
    description: 'Diseño exclusivo virola Rey de alpaca pesada.',
    price: 11900,
    image_url: '/fmateando/bombillas/alpaca/WhatsApp Image 2026-06-23 at 12.24.18.jpeg',
    category: 'bombillas',
    subcategory: 'alpaca',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 'b-alp-6',
    name: 'Bombilla Plana Alpaca Cincelada',
    description: 'Formato plano en alpaca pulida a mano.',
    price: 10200,
    image_url: '/fmateando/bombillas/alpaca/WhatsApp Image 2026-06-23 at 12.24.18 (2).jpeg',
    category: 'bombillas',
    subcategory: 'alpaca',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },

  // TERMOS (4)
  {
    id: 't-ter-1',
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
  },
  {
    id: 't-ter-2',
    name: 'Termo Media Manija Acero',
    description: 'Agarre cómodo con pico cebador cebada continua.',
    price: 34500,
    image_url: '/fmateando/termos/WhatsApp Image 2026-06-23 at 12.24.19 (1).jpeg',
    category: 'accesorios',
    subcategory: 'termos',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 't-ter-3',
    name: 'Termo Sifón 1.2L',
    description: 'Capacidad extra con sistema de vertido por presión.',
    price: 38000,
    image_url: '/fmateando/termos/WhatsApp Image 2026-06-23 at 12.24.19 (3).jpeg',
    category: 'accesorios',
    subcategory: 'termos',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },
  {
    id: 't-ter-4',
    name: 'Termo Engomado Negro 1L',
    description: 'Revestimiento engomado antideslizante de alta conservación térmica.',
    price: 36000,
    image_url: '/fmateando/termos/WhatsApp Image 2026-06-23 at 12.24.20.jpeg',
    category: 'accesorios',
    subcategory: 'termos',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  },

  // ACCESORIOS (3)
  {
    id: 'a-acc-1',
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
  {
    id: 'a-acc-2',
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
    id: 'a-acc-3',
    name: 'Canasta Matera de Ecocuero',
    description: 'Canasta rígida con compartimentos para mate, termo y yerbera.',
    price: 18500,
    image_url: '/fmateando/accesorios/WhatsApp Image 2026-06-23 at 12.25.11.jpeg',
    category: 'accesorios',
    subcategory: 'todos',
    sub_subgroup: '',
    is_out_of_stock: false,
    is_promo: false,
    promo_price: null
  }
];

// Helper para inicializar LocalStorage
const getLocalProducts = () => {
  const local = localStorage.getItem('fmateando_products');
  if (!local) {
    localStorage.setItem('fmateando_products', JSON.stringify(INITIAL_PRODUCTS));
    return INITIAL_PRODUCTS;
  }
  try {
    const parsed = JSON.parse(local);
    if (!Array.isArray(parsed) || parsed.length < INITIAL_PRODUCTS.length) {
      localStorage.setItem('fmateando_products', JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    return parsed;
  } catch (e) {
    localStorage.setItem('fmateando_products', JSON.stringify(INITIAL_PRODUCTS));
    return INITIAL_PRODUCTS;
  }
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
        if (data && data.length > 0) return data[0];
        throw new Error('No data returned from Supabase insert');
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
    // Siempre actualizar LocalStorage para garantizar sincronización persistente local
    const local = getLocalProducts();
    const updatedLocal = local.map(p => String(p.id) === String(id) ? { ...p, ...updates } : p);
    saveLocalProducts(updatedLocal);
    const localResult = updatedLocal.find(p => String(p.id) === String(id)) || { id, ...updates };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('products')
          .update(updates)
          .eq('id', id)
          .select();
        
        if (error) throw error;
        if (data && data.length > 0) {
          return data[0];
        }
        return localResult;
      } catch (err) {
        console.error('Error actualizando en Supabase, usando LocalStorage:', err);
        return localResult;
      }
    } else {
      return localResult;
    }
  },

  // Eliminar un producto
  async deleteProduct(id) {
    const local = getLocalProducts();
    const filtered = local.filter(p => String(p.id) !== String(id));
    saveLocalProducts(filtered);

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
        return true;
      }
    } else {
      return true;
    }
  }
};
