'use client';

import { useEffect, useState } from 'react';
import { useDictionary } from '@/lib/i18n';
import { api, Order, OrderItem, PrintJob, SKU, FinishedGood } from '@/services/api';
import { Clock, Factory, Package, CheckCircle, Truck, Plus, Trash2, Edit2, Lock, ImageIcon, ListTodo, Store, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
import { PageLayout } from '@/components/ui/PageLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { getActiveMarketplaceAdapters } from '@/services/integrations/marketplaces';
import { getActiveLogisticsAdapters, ShippingQuote } from '@/services/integrations/logistics';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';

type OrderStatus = Order['status'];

const orderColumns: { id: OrderStatus; titleKey: string; icon: any; colorClass: string }[] = [
  { id: 'pending', titleKey: 'pending', icon: Clock, colorClass: 'text-amber-500' },
  { id: 'production', titleKey: 'production', icon: Factory, colorClass: 'text-blue-500' },
  { id: 'ready', titleKey: 'ready', icon: CheckCircle, colorClass: 'text-green-500' },
  { id: 'shipped', titleKey: 'shipped', icon: Truck, colorClass: 'text-slate-500' },
];

function DroppableColumn({
  column, title, orders, orderItemsMap, jobsMap, skus, onEdit, onDelete, onDeliver
}: {
  column: typeof orderColumns[0],
  title: string,
  orders: Order[],
  orderItemsMap: Record<string, OrderItem[]>,
  jobsMap: Record<string, PrintJob[]>,
  skus: SKU[],
  onEdit: (o: Order, e: React.MouseEvent) => void,
  onDelete: (id: string, e: React.MouseEvent) => void,
  onDeliver: (id: string, e: React.MouseEvent) => void,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-[300px] max-h-full rounded-lg p-3 border shadow-sm transition-colors",
        isOver ? "bg-muted border-primary" : "bg-muted/50"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <column.icon className={cn('w-5 h-5', column.colorClass)} />
          <h2 className="font-semibold">{title}</h2>
        </div>
        <span className="bg-background text-muted-foreground text-xs font-medium px-2 py-1 rounded-full border">
          {orders.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 min-h-[150px]">
        {orders.map((order) => (
          <DraggableOrderCard
            key={order.id}
            order={order}
            items={orderItemsMap[order.id] || []}
            jobs={jobsMap[order.id] || []}
            skus={skus}
            onEdit={onEdit}
            onDelete={onDelete}
            onDeliver={onDeliver}
          />
        ))}
        {orders.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8 border-2 border-dashed rounded-md opacity-50">
            Vazio
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableOrderCard({
  order, items, jobs, skus, onEdit, onDelete, onDeliver, isOverlay
}: {
  order: Order,
  items: OrderItem[],
  jobs: PrintJob[],
  skus: SKU[],
  onEdit?: (o: Order, e: React.MouseEvent) => void,
  onDelete?: (id: string, e: React.MouseEvent) => void,
  onDeliver?: (id: string, e: React.MouseEvent) => void,
  isOverlay?: boolean,
}) {
  const isBlocked = order.status === 'production';
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
    data: { order },
    disabled: isBlocked,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const deadline = new Date(order.deadline);
  const isNearDeadline = deadline.getTime() - Date.now() < 24 * 60 * 60 * 1000;

  // Progress: finished jobs / total jobs
  const totalJobQty = jobs.reduce((s, j) => s + j.quantity, 0);
  const finishedJobQty = jobs.filter(j => j.status === 'finished').reduce((s, j) => s + j.quantity, 0);
  const totalFromStock = items.reduce((s, i) => s + i.from_stock, 0);
  const totalPieces = items.reduce((s, i) => s + i.quantity, 0);
  const readyPieces = finishedJobQty + totalFromStock;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group bg-card p-3 rounded-md border shadow-sm flex flex-col transition-colors relative",
        isBlocked ? "cursor-not-allowed opacity-80 border-blue-300 bg-blue-50/30" : "cursor-grab active:cursor-grabbing hover:border-primary",
        isDragging && "opacity-40",
        isOverlay && "opacity-100 scale-105 shadow-xl cursor-grabbing rotate-2"
      )}
    >
      {!isOverlay && onEdit && onDelete && !isBlocked && (
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-all bg-card/90 rounded-full p-1 border shadow-sm z-10">
          <button onPointerDown={e => e.stopPropagation()} onClick={e => onDelete(order.id, e)} className="text-muted-foreground hover:text-destructive transition-colors p-1 cursor-pointer" title="Remover">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isBlocked && (
        <div className="absolute right-2 top-2 flex items-center bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
          <Lock className="w-3 h-3 mr-1" />
          Em Produção
        </div>
      )}

      <div className="flex justify-between items-start mb-2 pr-16">
        <span className="text-xs font-bold text-muted-foreground">{order.id.split('-')[0]}</span>
        {order.marketplace_source && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 capitalize">
            {order.marketplace_source}
          </span>
        )}
      </div>

      <div className="mb-2">
        <p className="text-sm font-semibold">{order.customer_name || 'Cliente não informado'}</p>
        <div className={cn("flex items-center text-xs font-medium mt-1", isNearDeadline ? "text-destructive" : "text-muted-foreground")}>
          <Clock className="w-3 h-3 mr-1" />
          {deadline.toLocaleDateString('pt-BR')}
        </div>
      </div>

      {/* Item list */}
      <div className="space-y-1 mb-2">
        {items.map(item => {
          const sku = skus.find(s => s.id === item.sku_id);
          return (
            <div key={item.id} className="flex items-center justify-between text-xs bg-muted/30 px-2 py-1 rounded">
              <div className="flex items-center gap-1.5 truncate">
                {sku?.image_url ? (
                  <img src={sku.image_url} alt="" className="w-5 h-5 rounded object-cover border flex-shrink-0" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className="truncate font-medium">{sku?.name || 'Removido'}</span>
              </div>
              <span className="font-bold ml-2 flex-shrink-0">{item.quantity}x</span>
            </div>
          );
        })}
      </div>

      {/* Progress bar (only in production) */}
      {order.status === 'production' && totalPieces > 0 && (
        <div className="mt-auto">
          <div className="flex justify-between text-[10px] font-bold text-muted-foreground mb-1">
            <span>Progresso</span>
            <span>{readyPieces}/{totalPieces}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, (readyPieces / totalPieces) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Label button */}
      {order.label_url && (
        <a
          href={order.label_url}
          target="_blank"
          rel="noreferrer"
          onPointerDown={e => e.stopPropagation()}
          className="w-full mt-2 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-bold rounded border border-blue-200 flex items-center justify-center transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 mr-1" />
          Imprimir Etiqueta
        </a>
      )}

      {/* Deliver button */}
      {order.status === 'shipped' && onDeliver && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => onDeliver(order.id, e)}
          className="w-full mt-2 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-bold rounded border border-green-200 flex items-center justify-center transition-colors cursor-pointer"
        >
          <CheckCircle className="w-3.5 h-3.5 mr-1" />
          Confirmar Entrega
        </button>
      )}
    </div>
  );
}

type CartItem = { sku_id: string; quantity: number; unit_price: number; stockAvailable: number };

export default function PedidosPage() {
  const { dict: fullDict } = useDictionary();
  const dict = (fullDict as any).pedidos;

  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrderItems, setAllOrderItems] = useState<OrderItem[]>([]);
  const [allJobs, setAllJobs] = useState<PrintJob[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Shipping modal
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [shippingOrder, setShippingOrder] = useState<Order | null>(null);
  const [shippingQuotes, setShippingQuotes] = useState<ShippingQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<ShippingQuote | null>(null);

  // Stock Suggestion modal
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockOrder, setStockOrder] = useState<Order | null>(null);

  // Delete modal
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  // Dnd
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setIsLoading(true);
    const [fetchedOrders, fetchedItems, fetchedJobs, fetchedSkus, fetchedGoods, fetchedSettings] = await Promise.all([
      api.getOrders(),
      api.getAllOrderItems(),
      api.getPrintJobs(),
      api.getSKUs(),
      api.getFinishedGoods(),
      api.getUserSettings()
    ]);
    setOrders(fetchedOrders);
    setAllOrderItems(fetchedItems);
    setAllJobs(fetchedJobs);
    setSkus(fetchedSkus);
    setFinishedGoods(fetchedGoods);
    setSettings(fetchedSettings);
    setIsLoading(false);
  }

  // Build maps for card display
  const orderItemsMap: Record<string, OrderItem[]> = {};
  for (const item of allOrderItems) {
    if (!orderItemsMap[item.order_id]) orderItemsMap[item.order_id] = [];
    orderItemsMap[item.order_id].push(item);
  }

  const jobsMap: Record<string, PrintJob[]> = {};
  for (const item of allOrderItems) {
    const relatedJobs = allJobs.filter(j => j.order_item_id === item.id);
    if (!jobsMap[item.order_id]) jobsMap[item.order_id] = [];
    jobsMap[item.order_id].push(...relatedJobs);
  }

  // Stock map
  const stockMap: Record<string, number> = {};
  for (const g of finishedGoods) {
    stockMap[g.sku_id] = (stockMap[g.sku_id] || 0) + g.quantity;
  }

  // Cart helpers
  const addCartItem = () => {
    setCart(prev => [...prev, { sku_id: '', quantity: 1, unit_price: 0, stockAvailable: 0 }]);
  };

  const updateCartItem = (index: number, field: keyof CartItem, value: any) => {
    setCart(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      if (field === 'sku_id') {
        const sku = skus.find(s => s.id === value);
        updated.unit_price = sku?.sale_price || 0;
        updated.stockAvailable = stockMap[value] || 0;
      }
      return updated;
    }));
  };

  const removeCartItem = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // Create order
  const handleCreateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (cart.length === 0) { toast.error('Adicione pelo menos 1 item.'); return; }
    if (cart.some(c => !c.sku_id)) { toast.error('Selecione um produto para cada item.'); return; }

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    try {
      await api.createOrderWithItems(
        {
          customer_name: formData.get('customer_name') as string,
          deadline: new Date(formData.get('deadline') as string).toISOString(),
        },
        cart.map(c => ({ sku_id: c.sku_id, quantity: c.quantity, unit_price: c.unit_price }))
      );
      toast.success('Pedido criado!');
      await loadData();
      setIsNewOrderModalOpen(false);
      setCart([]);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao criar pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDeleteOrder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const order = orders.find(o => o.id === id);
    if (order) setOrderToDelete(order);
  };

  const confirmDeleteOrder = async (printJobAction: 'discard' | 'keep') => {
    if (!orderToDelete) return;
    setIsSubmitting(true);
    try {
      await api.deleteOrder(orderToDelete.id, printJobAction);
      toast.success('Pedido removido com sucesso!');
      await loadData();
      setOrderToDelete(null);
    } catch (error) {
      toast.error('Erro ao deletar o pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeliverOrder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.updateOrder(id, { status: 'delivered' });
      toast.success('Pedido marcado como entregue!');
      await loadData();
    } catch (error) {
      toast.error('Erro ao finalizar.');
    }
  };

  // Shipping logic
  useEffect(() => {
    if (isShippingModalOpen && shippingOrder) {
      if (shippingOrder.marketplace_source) {
        // Não precisa cotar frete se for marketplace
        setShippingQuotes([]);
      } else {
        loadShippingQuotes(shippingOrder);
      }
    }
  }, [isShippingModalOpen, shippingOrder]);

  const loadShippingQuotes = async (order: Order) => {
    const items = orderItemsMap[order.id] || [];
    // Use the heaviest/largest SKU for shipping calc
    let maxWeight = 0, maxL = 10, maxW = 10, maxH = 10;
    for (const item of items) {
      const sku = skus.find(s => s.id === item.sku_id);
      if (sku) {
        maxWeight = Math.max(maxWeight, (sku.weight_grams || 0) * item.quantity);
        maxL = Math.max(maxL, sku.length_cm || 10);
        maxW = Math.max(maxW, sku.width_cm || 10);
        maxH = Math.max(maxH, sku.height_cm || 10);
      }
    }

    const adapters = getActiveLogisticsAdapters(settings?.active_logistics || []);
    let allQuotes: ShippingQuote[] = [];
    for (const adapter of adapters) {
      const quotes = await adapter.calculateShipping(maxWeight, maxL, maxW, maxH);
      allQuotes = [...allQuotes, ...quotes];
    }
    setShippingQuotes(allQuotes);
    if (allQuotes.length > 0) setSelectedQuote(allQuotes[0]);
  };

  const confirmShipping = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!shippingOrder) return;
    
    const isMarketplace = !!shippingOrder.marketplace_source;
    if (!isMarketplace && !selectedQuote) return;
    
    setIsSubmitting(true);
    try {
      let trackingCode = null, labelUrl = null, shippingCost = 0, shippingService = '';
      
      if (isMarketplace) {
        const mAdapters = getActiveMarketplaceAdapters(settings?.active_marketplaces || []);
        const mAdapter = mAdapters.find(a => a.id === shippingOrder.marketplace_source);
        if (mAdapter) {
          const res = await mAdapter.generateShippingLabel(shippingOrder.marketplace_order_id || shippingOrder.id);
          trackingCode = res.trackingCode;
          labelUrl = res.labelUrl;
          shippingService = mAdapter.name;
        }
      } else {
        const adapters = getActiveLogisticsAdapters(settings?.active_logistics || []);
        const adapter = adapters[0];
        if (adapter) {
          const res = await adapter.generateLabel(shippingOrder.id);
          trackingCode = res.trackingCode;
          labelUrl = res.labelUrl;
        }
        shippingCost = selectedQuote?.price || 0;
        shippingService = selectedQuote?.serviceId || '';
      }

      await api.updateOrder(shippingOrder.id, {
        status: 'shipped',
        shipping_service: shippingService,
        shipping_cost: shippingCost,
        tracking_code: trackingCode,
        label_url: labelUrl
      });
      toast.success('Envio gerado!');
      await loadData();
      setIsShippingModalOpen(false);
    } catch (error) {
      toast.error('Erro ao gerar envio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmStockUse = async (useStock: boolean) => {
    if (!stockOrder) return;
    setIsSubmitting(true);
    try {
      if (useStock) {
        await api.consumeStockForOrder(stockOrder.id);
        toast.success('Estoque consumido com sucesso!');
      } else {
        await api.updateOrder(stockOrder.id, { status: 'production' });
        toast.success('Enviado para produção ignorando o estoque.');
      }
      await loadData();
      setIsStockModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao processar estoque.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Marketplace sync
  const handleSyncMarketplaces = async () => {
    setIsSubmitting(true);
    try {
      const activeIds = settings?.active_marketplaces || [];
      const adapters = getActiveMarketplaceAdapters(activeIds);
      let newCount = 0;
      for (const adapter of adapters) {
        const newOrders = await adapter.fetchNewOrders();
        for (const mo of newOrders) {
          const randomSku = skus[Math.floor(Math.random() * skus.length)];
          if (!randomSku) continue;
          await api.createOrderWithItems(
            { customer_name: mo.customer.name, deadline: mo.deadline, marketplace_source: mo.customer.marketplace_source, marketplace_order_id: mo.id },
            [{ sku_id: randomSku.id, quantity: 1, unit_price: randomSku.sale_price }]
          );
          newCount++;
        }
      }
      toast.success(`${newCount} pedidos sincronizados!`);
      await loadData();
    } catch (error: any) {
      console.error(error);
      toast.error(`Erro ao sincronizar: ${error?.message || 'Verifique o console'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // DnD
  const handleDragStart = (event: DragStartEvent) => {
    const order = orders.find(o => o.id === event.active.id);
    if (order) setActiveOrder(order);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrder(null);
    if (!over) return;

    const orderId = active.id as string;
    const newStatus = over.id as OrderStatus;
    const order = orders.find(o => o.id === orderId);

    if (order && order.status !== newStatus) {
      // Block production orders
      if (order.status === 'production') {
        toast.error('Pedido bloqueado: aguardando conclusão das impressões.');
        return;
      }

      // Validate transitions
      const validTransitions: Record<string, string[]> = {
        pending: ['production'],
        production: ['ready'], // auto only
        ready: ['shipped'],
        shipped: ['delivered'],
      };

      if (!validTransitions[order.status]?.includes(newStatus)) {
        toast.error('Movimento inválido.');
        return;
      }

      // pending -> production: check stock manually
      if (order.status === 'pending' && newStatus === 'production') {
        const orderItems = orderItemsMap[orderId] || [];
        // Check if ANY item has available stock
        let hasAvailableStock = false;
        for (const item of orderItems) {
           const stock = finishedGoods.find(fg => fg.sku_id === item.sku_id)?.quantity || 0;
           if (stock > 0) {
             hasAvailableStock = true;
             break;
           }
        }
        
        if (hasAvailableStock) {
           // Open stock suggestion modal
           setStockOrder(order);
           setTimeout(() => setIsStockModalOpen(true), 10);
           return;
        }

        // No stock available, proceed to production normally
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'production' } : o));
        try {
          await api.updateOrder(orderId, { status: 'production' });
        } catch {
          toast.error('Erro ao mover pedido.');
          await loadData();
        }
        return;
      }

      // ready -> shipped: shipping modal
      if (order.status === 'ready' && newStatus === 'shipped') {
        setShippingOrder(order);
        setTimeout(() => setIsShippingModalOpen(true), 10);
        return;
      }

      // Simple move
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      try {
        await api.updateOrder(orderId, { status: newStatus });
      } catch {
        toast.error('Erro ao mover pedido.');
        await loadData();
      }
    }
  };

  if (isLoading) {
    return <PageLayout><div className="flex h-full items-center justify-center"><div className="text-muted-foreground">{dict?.loading || 'Carregando...'}</div></div></PageLayout>;
  }

  return (
    <PageLayout>
      <PageHeader
        title={dict?.title || 'Pedidos de Venda'}
        subtitle={dict?.description || 'Gerencie os pedidos dos clientes.'}
        icon={<ListTodo className="w-8 h-8 mr-3 text-primary" />}
        action={
          <div className="flex space-x-2">
            <button
              onClick={handleSyncMarketplaces}
              disabled={isSubmitting}
              className="flex items-center bg-violet-600 text-white px-3 py-2 rounded-md font-medium hover:bg-violet-700 transition-colors text-sm"
            >
              <Store className="w-4 h-4 mr-2" />
              Sincronizar Vendas
            </button>
            <button
              onClick={() => { setCart([{ sku_id: '', quantity: 1, unit_price: 0, stockAvailable: 0 }]); setIsNewOrderModalOpen(true); }}
              className="flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Pedido
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-x-auto pb-4">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex h-full min-w-max space-x-4">
            {orderColumns.map((column) => (
              <DroppableColumn
                key={column.id}
                column={column}
                title={(dict?.columns as any)?.[column.titleKey] || column.titleKey}
                orders={orders.filter(o => o.status === column.id)}
                orderItemsMap={orderItemsMap}
                jobsMap={jobsMap}
                skus={skus}
                onEdit={() => {}}
                onDelete={requestDeleteOrder}
                onDeliver={handleDeliverOrder}
              />
            ))}
          </div>

          <DragOverlay>
            {activeOrder ? (
              <DraggableOrderCard
                order={activeOrder}
                items={orderItemsMap[activeOrder.id] || []}
                jobs={jobsMap[activeOrder.id] || []}
                skus={skus}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modal: Novo Pedido (Carrinho) */}
      <Modal isOpen={isNewOrderModalOpen} onClose={() => setIsNewOrderModalOpen(false)} title={dict?.newOrder?.title || 'Novo Pedido'}>
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">Cliente</label>
              <input name="customer_name" required type="text" placeholder="Nome do cliente" className="w-full p-2 border rounded-md text-sm bg-background" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">Prazo de Entrega</label>
              <input name="deadline" required type="date" className="w-full p-2 border rounded-md text-sm bg-background" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold">Itens do Pedido</label>
              <button type="button" onClick={addCartItem} className="text-xs text-primary font-bold hover:underline flex items-center">
                <Plus className="w-3 h-3 mr-1" />
                {dict?.newOrder?.addItem || 'Adicionar Item'}
              </button>
            </div>

            <div className="space-y-3">
              {cart.map((item, idx) => {
                const willUse = Math.min(item.stockAvailable, item.quantity);
                const willPrint = item.quantity - willUse;

                return (
                  <div key={idx} className="p-3 bg-muted/30 rounded-md border space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={item.sku_id}
                        onChange={e => updateCartItem(idx, 'sku_id', e.target.value)}
                        className="flex-1 p-2 border rounded-md text-sm bg-background"
                      >
                        <option value="">{dict?.newOrder?.selectSku || 'Selecione um produto...'}</option>
                        {skus.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.filament_type}) {stockMap[s.id] ? `— ${stockMap[s.id]} em estoque` : ''}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => removeCartItem(idx)} className="p-1.5 text-muted-foreground hover:text-destructive">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">{dict?.newOrder?.quantity || 'Qtd'}</label>
                        <input type="number" min={1} value={item.quantity} onChange={e => updateCartItem(idx, 'quantity', Number(e.target.value))} className="w-full p-2 border rounded-md text-sm bg-background" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">{dict?.newOrder?.unitPrice || 'Preço Unit.'}</label>
                        <input type="number" step="0.01" min={0} value={item.unit_price} onChange={e => updateCartItem(idx, 'unit_price', Number(e.target.value))} className="w-full p-2 border rounded-md text-sm bg-background" />
                      </div>
                    </div>
                    {item.sku_id && (
                      <div className="flex gap-2 text-[10px] font-bold">
                        {willUse > 0 && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                            ✅ {willUse} {dict?.newOrder?.willUseStock || 'do estoque'}
                          </span>
                        )}
                        {willPrint > 0 && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                            🖨️ {willPrint} {dict?.newOrder?.willPrint || 'para imprimir'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={() => setIsNewOrderModalOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50 hover:bg-primary/90 transition-colors">
              {isSubmitting ? 'Criando...' : 'Criar Pedido'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Frete */}
      <Modal isOpen={isShippingModalOpen} onClose={() => !isSubmitting && setIsShippingModalOpen(false)} title="Gerar Envio">
        <form onSubmit={confirmShipping} className="space-y-4">
          <p className="text-sm text-muted-foreground">Escolha como o pedido será despachado.</p>

          {shippingOrder?.marketplace_source ? (
            <div className="p-3 bg-violet-50 text-violet-800 rounded-md text-sm">
              <Truck className="w-4 h-4 mb-1 inline-block" /> Este pedido é do <strong>{shippingOrder.marketplace_source}</strong>. A etiqueta e código de rastreio serão gerados automaticamente pela plataforma.
            </div>
          ) : shippingQuotes.length === 0 ? (
            <div className="p-4 border rounded-md bg-muted/20 text-center text-sm text-muted-foreground">
              Calculando fretes...
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-bold">Opções de Frete</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {shippingQuotes.map((q, idx) => (
                  <label key={idx} className={cn(
                    "flex items-center p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors",
                    selectedQuote?.serviceId === q.serviceId ? "border-primary bg-primary/5" : ""
                  )}>
                    <input
                      type="radio"
                      name="shipping_quote"
                      className="mr-3"
                      checked={selectedQuote?.serviceId === q.serviceId}
                      onChange={() => setSelectedQuote(q)}
                    />
                    <div className="flex-1">
                      <div className="font-bold text-sm">{q.company} - {q.serviceName}</div>
                      <div className="text-xs text-muted-foreground">{q.estimatedDays} dias úteis</div>
                    </div>
                    <div className="font-bold text-sm">
                      R$ {q.price.toFixed(2)}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={() => setIsShippingModalOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={isSubmitting || !selectedQuote} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50 hover:bg-primary/90 transition-colors">
              {isSubmitting ? 'Gerando...' : 'Gerar Etiqueta & Despachar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Sugestão de Estoque */}
      <Modal isOpen={isStockModalOpen} onClose={() => !isSubmitting && setIsStockModalOpen(false)} title="Estoque Disponível">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Você possui peças prontas em estoque para os itens deste pedido. Deseja utilizar o estoque para adiantar a entrega?
          </p>
          <div className="space-y-2 border p-3 rounded-md bg-muted/20">
            {stockOrder && (orderItemsMap[stockOrder.id] || []).map(item => {
              const sku = skus.find(s => s.id === item.sku_id);
              const stock = finishedGoods.find(fg => fg.sku_id === item.sku_id)?.quantity || 0;
              if (stock === 0) return null;
              return (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div className="font-medium flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <span className="truncate max-w-[200px]" title={sku?.name}>{sku?.name || 'Item'}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">{stock} em estoque</span>
                    <div className="text-xs text-muted-foreground">Pedido exige {item.quantity} un.</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 pt-4 border-t">
            <button
              onClick={() => handleConfirmStockUse(true)}
              disabled={isSubmitting}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-bold disabled:opacity-50 flex items-center justify-center"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Utilizar Estoque
            </button>
            <button
              onClick={() => handleConfirmStockUse(false)}
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-muted hover:bg-muted text-sm font-bold rounded-md disabled:opacity-50"
            >
              Ignorar Estoque e Imprimir Tudo
            </button>
          </div>
        </div>
      </Modal>
      {/* Delete Order Modal */}
      <Modal isOpen={!!orderToDelete} onClose={() => !isSubmitting && setOrderToDelete(null)} title="Excluir Pedido">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Você está prestes a excluir o pedido de <strong>{orderToDelete?.customer_name || 'Cliente'}</strong>.
            Este pedido possui tarefas de impressão geradas. O que deseja fazer com as tarefas de impressão associadas a ele?
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => confirmDeleteOrder('discard')}
              disabled={isSubmitting}
              className="w-full px-4 py-3 text-left border rounded-md hover:bg-destructive/10 hover:border-destructive/50 transition-colors"
            >
              <div className="font-bold text-destructive flex items-center mb-1">
                <Trash2 className="w-4 h-4 mr-2" />
                Descartar e Cancelar Impressões
              </div>
              <div className="text-xs text-muted-foreground">
                As tarefas de impressão na fila e as que estão rodando serão permanentemente excluídas do sistema.
              </div>
            </button>

            <button
              onClick={() => confirmDeleteOrder('keep')}
              disabled={isSubmitting}
              className="w-full px-4 py-3 text-left border rounded-md hover:bg-primary/10 hover:border-primary/50 transition-colors"
            >
              <div className="font-bold text-primary flex items-center mb-1">
                <Package className="w-4 h-4 mr-2" />
                Manter e Enviar para o Estoque
              </div>
              <div className="text-xs text-muted-foreground">
                As peças continuarão sendo impressas normalmente. Quando forem concluídas, elas entrarão no seu estoque de Peças Prontas.
              </div>
            </button>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setOrderToDelete(null)}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

    </PageLayout>
  );
}