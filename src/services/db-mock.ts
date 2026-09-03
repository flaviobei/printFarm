// db-mock.ts
// Este arquivo serve como um banco de dados em memória temporário
// para facilitar o desenvolvimento da UI sem depender do Supabase.

export interface SKU {
  id: string;
  name: string;
  filamentType: string;
  weightGrams: number;
  printTimeHours: number;
  salePrice: number;
}

export interface Order {
  id: string;
  skuId: string;
  status: 'pending' | 'printing' | 'finishing' | 'ready' | 'shipped';
  customerName: string;
  deadline: string;
}

export const mockSKUs: SKU[] = [
  {
    id: 'sku-1',
    name: 'Dragão Articulado 3D',
    filamentType: 'PLA Silk',
    weightGrams: 150,
    printTimeHours: 8.5,
    salePrice: 89.90,
  },
  {
    id: 'sku-2',
    name: 'Vaso Geométrico',
    filamentType: 'PETG',
    weightGrams: 300,
    printTimeHours: 12,
    salePrice: 120.00,
  }
];

export const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    skuId: 'sku-1',
    status: 'pending',
    customerName: 'João Silva',
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ORD-002',
    skuId: 'sku-2',
    status: 'printing',
    customerName: 'Maria Oliveira',
    deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ORD-003',
    skuId: 'sku-1',
    status: 'ready',
    customerName: 'Carlos Souza',
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

export const mockInventory = [
  { id: 'inv-1', type: 'PLA Silk', color: 'Ouro', remainingGrams: 850 },
  { id: 'inv-2', type: 'PETG', color: 'Preto', remainingGrams: 100 }, // Quase acabando
];
