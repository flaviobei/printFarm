import { createClient } from '@/lib/supabase/client';

export type UserSettings = {
  id: string;
  role: string; // 'master', 'admin', 'tenant'
  electricity_price_per_kwh: number;
  printer_power_watts: number;
  failure_rate_percentage: number;
  marketplace_fee_percentage: number;
  active_marketplaces?: string[];
  active_logistics?: string[];
};

export type Customer = {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  address_line?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  marketplace_source?: string;
  marketplace_id?: string;
  created_at: string;
};

export type Supplier = {
  id: string;
  user_id: string;
  company_name: string;
  cnpj?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  payment_data?: string;
  notes?: string;
  created_at: string;
};

export type SKU = {
  id: string;
  user_id: string;
  name: string;
  filament_type: string;
  weight_grams: number;
  print_time_hours: number;
  sale_price: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  image_url?: string | null;
  multicolor_weights?: number[] | null;
  created_at: string;
};

export type Order = {
  id: string;
  user_id: string;
  status: 'pending' | 'production' | 'ready' | 'shipped' | 'delivered';
  customer_name?: string;
  customer_id?: string | null;
  deadline: string;
  shipping_service?: string | null;
  shipping_cost?: number;
  tracking_code?: string | null;
  label_url?: string | null;
  marketplace_source?: string | null;
  marketplace_order_id?: string | null;
  created_at: string;
  // Computed client-side (not in DB)
  items?: OrderItem[];
};

export type OrderItem = {
  id: string;
  order_id: string;
  sku_id: string;
  quantity: number;
  unit_price: number;
  from_stock: number;
  created_at: string;
};

export type PrintJob = {
  id: string;
  user_id: string;
  order_item_id?: string | null;
  sku_id: string;
  quantity: number;
  printer_id?: string | null;
  inventory_id?: string | null;
  inventory_ids?: string[];
  status: 'queued' | 'printing' | 'finishing' | 'finished' | 'failed';
  finishing_notes?: string | null;
  created_at: string;
};

export type FinishedGood = {
  id: string;
  user_id: string;
  sku_id: string;
  quantity: number;
  print_job_id?: string | null;
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
  status: string; // 'available', 'in_use', 'discarded'
  cost?: number;
  supplier_id?: string | null;
  invoice_number?: string;
  entry_date?: string;
  discard_reason?: string;
  warranty_triggered?: boolean;
  created_at: string;
};

export type Supply = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  cost: number;
  created_at: string;
};

export type MaterialLog = {
  id?: string;
  user_id?: string;
  order_id?: string | null;
  inventory_id?: string | null;
  supply_id?: string | null;
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

export type Transaction = {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: string;
  related_entity_id?: string | null;
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

  async deleteOrder(id: string, printJobAction: 'discard' | 'keep' = 'keep') {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    
    // Buscar todos os order_items desse pedido
    const { data: items } = await supabase.from('order_items').select('id').eq('order_id', id);
    if (items && items.length > 0) {
      const itemIds = items.map(i => i.id);
      
      if (printJobAction === 'discard') {
        // Deletar todos os print_jobs vinculados antes de deletar o pedido (pois virariam avulsos pelo SET NULL)
        await supabase.from('print_jobs').delete().in('order_item_id', itemIds);
      } else {
        // 'keep': os print_jobs ficam órfãos (avulsos) e continuam na produção.
        // MAS, se algum já estiver 'finished', enviamos para o estoque genérico (já que o pedido sumiu).
        const { data: jobs } = await supabase.from('print_jobs').select('*').in('order_item_id', itemIds);
        if (jobs && jobs.length > 0) {
          const finishedJobs = jobs.filter(j => j.status === 'finished');
          for (const job of finishedJobs) {
            await supabase.from('finished_goods').insert([{
              user_id: userData?.user?.id || job.user_id,
              sku_id: job.sku_id,
              quantity: job.quantity
            }]);
          }
        }
      }
    }

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
  // CRUD - Supplies (Insumos Extras)
  // ==========================================
  async getSupplies(): Promise<Supply[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('supplies').select('*').order('created_at', { ascending: false });
    if (error) {
      if (error.code === '42P01') return []; // table not found
      throw error;
    }
    return data || [];
  },

  async createSupply(supply: Partial<Supply>): Promise<Supply> {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase.from('supplies').insert([{
      ...supply,
      user_id: userData.user.id
    }]).select().single();

    if (error) throw error;
    return data;
  },

  async updateSupply(id: string, updates: Partial<Supply>) {
    const supabase = createClient();
    const { data, error } = await supabase.from('supplies').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteSupply(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from('supplies').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ==========================================
  // CRUD - Inventory (Estoque de Filamentos)
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
    
    // Automatização de Despesa de Estoque
    if (data && data.cost && data.cost > 0) {
      try {
        await this.createTransaction({
          type: 'expense',
          category: 'Filamento / Estoque',
          description: `Rolo ${data.material_type} ${data.color}`,
          amount: data.cost,
          date: data.entry_date || new Date().toISOString().split('T')[0],
          related_entity_id: data.id
        });
      } catch(e) {
        console.error("Failed to auto-generate expense for inventory", e);
      }
    }
    
    return data;
  },

  async createInventoryBatch(dataList: Partial<Inventory>[]): Promise<Inventory[]> {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not logged in');

    const mappedData = dataList.map(item => ({ ...item, user_id: userData.user!.id }));
    const { data, error } = await supabase.from('inventory').insert(mappedData).select();

    if (error) throw error;
    
    // Automatização de Despesa de Estoque para o Lote inteiro
    if (data && data.length > 0) {
      const firstItem = data[0];
      if (firstItem.cost && firstItem.cost > 0) {
        const totalCost = firstItem.cost * data.length;
        try {
          await this.createTransaction({
            type: 'expense',
            category: 'Filamento / Estoque (Lote)',
            description: `Lote de ${data.length}x ${firstItem.material_type} ${firstItem.color}`,
            amount: totalCost,
            date: firstItem.entry_date || new Date().toISOString().split('T')[0],
            related_entity_id: firstItem.id
          });
        } catch(e) {
          console.error("Failed to auto-generate expense for batch", e);
        }
      }
    }

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
  },

  // ==========================================
  // CRUD - Suppliers (Fornecedores)
  // ==========================================
  async getSuppliers(): Promise<Supplier[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
    if (error) {
      // Return mock data if table doesn't exist
      return [
        { id: 'sup_1', user_id: 'x', company_name: 'eSun Brasil', cnpj: '12.345.678/0001-90', contact_name: 'Vendas', contact_email: 'vendas@esun.com.br', contact_phone: '(11) 99999-9999', created_at: new Date().toISOString() },
        { id: 'sup_2', user_id: 'x', company_name: 'Voolt 3D', cnpj: '98.765.432/0001-10', contact_name: 'Suporte', contact_email: 'suporte@voolt3d.com.br', created_at: new Date().toISOString() }
      ];
    }
    return data || [];
  },

  async createSupplier(supplier: Omit<Supplier, 'id' | 'created_at' | 'user_id'>) {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase.from('suppliers').insert([{
      ...supplier,
      user_id: userData.user.id
    }]).select().single();

    if (error) {
      return { id: Math.random().toString(), user_id: userData.user.id, ...supplier, created_at: new Date().toISOString() };
    }
    return data;
  },

  async updateSupplier(id: string, updates: Partial<Omit<Supplier, 'id' | 'created_at' | 'user_id'>>) {
    const supabase = createClient();
    const { data, error } = await supabase.from('suppliers').update(updates).eq('id', id).select().single();
    if (error) {
       return { id, ...updates }; // mock
    }
    return data;
  },

  async deleteSupplier(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) return true; // mock
    return true;
  },

  // ==========================================
  // CRUD - Transactions (Financeiro)
  // ==========================================
  async getTransactions(): Promise<Transaction[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    if (error) {
      // Mock data se a tabela ainda não existir
      return [
        { id: 't_1', user_id: 'x', type: 'expense', category: 'Manutenção', description: 'Troca de bico', amount: 35.00, date: new Date().toISOString().split('T')[0], created_at: new Date().toISOString() }
      ];
    }
    return data || [];
  },

  async createTransaction(transaction: Omit<Transaction, 'id' | 'created_at' | 'user_id'>) {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase.from('transactions').insert([{
      ...transaction,
      user_id: userData.user.id
    }]).select().single();

    if (error) {
      // Retorna objeto falso caso tabela não exista
      return { id: Math.random().toString(), user_id: userData.user.id, ...transaction, created_at: new Date().toISOString() };
    }
    return data;
  },

  async deleteTransaction(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) return true; // mock
    return true;
  },

  // ==========================================
  // CRUD - Customers (Clientes)
  // ==========================================
  async getCustomers(): Promise<Customer[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (error) {
      // Mock data
      return [
        { id: 'cust_1', user_id: 'x', name: 'João Silva', email: 'joao@email.com', created_at: new Date().toISOString() },
        { id: 'cust_2', user_id: 'x', name: 'Maria Souza (ML)', marketplace_source: 'mercadolivre', created_at: new Date().toISOString() }
      ];
    }
    return data || [];
  },

  async createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'user_id'>) {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase.from('customers').insert([{
      ...customer,
      user_id: userData.user.id
    }]).select().single();

    if (error) {
      return { id: Math.random().toString(), user_id: userData.user.id, ...customer, created_at: new Date().toISOString() };
    }
    return data;
  },

  async updateCustomer(id: string, updates: Partial<Customer>) {
    const supabase = createClient();
    const { data, error } = await supabase.from('customers').update(updates).eq('id', id).select().single();
    if (error) {
      return { id, ...updates }; // mock
    }
    return data;
  },

  async deleteCustomer(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) return true; // mock
    return true;
  },

  // ==========================================
  // CRUD - Order Items
  // ==========================================
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('order_items').select('*').eq('order_id', orderId);
    if (error) { console.error(error); return []; }
    return data || [];
  },

  async getAllOrderItems(): Promise<OrderItem[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('order_items').select('*');
    if (error) { console.error(error); return []; }
    return data || [];
  },

  // ==========================================
  // CRUD - Print Jobs
  // ==========================================
  async getPrintJobs(): Promise<PrintJob[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('print_jobs').select('*').order('created_at', { ascending: true });
    if (error) { console.error(error); return []; }
    return data || [];
  },

  async createPrintJob(job: Omit<PrintJob, 'id' | 'created_at' | 'user_id'>): Promise<PrintJob> {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase.from('print_jobs').insert([{
      ...job,
      user_id: userData.user.id
    }]).select().single();

    if (error) throw error;
    return data;
  },

  async updatePrintJob(id: string, updates: Partial<PrintJob>) {
    const supabase = createClient();
    const { data, error } = await supabase.from('print_jobs').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deletePrintJob(id: string) {
    const supabase = createClient();
    // Verifica se a tarefa pertence a um pedido
    const { data: job } = await supabase.from('print_jobs').select('order_item_id').eq('id', id).single();
    if (job && job.order_item_id) {
      throw new Error('Não é possível excluir uma tarefa de impressão que pertence a um pedido do cliente. Em vez disso, relate uma falha para voltar à fila ou exclua o pedido na tela de Vendas.');
    }

    const { error } = await supabase.from('print_jobs').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async splitPrintJob(jobId: string, splitQty: number): Promise<PrintJob> {
    const supabase = createClient();
    // 1. Busca o job original
    const { data: original, error: fetchErr } = await supabase.from('print_jobs').select('*').eq('id', jobId).single();
    if (fetchErr || !original) throw fetchErr || new Error('Job not found');

    if (splitQty >= original.quantity || splitQty <= 0) {
      throw new Error('Quantidade inválida para divisão');
    }

    // 2. Reduz o original
    await supabase.from('print_jobs').update({ quantity: original.quantity - splitQty }).eq('id', jobId);

    // 3. Cria o novo job com a parte separada
    const { data: newJob, error: insertErr } = await supabase.from('print_jobs').insert([{
      user_id: original.user_id,
      order_item_id: original.order_item_id,
      sku_id: original.sku_id,
      quantity: splitQty,
      status: 'queued',
    }]).select().single();

    if (insertErr) throw insertErr;
    return newJob;
  },

  // ==========================================
  // CRUD - Finished Goods (Estoque de Peças)
  // ==========================================
  async getFinishedGoods(): Promise<FinishedGood[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('finished_goods').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  },

  async addFinishedGoods(entry: Omit<FinishedGood, 'id' | 'created_at' | 'user_id'>): Promise<FinishedGood> {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase.from('finished_goods').insert([{
      ...entry,
      user_id: userData.user.id
    }]).select().single();

    if (error) throw error;
    return data;
  },

  async updateFinishedGood(id: string, updates: Partial<FinishedGood>) {
    const supabase = createClient();
    const { data, error } = await supabase.from('finished_goods').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteFinishedGood(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from('finished_goods').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  /** Retorna a quantidade total disponível de um SKU no estoque de peças prontas */
  async getStockForSku(skuId: string): Promise<number> {
    const goods = await this.getFinishedGoods();
    return goods.filter(g => g.sku_id === skuId).reduce((sum, g) => sum + g.quantity, 0);
  },

  /** Consome peças do estoque (FIFO). Retorna a qtd efetivamente consumida. */
  async consumeFinishedGoods(skuId: string, qty: number): Promise<number> {
    const supabase = createClient();
    const { data: goods } = await supabase
      .from('finished_goods')
      .select('*')
      .eq('sku_id', skuId)
      .gt('quantity', 0)
      .order('created_at', { ascending: true });

    if (!goods) return 0;

    let remaining = qty;
    for (const g of goods) {
      if (remaining <= 0) break;
      if (g.quantity <= remaining) {
        remaining -= g.quantity;
        await supabase.from('finished_goods').delete().eq('id', g.id);
      } else {
        await supabase.from('finished_goods').update({ quantity: g.quantity - remaining }).eq('id', g.id);
        remaining = 0;
      }
    }
    return qty - remaining;
  },

  // ==========================================
  // Criação inteligente de Pedido (com itens e verificação de estoque)
  // ==========================================
  async createOrderWithItems(
    orderData: { customer_name: string; deadline: string; customer_id?: string; marketplace_source?: string; marketplace_order_id?: string },
    items: { sku_id: string; quantity: number; unit_price: number }[]
  ): Promise<Order> {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    // 1. Criar o pedido
    const { data: order, error: orderErr } = await supabase.from('orders').insert([{
      ...orderData,
      user_id: userData.user.id,
      status: 'pending'
    }]).select().single();
    if (orderErr) throw orderErr;

    // 2. Para cada item, criar order_item + print_jobs (sem consumir estoque automaticamente)
    for (const item of items) {
      // Criar order_item com from_stock = 0
      const { data: orderItem, error: itemErr } = await supabase.from('order_items').insert([{
        order_id: order.id,
        sku_id: item.sku_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        from_stock: 0
      }]).select().single();
      if (itemErr) throw itemErr;

      // Sempre criar print_job para a quantidade total
      await this.createPrintJob({
        order_item_id: orderItem.id,
        sku_id: item.sku_id,
        quantity: item.quantity,
        status: 'queued'
      });
    }

    // 3. Pedido sempre nasce como 'pending'
    await supabase.from('orders').update({ status: 'pending' }).eq('id', order.id);
    order.status = 'pending';

    return order;
  },

  /** Verifica se todos os print_jobs de um pedido estão finished e atualiza o pedido */
  async checkAndAdvanceOrder(orderId: string): Promise<void> {
    const supabase = createClient();
    // Buscar todos os order_items do pedido
    const { data: items } = await supabase.from('order_items').select('id').eq('order_id', orderId);
    if (!items || items.length === 0) return;

    const itemIds = items.map(i => i.id);

    // Buscar todos os print_jobs desses items
    const { data: jobs } = await supabase.from('print_jobs').select('status').in('order_item_id', itemIds);
    if (!jobs || jobs.length === 0) {
      // Sem jobs (tudo veio do estoque), já deve estar ready
      return;
    }

    const allFinished = jobs.every(j => j.status === 'finished');
    if (allFinished) {
      await supabase.from('orders').update({ status: 'ready' }).eq('id', orderId);
    }
  },

  /** Marca um pedido como 'production' se um dos seus jobs iniciou impressão */
  async markOrderAsInProduction(orderId: string): Promise<void> {
    const supabase = createClient();
    // Só atualiza se ainda estiver 'pending' para não retroceder algo que já tá pronto
    const { data: order } = await supabase.from('orders').select('status').eq('id', orderId).single();
    if (order && order.status === 'pending') {
      await supabase.from('orders').update({ status: 'production' }).eq('id', orderId);
    }
  },

    /** 
   * Tenta consumir estoque de peças prontas para todos os itens de um pedido.
   * Deduz o estoque e move a quantidade consumida para 'finishing' em vez de deletar.
   */
  async consumeStockForOrder(orderId: string): Promise<void> {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);
    if (!items || items.length === 0) return;

    let allFullyFulfilled = true;

    for (const item of items) {
      const needs = item.quantity - (item.from_stock || 0);
      if (needs <= 0) continue;

      const stockAvailable = await this.getStockForSku(item.sku_id);
      const toConsume = Math.min(stockAvailable, needs);

      if (toConsume > 0) {
        // Deduz do estoque
        await this.consumeFinishedGoods(item.sku_id, toConsume);
        // Atualiza order_item
        const newFromStock = (item.from_stock || 0) + toConsume;
        await supabase.from('order_items').update({ from_stock: newFromStock }).eq('id', item.id);

        // Ao invés de deletar, pega as jobs na fila e avança para 'finishing' (Acabamento)
        const { data: jobs } = await supabase.from('print_jobs').select('*').eq('order_item_id', item.id).in('status', ['queued']);
        if (jobs && jobs.length > 0) {
          let remainingToAdvance = toConsume;
          for (const job of jobs) {
            if (remainingToAdvance <= 0) break;
            if (job.quantity <= remainingToAdvance) {
              // Avance toda a job
              await supabase.from('print_jobs').update({ status: 'finishing' }).eq('id', job.id);
              remainingToAdvance -= job.quantity;
            } else {
              // Reduz a queued atual e cria uma nova para o finishing
              await supabase.from('print_jobs').update({ quantity: job.quantity - remainingToAdvance }).eq('id', job.id);
              await supabase.from('print_jobs').insert([{
                user_id: userData.user.id,
                order_item_id: job.order_item_id,
                sku_id: job.sku_id,
                quantity: remainingToAdvance,
                status: 'finishing',
              }]);
              remainingToAdvance = 0;
            }
          }
        }
      }
      
      if (toConsume < needs) {
        allFullyFulfilled = false;
      }
    }

    // Mesmo se allFullyFulfilled, não enviamos para ready. Enviamos para production
    // pois a peça crua tirada do armazém agora está em finishing (Acabamento).
    await supabase.from('orders').update({ status: 'production' }).eq('id', orderId);
  },

  /** 
   * Utilidade extrema (Admin/Dev) para limpar dados da tabela para o usuário logado
   */
  async clearDatabaseTable(tableName: string): Promise<boolean> {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not logged in');

    const { error } = await supabase.from(tableName).delete().eq('user_id', userData.user.id);
    if (error) {
      console.error(`Erro limpando ${tableName}:`, error);
      throw error;
    }
    return true;
  }
};