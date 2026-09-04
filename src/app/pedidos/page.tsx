'use client';

import { useEffect, useState } from 'react';
import { useDictionary } from '@/lib/i18n';
import { api, Order, SKU } from '@/services/api';
import { Clock, Printer, Package, CheckCircle, Truck, Plus, Trash2, Edit2 } from 'lucide-react';
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
  { id: 'printing', titleKey: 'printing', icon: Printer, colorClass: 'text-blue-500' },
  { id: 'finishing', titleKey: 'finishing', icon: Package, colorClass: 'text-purple-500' },
  { id: 'ready', titleKey: 'ready', icon: CheckCircle, colorClass: 'text-green-500' },
  { id: 'shipped', titleKey: 'shipped', icon: Truck, colorClass: 'text-slate-500' },
];

function DroppableColumn({ 
  column, 
  title, 
  orders, 
  skus, 
  onEdit, 
  onDelete 
}: { 
  column: typeof columns[0], 
  title: string, 
  orders: Order[], 
  skus: SKU[], 
  onEdit: (o: Order, e: React.MouseEvent) => void, 
  onDelete: (id: string, e: React.MouseEvent) => void 
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-80 rounded-lg p-4 border shadow-sm transition-colors",
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
            onEdit={onEdit} 
            onDelete={onDelete} 
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
  onEdit, 
  onDelete, 
  isOverlay 
}: { 
  order: Order, 
  sku?: SKU, 
  onEdit?: (o: Order, e: React.MouseEvent) => void, 
  onDelete?: (id: string, e: React.MouseEvent) => void,
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
      <h3 className="font-medium text-sm mb-1">{sku?.name || 'Produto Removido'}</h3>
      <p className="text-xs text-muted-foreground mb-3">Cliente: {order.customer_name}</p>
      
      <div className="flex items-center justify-between mt-auto">
        <div className={cn("flex items-center text-xs font-medium", isNearDeadline ? "text-destructive" : "text-muted-foreground")}>
          <Clock className="w-3 h-3 mr-1" />
          {deadline.toLocaleDateString('pt-BR')}
        </div>
      </div>
    </div>
  );
}

export default function PedidosPage() {
  const { dict: fullDict } = useDictionary();
  const dict = fullDict.pedidos;
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
    const [fetchedOrders, fetchedSkus] = await Promise.all([
      api.getOrders(),
      api.getSKUs()
    ]);
    setOrders(fetchedOrders);
    setSkus(fetchedSkus);
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
      console.error('Error saving Order:', error);
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
      console.error('Error deleting Order:', error);
      toast.error('Erro ao deletar pedido.');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const order = orders.find(o => o.id === active.id);
    if (order) setActiveOrder(order);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrder(null);

    if (!over) return;

    const orderId = active.id as string;
    const newStatus = over.id as ColumnType;
    const order = orders.find(o => o.id === orderId);

    if (order && order.status !== newStatus) {
      // Optimistic update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      
      try {
        await api.updateOrder(orderId, { status: newStatus });
      } catch (error) {
        console.error('Failed to move order', error);
        toast.error('Falha ao mover pedido.');
        // Revert optimistic update
        await loadData();
      }
    }
  };

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center h-full">Carregando fila...</div>;
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
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
      
      <div className="flex-1 overflow-x-auto">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex h-full min-w-max space-x-4 pb-4">
            {columns.map((column) => (
              <DroppableColumn 
                key={column.id}
                column={column}
                title={(dict.columns as any)[column.titleKey]}
                orders={orders.filter((o) => o.status === column.id)}
                skus={skus}
                onEdit={openEditModal}
                onDelete={handleDeleteOrder}
              />
            ))}
          </div>
          
          <DragOverlay>
            {activeOrder ? (
              <DraggableCard 
                order={activeOrder} 
                sku={skus.find(s => s.id === activeOrder.sku_id)}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

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
                <label className="text-sm font-medium">Status</label>
                <select required defaultValue={editingOrder.status} name="status" className="w-full p-2 border rounded-md text-sm bg-background">
                  {columns.map(c => (
                    <option key={c.id} value={c.id}>{(dict.columns as any)[c.titleKey]}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
              className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              {fullDict.common.cancel}
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : fullDict.common.save}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
