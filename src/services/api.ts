import { createClient } from '@/lib/supabase/client';

export type UserSettings = {
  id: string;
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
  created_at: string;
};

export type Order = {
  id: string;
  user_id: string;
  sku_id: string;
  status: 'pending' | 'printing' | 'finishing' | 'ready' | 'shipped';
  customer_name: string;
  deadline: string;
  created_at: string;
};

export type Inventory = {
  id: string;
  user_id: string;
  material_type: string;
  color: string;
  remaining_grams: number;
  created_at: string;
};

export const api = {
  async getUserSettings(): Promise<UserSettings | null> {
    const supabase = createClient();
    const { data, error } = await supabase.from('user_settings').select('*').maybeSingle();
    if (error) {
      console.error('Error fetching user settings:', error);
      return null;
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
    const { data, error } = await supabase.from('orders').select('*').order('deadline', { ascending: true });
    if (error) {
      console.error('Error fetching orders:', error.message, error.details, error.hint);
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
  async createInventory(inventory: Omit<Inventory, 'id' | 'created_at' | 'user_id'>) {
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

  async deleteInventory(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async updateInventory(id: string, updates: Partial<Omit<Inventory, 'id' | 'created_at' | 'user_id'>>) {
    const supabase = createClient();
    const { data, error } = await supabase.from('inventory').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
};
