'use client';

import { useState } from 'react';
import { getDictionary } from '@/lib/i18n';
import { mockOrders, mockSKUs, Order } from '@/services/db-mock';
import { Clock, Printer, Package, CheckCircle, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

type ColumnType = Order['status'];

export default function PedidosPage() {
  const dict = getDictionary().pedidos;
  
  // No futuro isso virá de um fetch/SWR ou hook global.
  const [orders, setOrders] = useState<Order[]>(mockOrders);

  // Mapeamento das colunas
  const columns: { id: ColumnType; title: string; icon: any; colorClass: string }[] = [
    { id: 'pending', title: dict.columns.pending, icon: Clock, colorClass: 'text-amber-500' },
    { id: 'printing', title: dict.columns.printing, icon: Printer, colorClass: 'text-blue-500' },
    { id: 'finishing', title: dict.columns.finishing, icon: Package, colorClass: 'text-purple-500' },
    { id: 'ready', title: dict.columns.ready, icon: CheckCircle, colorClass: 'text-green-500' },
    { id: 'shipped', title: dict.columns.shipped, icon: Truck, colorClass: 'text-slate-500' },
  ];

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{dict.title}</h1>
          <p className="text-muted-foreground mt-1">{dict.description}</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-x-auto">
        <div className="flex h-full min-w-max space-x-4 pb-4">
          {columns.map((column) => {
            const columnOrders = orders.filter((o) => o.status === column.id);
            
            return (
              <div key={column.id} className="flex flex-col w-80 bg-muted/50 rounded-lg p-4 border shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <column.icon className={cn('w-5 h-5', column.colorClass)} />
                    <h2 className="font-semibold">{column.title}</h2>
                  </div>
                  <span className="bg-background text-muted-foreground text-xs font-medium px-2 py-1 rounded-full border">
                    {columnOrders.length}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3">
                  {columnOrders.map((order) => {
                    const sku = mockSKUs.find(s => s.id === order.skuId);
                    // Lógica simples para ver se o prazo tá perto (menos de 24h)
                    const deadline = new Date(order.deadline);
                    const isNearDeadline = deadline.getTime() - Date.now() < 24 * 60 * 60 * 1000;

                    return (
                      <div key={order.id} className="bg-card p-3 rounded-md border shadow-sm flex flex-col cursor-pointer hover:border-primary transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-muted-foreground">{order.id}</span>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                            {sku?.filamentType}
                          </span>
                        </div>
                        <h3 className="font-medium text-sm mb-1">{sku?.name}</h3>
                        <p className="text-xs text-muted-foreground mb-3">Cliente: {order.customerName}</p>
                        
                        <div className="flex items-center justify-between mt-auto">
                          <div className={cn("flex items-center text-xs font-medium", isNearDeadline ? "text-destructive" : "text-muted-foreground")}>
                            <Clock className="w-3 h-3 mr-1" />
                            {deadline.toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {columnOrders.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-8 border-2 border-dashed rounded-md">
                      Vazio
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
