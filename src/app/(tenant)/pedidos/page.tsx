'use client';

import { useEffect, useState } from 'react';
import { useDictionary } from '@/lib/i18n';
import { api, Order, SKU, Printer, Inventory } from '@/services/api';
import { Clock, Printer as PrinterIcon, Package, CheckCircle, Truck, Plus, Trash2, Edit2, Play, Check, AlertTriangle, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
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

type ColumnType = Order['status'];

const columns: { id: ColumnType; titleKey: string; icon: any; colorClass: string }[] = [
  { id: 'pending', titleKey: 'pending', icon: Clock, colorClass: 'text-amber-500' },
  { id: 'printing', titleKey: 'printing', icon: PrinterIcon, colorClass: 'text-blue-500' },
  { id: 'finishing', titleKey: 'finishing', icon: Package, colorClass: 'text-purple-500' },
  { id: 'ready', titleKey: 'ready', icon: CheckCircle, colorClass: 'text-green-500' },
  { id: 'shipped', titleKey: 'shipped', icon: Truck, colorClass: 'text-slate-500' },
];

function DroppableColumn({
  column,
  title,
  orders,
  skus,
  printers,
  onEdit,
  onDelete,
  onDeliver
}: {
  column: typeof columns[0],
  title: string,
  orders: Order[],
  skus: SKU[],
  printers: Printer[],
  onEdit: (o: Order, e: React.MouseEvent) => void,
  onDelete: (id: string, e: React.MouseEvent) => void,
  onDeliver: (id: string, e: React.MouseEvent) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-[280px] max-h-full rounded-lg p-3 border shadow-sm transition-colors",
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
          <DraggableCard
            key={order.id}
            order={order}
            sku={skus.find(s => s.id === order.sku_id)}
            printer={printers.find(p => p.id === order.printer_id)}
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

function DraggableCard({
  order,
  sku,
  printer,
  onEdit,
  onDelete,
  onDeliver,
  isOverlay
}: {
  order: Order,
  sku?: SKU,
  printer?: Printer,
  onEdit?: (o: Order, e: React.MouseEvent) => void,
  onDelete?: (id: string, e: React.MouseEvent) => void,
  onDeliver?: (id: string, e: React.MouseEvent) => void,
  isOverlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
    data: { order }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const deadline = new Date(order.deadline);
  const isNearDeadline = deadline.getTime() - Date.now() < 24 * 60 * 60 * 1000;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group bg-card p-3 rounded-md border shadow-sm flex flex-col cursor-grab active:cursor-grabbing hover:border-primary transition-colors relative",
        isDragging && "opacity-40",
        isOverlay && "opacity-100 scale-105 shadow-xl cursor-grabbing rotate-2"
      )}
    >
      {!isOverlay && onEdit && onDelete && (
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-all bg-card/90 rounded-full p-1 border shadow-sm z-10">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => onEdit(order, e)}
            className="text-muted-foreground hover:text-primary transition-colors p-1 cursor-pointer"
            title="Editar"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => onDelete(order.id, e)}
            className="text-muted-foreground hover:text-destructive transition-colors p-1 cursor-pointer"
            title="Remover"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex justify-between items-start mb-2 pr-12">
        <span className="text-xs font-bold text-muted-foreground">{order.id.split('-')[0]}</span>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
          {sku?.filament_type || 'Desconhecido'}
        </span>
      </div>
      <div className="flex items-start gap-2.5 mb-1">
        {sku?.image_url ? (
          <img src={sku.image_url} alt={sku.name} className="w-9 h-9 rounded object-cover border flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded bg-muted/50 border flex items-center justify-center flex-shrink-0">
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <div>
          <h3 className="font-medium text-sm leading-tight">{sku?.name || 'Produto Removido'}</h3>
          <p className="text-xs text-muted-foreground">Cliente: {order.customer_name}</p>
        </div>
      </div>

      <div className="flex flex-col mt-auto gap-2">
        <div className="flex items-center justify-between">
          <div className={cn("flex items-center text-xs font-medium", isNearDeadline ? "text-destructive" : "text-muted-foreground")}>
            <Clock className="w-3 h-3 mr-1" />
            {deadline.toLocaleDateString('pt-BR')}
          </div>
          {printer && order.status === 'printing' && (
            <div className="flex items-center text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200">
              <PrinterIcon className="w-3 h-3 mr-1" />
              {printer.name}
            </div>
          )}
        </div>

        {order.status === 'shipped' && onDeliver && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => onDeliver(order.id, e)}
            className="w-full mt-2 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-bold rounded border border-green-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <CheckCircle className="w-3.5 h-3.5 mr-1" />
            Confirmar Entrega
          </button>
        )}
      </div>
    </div>
  );
}

export default function PedidosPage() {
  const { dict: fullDict } = useDictionary();
  const dict = fullDict.pedidos;

  const [orders, setOrders] = useState<Order[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [setupOrder, setSetupOrder] = useState<Order | null>(null);
  const [selectedPrinterForSetup, setSelectedPrinterForSetup] = useState<string>('');

  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [completionData, setCompletionData] = useState<{ order: Order, nextStatus: ColumnType } | null>(null);

  const [isFailureModalOpen, setIsFailureModalOpen] = useState(false);
  const [failureOrder, setFailureOrder] = useState<Order | null>(null);

  // Dnd State
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    const [fetchedOrders, fetchedSkus, fetchedPrinters, fetchedInventory] = await Promise.all([
      api.getOrders(),
      api.getSKUs(),
      api.getPrinters(),
      api.getInventory()
    ]);
    setOrders(fetchedOrders);
    setSkus(fetchedSkus);
    setPrinters(fetchedPrinters);
    setInventory(fetchedInventory);
    setIsLoading(false);
  }

  const openCreateModal = () => {
    setEditingOrder(null);
    setIsModalOpen(true);
  };

  const openEditModal = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingOrder(order);
    setIsModalOpen(true);
  };

  const handleSaveOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const orderData = {
      sku_id: formData.get('sku') as string,
      customer_name: formData.get('customerName') as string,
      deadline: new Date(formData.get('deadline') as string).toISOString(),
      status: (formData.get('status') as ColumnType) || 'pending',
    };

    try {
      if (editingOrder) {
        await api.updateOrder(editingOrder.id, orderData);
        toast.success('Pedido atualizado!');
      } else {
        await api.createOrder(orderData);
        toast.success('Pedido criado!');
      }
      await loadData();
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Erro ao salvar pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(fullDict.common.deleteConfirm)) return;
    try {
      await api.deleteOrder(id);
      toast.success('Pedido removido!');
      await loadData();
    } catch (error) {
      toast.error('Erro ao deletar pedido.');
    }
  };

  // Setup de Produção (Ao mover para Imprimindo)
  const handleSetupPrint = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!setupOrder) return;
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const printerId = formData.get('printer_id') as string;

    const selectedPrinter = printers.find(p => p.id === printerId);
    const spoolCapacity = selectedPrinter?.spool_capacity || 1;

    const inventoryIds: string[] = [];
    for (let i = 0; i < spoolCapacity; i++) {
      const val = formData.get(`inventory_id_${i}`) as string;
      if (val) inventoryIds.push(val);
    }

    try {
      await api.updateOrder(setupOrder.id, {
        status: 'printing',
        printer_id: printerId,
        inventory_ids: inventoryIds.length > 0 ? inventoryIds : undefined,
        inventory_id: inventoryIds.length > 0 ? inventoryIds[0] : null // Legacy fallback
      });
      if (printerId) await api.updatePrinter(printerId, { status: 'printing' });
      for (const invId of inventoryIds) {
        await api.updateInventory(invId, { status: 'in_use' });
      }

      toast.success('Produção Iniciada!');
      await loadData();
      setIsSetupModalOpen(false);
    } catch (error) {
      toast.error('Erro ao iniciar produção.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Baixa de Produção (Ao mover para Finalizado/Pronto)
  const handleCompletePrint = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!completionData) return;
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const order = completionData.order;

    try {
      await api.updateOrder(order.id, {
        status: completionData.nextStatus
      });

      if (order.printer_id) {
        await api.updatePrinter(order.printer_id, { status: 'idle' });
      }

      const idsToProcess = order.inventory_ids?.length ? order.inventory_ids : order.inventory_id ? [order.inventory_id] : [];

      if (idsToProcess.length > 0) {
        for (const invId of idsToProcess) {
          const actualWeight = Number(formData.get(`actual_weight_${invId}`) || 0);
          const wasteWeight = Number(formData.get(`waste_weight_${invId}`) || 0);
          const totalSpent = actualWeight + wasteWeight;

          const inv = inventory.find(i => i.id === invId);
          if (inv) {
            const newRemaining = Math.max(0, inv.remaining_grams - totalSpent);
            await api.updateInventory(inv.id, {
              remaining_grams: newRemaining,
              status: 'available'
            });
            await api.logMaterialUsage({
              order_id: order.id,
              inventory_id: inv.id,
              printer_id: order.printer_id || undefined,
              weight_used: actualWeight,
              weight_wasted: wasteWeight,
              type: 'success'
            });
          }
        }
      } else {
        // Fallback sem estoque
        const actualWeight = Number(formData.get('actual_weight_fallback') || 0);
        const wasteWeight = Number(formData.get('waste_weight_fallback') || 0);
        await api.logMaterialUsage({
          order_id: order.id,
          printer_id: order.printer_id || undefined,
          weight_used: actualWeight,
          weight_wasted: wasteWeight,
          type: 'success'
        });
      }

      toast.success('Produção concluída e estoque atualizado!');
      await loadData();
      setIsCompletionModalOpen(false);
    } catch (error) {
      toast.error('Erro ao dar baixa na produção.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFailurePrint = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!failureOrder) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    try {
      if (failureOrder.printer_id) {
        await api.updatePrinter(failureOrder.printer_id, { status: 'idle' });
      }

      const idsToProcess = failureOrder.inventory_ids?.length ? failureOrder.inventory_ids : failureOrder.inventory_id ? [failureOrder.inventory_id] : [];

      if (idsToProcess.length > 0) {
        for (const invId of idsToProcess) {
          const wasteWeight = Number(formData.get(`waste_weight_${invId}`) || 0);
          const inv = inventory.find(i => i.id === invId);
          if (inv) {
            const newRemaining = Math.max(0, inv.remaining_grams - wasteWeight);
            await api.updateInventory(inv.id, {
              remaining_grams: newRemaining,
              status: 'available'
            });
            await api.logMaterialUsage({
              order_id: failureOrder.id,
              inventory_id: inv.id,
              printer_id: failureOrder.printer_id || undefined,
              weight_used: 0,
              weight_wasted: wasteWeight,
              type: 'failure'
            });
          }
        }
      } else {
        const wasteWeight = Number(formData.get('waste_weight_fallback') || 0);
        await api.logMaterialUsage({
          order_id: failureOrder.id,
          printer_id: failureOrder.printer_id || undefined,
          weight_used: 0,
          weight_wasted: wasteWeight,
          type: 'failure'
        });
      }

      await api.updateOrder(failureOrder.id, { status: 'pending', printer_id: null, inventory_id: null, inventory_ids: [] });

      toast.success('Impressão abortada. Perdas registradas e rolo(s) liberado(s).');
      await loadData();
      setIsFailureModalOpen(false);
    } catch (error) {
      toast.error('Erro ao registrar falha de produção.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const order = orders.find(o => o.id === active.id);
    if (order) setActiveOrder(order);
  };

  const handleDeliverOrder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.updateOrder(id, { status: 'delivered' });
      toast.success('Pedido marcado como entregue!');
      await loadData();
    } catch (error) {
      toast.error('Erro ao finalizar pedido.');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrder(null);

    if (!over) return;

    const orderId = active.id as string;
    const newStatus = over.id as ColumnType;
    const order = orders.find(o => o.id === orderId);

    if (order && order.status !== newStatus) {
      const colIndex = { pending: 0, printing: 1, finishing: 2, ready: 3, shipped: 4 };
      const currentIdx = colIndex[order.status as ColumnType];
      const newIdx = colIndex[newStatus];

      // Regra de Negócio: Proibir volta a partir de acabamento
      if (currentIdx >= 2 && newIdx < currentIdx) {
        toast.error('Movimento inválido: Não é possível retroceder a partir desta etapa.');
        return;
      }

      // Intercept 0: Abortar Impressão (printing -> pending)
      if (order.status === 'printing' && newStatus === 'pending') {
        setFailureOrder(order);
        setTimeout(() => setIsFailureModalOpen(true), 10);
        return;
      }

      // Intercept 1: Start Printing
      if (newStatus === 'printing' && order.status === 'pending') {
        setSetupOrder(order);
        setTimeout(() => setIsSetupModalOpen(true), 10);
        return; // wait for modal
      }

      // Intercept 2: Finish Printing
      if (order.status === 'printing' && (newStatus === 'finishing' || newStatus === 'ready')) {
        setCompletionData({ order, nextStatus: newStatus });
        setTimeout(() => setIsCompletionModalOpen(true), 10);
        return; // wait for modal
      }

      // Optimistic update for simple moves (e.g., finishing -> ready)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

      try {
        await api.updateOrder(orderId, { status: newStatus });
      } catch (error) {
        toast.error('Falha ao mover pedido.');
        await loadData();
      }
    }
  };

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center h-full">Carregando fila...</div>;
  }

  const activeSkuForSetup = setupOrder ? skus.find(s => s.id === setupOrder.sku_id) : null;
  const activeSkuForCompletion = completionData ? skus.find(s => s.id === completionData.order.sku_id) : null;

  return (
    <div className="p-6 h-full flex flex-col max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{dict.title}</h1>
          <p className="text-muted-foreground mt-1">{dict.description}</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          {fullDict.forms.addOrder}
        </button>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex h-full min-w-max space-x-4">
            {columns.map((column) => (
              <DroppableColumn
                key={column.id}
                column={column}
                title={(dict.columns as any)[column.titleKey]}
                orders={orders.filter((o) => o.status === column.id)}
                skus={skus}
                printers={printers}
                onEdit={openEditModal}
                onDelete={handleDeleteOrder}
                onDeliver={handleDeliverOrder}
              />
            ))}
          </div>

          <DragOverlay>
            {activeOrder ? (
              <DraggableCard
                order={activeOrder}
                sku={skus.find(s => s.id === activeOrder.sku_id)}
                printer={printers.find(p => p.id === activeOrder.printer_id)}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modal Genérico de Criar/Editar Pedido */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingOrder ? fullDict.common.edit : fullDict.forms.addOrder}
      >
        <form onSubmit={handleSaveOrder} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{fullDict.forms.order.sku}</label>
            <select required defaultValue={editingOrder?.sku_id || ''} name="sku" className="w-full p-2 border rounded-md text-sm bg-background">
              <option value="">Selecione um produto do catálogo...</option>
              {skus.map(sku => (
                <option key={sku.id} value={sku.id}>{sku.name} ({sku.filament_type})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{fullDict.forms.order.customerName}</label>
            <input required defaultValue={editingOrder?.customer_name || ''} name="customerName" type="text" className="w-full p-2 border rounded-md text-sm bg-background" placeholder="Nome do Cliente ou Plataforma" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{fullDict.forms.order.deadline}</label>
              <input required defaultValue={editingOrder ? new Date(editingOrder.deadline).toISOString().split('T')[0] : ''} name="deadline" type="date" className="w-full p-2 border rounded-md text-sm bg-background" />
            </div>
            {editingOrder && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Status Atual</label>
                <select required defaultValue={editingOrder.status} name="status" className="w-full p-2 border rounded-md text-sm bg-background">
                  {columns.map(c => (
                    <option key={c.id} value={c.id}>{(dict.columns as any)[c.titleKey]}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isSubmitting ? 'Salvando...' : 'Salvar Pedido'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Setup de Impressão */}
      <Modal
        isOpen={isSetupModalOpen}
        onClose={() => !isSubmitting && setIsSetupModalOpen(false)}
        title="Iniciar Produção"
      >
        <form onSubmit={handleSetupPrint} className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-md mb-4 border">
            <h3 className="font-bold text-sm mb-1">{activeSkuForSetup?.name}</h3>
            <p className="text-xs text-muted-foreground">Material Necessário: {activeSkuForSetup?.filament_type} ({activeSkuForSetup?.weight_grams}g)</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center">
              <PrinterIcon className="w-4 h-4 mr-2 text-primary" />
              Alocar Impressora
            </label>
            <select
              required
              name="printer_id"
              className="w-full p-2 border rounded-md text-sm bg-background font-medium"
              value={selectedPrinterForSetup}
              onChange={(e) => setSelectedPrinterForSetup(e.target.value)}
            >
              <option value="">Selecione uma impressora livre...</option>
              {printers.filter(p => p.status === 'idle').map(printer => (
                <option key={printer.id} value={printer.id}>{printer.name} ({printer.model})</option>
              ))}
            </select>
            {printers.filter(p => p.status === 'idle').length === 0 && (
              <p className="text-xs text-destructive">Nenhuma impressora livre no momento!</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center mt-4">
              <Package className="w-4 h-4 mr-2 text-amber-500" />
              Alocar Filamentos (Estoque)
            </label>
            {Array.from({ length: printers.find(p => p.id === selectedPrinterForSetup)?.spool_capacity || 1 }).map((_, i) => (
              <div key={i} className="mb-2">
                <label className="text-xs font-semibold mb-1 block text-muted-foreground">Posição {i + 1}</label>
                <select name={`inventory_id_${i}`} className="w-full p-2 border rounded-md text-sm bg-background">
                  <option value="">Nenhum (Não dar baixa automática)</option>
                  {inventory.filter(inv => inv.status === 'available' && inv.remaining_grams > 0).map(inv => (
                    <option key={inv.id} value={inv.id}>{inv.material_type} {inv.color} - {inv.brand} ({inv.remaining_grams}g restantes)</option>
                  ))}
                </select>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">Aconselhado para rastreio exato de consumo multi-color.</p>
          </div>

          <div className="flex justify-end space-x-2 pt-4 mt-6 border-t">
            <button type="button" onClick={() => setIsSetupModalOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center">
              <Play className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Iniciando...' : 'Iniciar Impressão'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Baixa de Impressão */}
      <Modal
        isOpen={isCompletionModalOpen}
        onClose={() => !isSubmitting && setIsCompletionModalOpen(false)}
        title="Baixa de Produção"
      >
        <form onSubmit={handleCompletePrint} className="space-y-4">
          <div className="bg-green-50 p-4 rounded-md mb-4 border border-green-200">
            <h3 className="font-bold text-sm text-green-800 mb-1 flex items-center">
              <Check className="w-4 h-4 mr-1" />
              Impressão Finalizada
            </h3>
            <p className="text-xs text-green-700">A impressora será liberada para o próximo pedido. Confirme os gastos para atualizar o estoque.</p>
          </div>

          <div className="space-y-4">
            {(completionData?.order.inventory_ids?.length ? completionData.order.inventory_ids : completionData?.order.inventory_id ? [completionData.order.inventory_id] : []).map((invId, idx) => {
              const inv = inventory.find(i => i.id === invId);
              if (!inv) return null;
              return (
                <div key={idx} className="bg-muted/30 p-3 rounded-md border">
                  <div className="font-bold text-xs mb-2 flex items-center text-slate-700">
                    <Package className="w-3 h-3 mr-1" />
                    {inv.material_type} {inv.color} - {inv.brand}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">Peso Gasto (g)</label>
                      <input required type="number" name={`actual_weight_${invId}`} defaultValue={activeSkuForCompletion?.multicolor_weights?.[idx] ?? (idx === 0 ? activeSkuForCompletion?.weight_grams || 0 : 0)} className="w-full p-2 border rounded-md text-sm bg-background font-medium" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">Desperdício (g)</label>
                      <input required type="number" name={`waste_weight_${invId}`} defaultValue={0} className="w-full p-2 border rounded-md text-sm bg-background font-medium" />
                    </div>
                  </div>
                </div>
              );
            })}

            {!(completionData?.order.inventory_ids?.length || completionData?.order.inventory_id) && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Peso Gasto na Peça (g)</label>
                  <input required type="number" name="actual_weight_fallback" defaultValue={activeSkuForCompletion?.weight_grams || 0} className="w-full p-2 border rounded-md text-sm bg-background font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Desperdício / Limpeza (g)</label>
                  <input required type="number" name="waste_weight_fallback" defaultValue={0} className="w-full p-2 border rounded-md text-sm bg-background font-medium" />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4 mt-6 border-t">
            <button type="button" onClick={() => setIsCompletionModalOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
              {isSubmitting ? 'Processando...' : 'Confirmar e Liberar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Falha de Produção */}
      <Modal isOpen={isFailureModalOpen} onClose={() => !isSubmitting && setIsFailureModalOpen(false)} title="Falha de Produção (Abortar)">
        <form onSubmit={handleFailurePrint} className="space-y-4">
          <div className="bg-red-50 p-4 rounded-md mb-4 border border-red-100">
            <h3 className="font-bold text-sm mb-1 text-red-900 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Impressão Abortada
            </h3>
            <p className="text-xs text-red-700">O pedido retornará para Aguardando Produção. Informe quanto material foi perdido (espaguete, base) para dar baixa no estoque.</p>
          </div>

          <div className="space-y-4">
            {(failureOrder?.inventory_ids?.length ? failureOrder.inventory_ids : failureOrder?.inventory_id ? [failureOrder.inventory_id] : []).map((invId, idx) => {
              const inv = inventory.find(i => i.id === invId);
              if (!inv) return null;
              return (
                <div key={idx} className="bg-red-50/50 p-3 rounded-md border border-red-100">
                  <div className="font-bold text-xs mb-2 flex items-center text-red-800">
                    <Package className="w-3 h-3 mr-1" />
                    {inv.material_type} {inv.color}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-red-700">Desperdício da Falha (g)</label>
                    <input required type="number" name={`waste_weight_${invId}`} defaultValue={0} className="w-full p-2 border rounded-md text-sm bg-background font-medium" />
                  </div>
                </div>
              );
            })}

            {!(failureOrder?.inventory_ids?.length || failureOrder?.inventory_id) && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Desperdício da Falha (g)</label>
                <input required type="number" name="waste_weight_fallback" defaultValue={0} className="w-full p-2 border rounded-md text-sm bg-background font-medium" placeholder="Ex: 45" />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 mt-6 border-t">
            <button type="button" onClick={() => setIsFailureModalOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md disabled:opacity-50 hover:bg-red-700 transition-colors">
              {isSubmitting ? 'Registrando...' : 'Registrar Perda e Abortar'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}