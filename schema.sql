-- printFarm SaaS - Supabase Schema
-- Este script cria todas as tabelas principais e aplica as políticas de segurança RLS (Row Level Security).

-- ==========================================
-- 1. EXTENSIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. TABLES
-- ==========================================

-- Tabela: user_settings (Configurações da Farm do Usuário)
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    electricity_price_per_kwh NUMERIC DEFAULT 0.85,
    printer_power_watts NUMERIC DEFAULT 250,
    failure_rate_percentage NUMERIC DEFAULT 5.0,
    marketplace_fee_percentage NUMERIC DEFAULT 12.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: skus (Catálogo de Peças)
CREATE TABLE IF NOT EXISTS public.skus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    filament_type TEXT NOT NULL,
    weight_grams NUMERIC NOT NULL,
    print_time_hours NUMERIC NOT NULL,
    sale_price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: orders (Fila de Produção/Pedidos)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES public.skus(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'pending',
    customer_name TEXT,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: inventory (Estoque de Filamentos)
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    material_type TEXT NOT NULL,
    color TEXT NOT NULL,
    remaining_grams NUMERIC NOT NULL DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ==========================================
-- Ativar RLS em todas as tabelas
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Políticas para user_settings
CREATE POLICY "Users can manage their own settings" ON public.user_settings
    FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Políticas para skus
CREATE POLICY "Users can manage their own skus" ON public.skus
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para orders
CREATE POLICY "Users can manage their own orders" ON public.orders
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- FASE 9: RBAC e Impressoras
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'tenant';

CREATE TABLE IF NOT EXISTS public.printers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  power_watts NUMERIC DEFAULT 250,
  status TEXT DEFAULT 'idle',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own printers" ON public.printers
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para inventory
CREATE POLICY "Users can manage their own inventory" ON public.inventory
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- FASE 10: Expansão de Inventário
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS brand TEXT DEFAULT 'Desconhecida';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS color_hex TEXT DEFAULT '#cccccc';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS initial_weight_grams NUMERIC DEFAULT 1000;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS temp_min NUMERIC DEFAULT 190;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS temp_max NUMERIC DEFAULT 220;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';

-- FASE 11: Workflow Logístico de Produção
ALTER TABLE public.printers ADD COLUMN IF NOT EXISTS spool_capacity INTEGER DEFAULT 1;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS printer_id UUID REFERENCES public.printers(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS inventory_id UUID REFERENCES public.inventory(id);

-- ==========================================
-- 4. TRIGGERS
-- ==========================================
-- Automatizar a criação de user_settings quando um usuário se cadastrar (opcional, mas recomendado)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ativar o gatilho sempre que auth.users receber uma nova linha
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- PHASE 13: LOGS DE CONSUMO E DESPERD�CIO
-- ==========================================

CREATE TABLE IF NOT EXISTS public.material_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
    printer_id UUID REFERENCES public.printers(id) ON DELETE SET NULL,
    weight_used NUMERIC DEFAULT 0,
    weight_wasted NUMERIC DEFAULT 0,
    type TEXT NOT NULL, -- 'success' ou 'failure'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.material_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own material logs" 
ON public.material_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own material logs" 
ON public.material_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS inventory_ids JSONB;
ALTER TABLE public.skus ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.skus ADD COLUMN IF NOT EXISTS multicolor_weights JSONB;
