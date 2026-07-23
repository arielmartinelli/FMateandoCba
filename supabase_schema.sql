-- Crear la tabla de productos
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT NOT NULL, -- 'mates', 'bombillas', 'accesorios'
    subcategory TEXT NOT NULL, -- 'imperial', 'torpedo', 'galleta', 'comun', etc.
    sub_subgroup TEXT DEFAULT '', -- 'calabaza', 'algarrobo', 'premium', 'base_bolita', 'virola'
    is_out_of_stock BOOLEAN DEFAULT false,
    is_promo BOOLEAN DEFAULT false,
    promo_price NUMERIC DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Seguridad a Nivel de Fila) en la tabla
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública de los productos
CREATE POLICY "Allow public read access" ON public.products
    FOR SELECT USING (true);

-- Permitir agregar, editar y eliminar productos desde el cliente web usando la clave anónima
CREATE POLICY "Allow public write access" ON public.products
    FOR ALL USING (true) WITH CHECK (true);

-- Crear un bucket de storage para las fotos si se desea usar el storage de Supabase
-- El bucket debe llamarse 'product-images' y ser de acceso público.
