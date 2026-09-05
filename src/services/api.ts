import { createClient } from '@/lib/supabase/client';

export type UserSettings = {
  id: string;
  role: string; // 'master', 'admin', 'tenant'
  electricity_price_per_kwh: number;
  printer_power_watts: number;
  failure_rate_percentage: number;
  marketplace_fee_percentage: number;
};

export type SKU = {
  id: string;
  user_id: string;
  name: string;
  filament_type: string;
  weight_grams: number;
  print_time_hours: number;
  sale_price: number;
  image_url?: string | null;
  multicolor_weights?: number[] | null;
  created_at: string;
};

export type Order = {
  id: string;
  user_id: string;
  sku_id: string;
  status: 'pending' | 'printing' | 'finishing' | 'ready' | 'shipped' | 'delivered';
  customer_name: string;
  deadline: string;
  printer_id?: string | null;
  inventory_id?: string | null;
  inventory_ids?: string[];
  created_at: string;
};

export type Inventory = {
  id: string;
  user_id: string;
  material_type: string;
  brand: string;
  color: string; // nome da cor
  color_hex: string;
  initial_weight_grams: number;
  remaining_grams: number;
  temp_min: number;
  temp_max: number;
  status: string; // 'available', 'in_use'
  created_at: string;
};

export type MaterialLog = {
  id?: string;
  user_id?: string;
  order_id?: string | null;
  inventory_id?: string | null;
  printer_id?: string | null;
  weight_used: number;
  weight_wasted: number;
  type: 'success' | 'failure';
  created_at?: string;
};

export type Printer = {
  id: string;
  user_id: string;
  name: string;
  brand: string;
  model: string;
  power_watts: number;
  spool_capacity: number; // Quantidade de cores suportadas (ex: AMS = 4)
  status: string; // 'idle', 'printing', 'maintenance'
  created_at: string;
};

// --- Estrutura Dinâmica dos Planos do SaaS ---
export type SaaSPlan = {
  id: string;
  key: string; // Para tradução (ex: 'free', 'basic', 'pro', 'enterprise')
  price_brl: number;
  price_usd: number;
  is_contact: boolean;
  has_trial: boolean;
  features: string[]; // Chaves de tradução das features
  limits: {
    printers: number | 'unlimited';
    skus: number | 'unlimited';
  };
};

export const api = {
  // Simulação de busca dos planos num "Banco de Dados Admin"
  async getAvailablePlans(): Promise<SaaSPlan[]> {
    return [
      {
        id: 'plan_free',
        key: 'free',
        price_brl: 0,
        price_usd: 0,
        is_contact: false,
        has_trial: false,
        features: ['feat_1_printer', 'feat_2_skus', 'feat_community_support'],
        limits: { printers: 1, skus: 2 }
      },
      {
        id: 'plan_basic',
        key: 'basic',
        price_brl: 49.90,
        price_usd: 9.90,
        is_contact: false,
        has_trial: true,
        features: ['feat_5_printers', 'feat_unlimited_skus', 'feat_email_support'],
        limits: { printers: 5, skus: 'unlimited' }
      },
      {
        id: 'plan_pro',
        key: 'pro',
        price_brl: 129.90,
        price_usd: 29.90,
        is_contact: false,
        has_trial: true,
        features: ['feat_unlimited_printers', 'feat_unlimited_skus', 'feat_priority_support', 'feat_api_access'],
        limits: { printers: 'unlimited', skus: 'unlimited' }
      },
      {
        id: 'plan_enterprise',
        key: 'enterprise',
        price_brl: 0,
        price_usd: 0,
        is_contact: true,
        has_trial: false,
        features: ['feat_custom_integration', 'feat_dedicated_manager', 'feat_sla'],
        limits: { printers: 'unlimited', skus: 'unlimited' }
      }
    ];
  },

  // --- Mocks do SUPER ADMIN ---
  async getAdminUsers() {
    // Simula uma chamada ao Supabase passando por cima do RLS (Service Role)
    return [
      { id: 'usr_1', email: 'joao.silva@oficina3d.com', name: 'João Silva', plan: 'free', isCourtesy: false, trialEndsAt: null, revenue: 0, subscribedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'usr_2', email: 'contato@printmaster.com', name: 'Print Master', plan: 'basic', isCourtesy: false, trialEndsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), revenue: 49.90, subscribedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'usr_3', email: 'empresa@industria3d.com', name: 'Indústria 3D', plan: 'pro', isCourtesy: false, trialEndsAt: null, revenue: 129.90, subscribedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'usr_4', email: 'parceiro@youtuber.com', name: 'Youtuber Tech', plan: 'pro', isCourtesy: true, trialEndsAt: null, revenue: 0, subscribedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'usr_5', email: 'mario@bros.com', name: 'Mario Bros', plan: 'basic', isCourtesy: false, trialEndsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), revenue: 0, subscribedAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString() },
    ];
  },

  async updateUserPlan(userId: string, data: { plan: string, isCourtesy: boolean, trialEndsAt: string | null }) {
    // Simula atualização no DB (ex: supabase.from('user_settings').update(...).eq('id', userId))
    return new Promise(resolve => setTimeout(resolve, 800));
  },

  // --- Impressoras ---
  async getPrinters(): Promise<Printer[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('printers').select('*').order('created_at', { ascending: false });
    if (error) {
      // Mock se a tabela não existir
      return [
        { id: '1', user_id: 'x', name: 'Ender 3 V2', brand: 'Creality', model: 'Ender 3', power_watts: 350, status: 'idle', created_at: new Date().toISOString(), spool_capacity: 1 },
        { id: '2', user_id: 'x', name: 'Bambu P1P', brand: 'Bambu Lab', model: 'P1P', power_watts: 1000, status: 'printing', created_at: new Date().toISOString(), spool_capacity: 3 },
      ];
    }
    return data || [];
  },

  async addPrinter(printer: Partial<Printer>) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not logged in');

    const { data, error } = await supabase
      .from('printers')
      .insert([{ ...printer, user_id: user.id }])
      .select()
      .single();

    if (error) {
      console.warn("Tabela printers possivelmente não existe ainda no DB, mockando sucesso.", error);
      return { id: Math.random().toString(), ...printer };
    }
    return data;
  },

  async updatePrinter(id: string, updates: Partial<Printer>) {
    const supabase = createClient();
    const { data, error } = await supabase.from('printers').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deletePrinter(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from('printers').delete().eq('id', id);
    if (error) throw error;
  },

  async getUserSettings(): Promise<UserSettings | null> {
    const supabase = createClient();
    const { data, error } = await supabase.from('user_settings').select('*').maybeSingle();
    if (error) {
      console.error('Error fetching user settings:', error);
      return null;
    }
    return data;
  },

  async updateUserSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from('user_settings')
      .update(settings)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user settings:', error.message, error.details, error.hint);
      throw error;
    }
    return data;
  },

  async getSKUs(): Promise<SKU[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('skus').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching SKUs:', error.message, error.details, error.hint);
      return [];
    }
    return data || [];
  },

  async getOrders(): Promise<Order[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('orders').select('*').neq('status', 'delivered').order('deadline', { ascending: true });
    if (error) {
      console.error('Error fetching orders:', error.message, error.details, error.hint);
      return [];
    }
    return data || [];
  },

  async getDeliveredOrders(): Promise<Order[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('orders').select('*').eq('status', 'delivered').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching delivered orders:', error.message, error.details, error.hint);
      return [];
    }
    return data || [];
  },

  async getInventory(): Promise<Inventory[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('inventory').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching inventory:', error.message, error.details, error.hint);
      return [];
    }
    return data || [];
  },

  // Função temporária para injetar os mocks no BD
  async seedDatabase(userId: string) {
    const supabase = createClient();

    // 1. Inserir SKUs
    const sku1Id = crypto.randomUUID();
    const sku2Id = crypto.randomUUID();

    await supabase.from('skus').insert([
      {
        id: sku1Id,
        user_id: userId,
        name: 'Dragão Articulado 3D',
        filament_type: 'PLA Silk',
        weight_grams: 150,
        print_time_hours: 8.5,
        sale_price: 89.90,
      },
      {
        id: sku2Id,
        user_id: userId,
        name: 'Vaso Geométrico',
        filament_type: 'PETG',
        weight_grams: 300,
        print_time_hours: 12,
        sale_price: 120.00,
      }
    ]);

    // 2. Inserir Orders (usando os IDs reais dos SKUs criados)
    await supabase.from('orders').insert([
      {
        user_id: userId,
        sku_id: sku1Id,
        status: 'pending',
        customer_name: 'João Silva',
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        user_id: userId,
        sku_id: sku2Id,
        status: 'printing',
        customer_name: 'Maria Oliveira',
        deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        user_id: userId,
        sku_id: sku1Id,
        status: 'ready',
        customer_name: 'Carlos Souza',
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      }
    ]);

    // 3. Inserir Inventário
    await supabase.from('inventory').insert([
      {
        user_id: userId,
        material_type: 'PLA Silk',
        color: 'Ouro',
        remaining_grams: 850
      },
      {
        user_id: userId,
        material_type: 'PETG',
        color: 'Preto',
        remaining_grams: 100
      }
    ]);
  },

  // ==========================================
  // CRUD - SKUs (Catálogo)
  // ==========================================
  async uploadSkuImage(file: File): Promise<string> {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${userData.user.id}/${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('sku-images')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('sku-images')
      .getPublicUrl(fileName);

    return publicUrl;
  },

  async createSKU(sku: Omit<SKU, 'id' | 'created_at' | 'user_id'>) {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase.from('skus').insert([{
      ...sku,
      user_id: userData.user.id
    }]).select().single();

    if (error) throw error;
    return data;
  },

  async deleteSKU(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from('skus').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async updateSKU(id: string, updates: Partial<Omit<SKU, 'id' | 'created_at' | 'user_id'>>) {
    const supabase = createClient();
    const { data, error } = await supabase.from('skus').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  // ==========================================
  // CRUD - Orders (Fila de Produção)
  // ==========================================
  async createOrder(order: Omit<Order, 'id' | 'created_at' | 'user_id'>) {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase.from('orders').insert([{
      ...order,
      user_id: userData.user.id
    }]).select().single();

    if (error) throw error;
    return data;
  },

  async deleteOrder(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async updateOrder(id: string, updates: Partial<Omit<Order, 'id' | 'created_at' | 'user_id'>>) {
    const supabase = createClient();
    const { data, error } = await supabase.from('orders').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  // ==========================================
  // CRUD - Inventory (Estoque)
  // ==========================================
  async createInventory(inventory: Partial<Inventory>): Promise<Inventory> {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase.from('inventory').insert([{
      ...inventory,
      user_id: userData.user.id
    }]).select().single();

    if (error) throw error;
    return data;
  },

  async createInventoryBatch(dataList: Partial<Inventory>[]): Promise<Inventory[]> {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not logged in');

    const mappedData = dataList.map(item => ({ ...item, user_id: userData.user!.id }));
    const { data, error } = await supabase.from('inventory').insert(mappedData).select();

    if (error) throw error;
    return data || [];
  },

  async deleteInventory(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async updateInventory(id: string, updates: Partial<Inventory>) {
    const supabase = createClient();
    const { data, error } = await supabase.from('inventory').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  // ==========================================
  // Material Logs
  // ==========================================
  async logMaterialUsage(log: Partial<MaterialLog>) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not logged in');

    const { error } = await supabase.from('material_logs').insert([{ ...log, user_id: user.id }]);
    if (error) throw error;
  }
};