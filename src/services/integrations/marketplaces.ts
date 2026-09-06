import { Order, Customer } from '../api';

export interface MarketplaceOrder {
  id: string; // marketplace reference ID
  customer: Omit<Customer, 'id' | 'created_at' | 'user_id'>;
  sku_name: string; // fallback if sku id not matched
  total_price: number;
  deadline: string;
}

export interface IMarketplaceAdapter {
  id: string;
  name: string;
  fetchNewOrders(): Promise<MarketplaceOrder[]>;
  generateShippingLabel(orderId: string): Promise<{ trackingCode: string, labelUrl: string }>;
  updateOrderStatus(orderId: string, status: string): Promise<boolean>;
}

export class MockMercadoLivreAdapter implements IMarketplaceAdapter {
  id = 'mercadolivre';
  name = 'Mercado Livre';

  async fetchNewOrders(): Promise<MarketplaceOrder[]> {
    const today = new Date();
    today.setDate(today.getDate() + 2);

    return [
      {
        id: `ML-${Math.floor(Math.random() * 1000000)}`,
        customer: {
          name: 'Comprador Teste ML',
          email: 'teste.ml@email.com',
          phone: '(11) 99999-9999',
          city: 'São Paulo',
          state: 'SP',
          marketplace_source: 'mercadolivre',
        },
        sku_name: 'Produto Teste MercadoLivre',
        total_price: 120.50,
        deadline: today.toISOString(),
      }
    ];
  }

  async generateShippingLabel(orderId: string): Promise<{ trackingCode: string; labelUrl: string; }> {
    return {
      trackingCode: `MLBR${Math.floor(Math.random() * 1000000000)}`,
      labelUrl: `https://mock.mercadolivre.com.br/label/${orderId}.pdf`
    };
  }

  async updateOrderStatus(orderId: string, status: string): Promise<boolean> {
    return true; // Mock update success
  }
}

export class MockShopeeAdapter implements IMarketplaceAdapter {
  id = 'shopee';
  name = 'Shopee';

  async fetchNewOrders(): Promise<MarketplaceOrder[]> {
    const today = new Date();
    today.setDate(today.getDate() + 5);

    return [
      {
        id: `SHP-${Math.floor(Math.random() * 1000000)}`,
        customer: {
          name: 'Comprador Teste Shopee',
          email: 'teste.shopee@email.com',
          phone: '(21) 98888-8888',
          city: 'Rio de Janeiro',
          state: 'RJ',
          marketplace_source: 'shopee',
        },
        sku_name: 'Produto Teste Shopee',
        total_price: 89.90,
        deadline: today.toISOString(),
      }
    ];
  }

  async generateShippingLabel(orderId: string): Promise<{ trackingCode: string; labelUrl: string; }> {
    return {
      trackingCode: `BRSHP${Math.floor(Math.random() * 1000000000)}`,
      labelUrl: `https://mock.shopee.com.br/label/${orderId}.pdf`
    };
  }

  async updateOrderStatus(orderId: string, status: string): Promise<boolean> {
    return true;
  }
}

export function getActiveMarketplaceAdapters(activeIds: string[] = []): IMarketplaceAdapter[] {
  const all = [new MockMercadoLivreAdapter(), new MockShopeeAdapter()];
  if (!activeIds.length) return all;
  return all.filter(a => activeIds.includes(a.id));
}
