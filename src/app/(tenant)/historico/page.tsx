'use client';

import { useEffect, useState } from 'react';
import { api, Order, SKU } from '@/services/api';
import { History, Search, Box, Calendar, User, PackageCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HistoricoPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [fetchedOrders, fetchedSkus] = await Promise.all([
        api.getDeliveredOrders(),
        api.getSKUs(),
      ]);
      setOrders(fetchedOrders);
      setSkus(fetchedSkus);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredOrders = orders.filter(order => {
    const sku = skus.find(s => s.id === order.sku_id);
    const searchLower = search.toLowerCase();
    return (
      order.customer_name.toLowerCase().includes(searchLower) ||
      order.id.toLowerCase().includes(searchLower) ||
      (sku?.name || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-6 h-full flex flex-col max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center tracking-tight text-slate-900">
            <History className="w-8 h-8 mr-3 text-primary" />
            Histórico de Entregas
          </h1>
          <p className="text-muted-foreground mt-2">
            Consulte todos os pedidos finalizados e entregues da sua PrintFarm.
          </p>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm flex flex-col min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b flex items-center gap-4 bg-muted/20">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por cliente, pedido ou produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="ml-auto flex gap-2">
            <span className="inline-flex items-center justify-center px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'Pedido' : 'Pedidos'}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b sticky top-0 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-medium">ID Pedido</th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Produto (SKU)</th>
                <th className="px-6 py-4 font-medium">Data de Criação</th>
                <th className="px-6 py-4 font-medium text-right">Status Final</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="h-8 w-8 bg-muted rounded-full mb-4"></div>
                      <p>Carregando histórico...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <PackageCheck className="h-12 w-12 mb-4 opacity-20" />
                      <p className="text-lg font-medium text-slate-900">Nenhum pedido entregue ainda</p>
                      <p className="text-sm">Os pedidos aparecerão aqui quando forem finalizados no Kanban.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const sku = skus.find(s => s.id === order.sku_id);
                  return (
                    <tr key={order.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {order.id.split('-')[0]}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center font-medium text-slate-900">
                          <User className="w-4 h-4 mr-2 text-slate-400" />
                          {order.customer_name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-slate-700">
                          <Box className="w-4 h-4 mr-2 text-slate-400" />
                          {sku?.name || 'Desconhecido'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-slate-600">
                          <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                          {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                          Entregue
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
