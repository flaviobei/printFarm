'use client';

import { useEffect, useState } from 'react';
import { getDictionary } from '@/lib/i18n';
import { api, Order, SKU } from '@/services/api';
import { Clock, Printer, Package, CheckCircle, Truck, Plus, Trash2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';

type ColumnType = Order['status'];

export default function PedidosPage() {
  const dict = getDictionary();
  const pedDict = dict.pedidos;
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      } else {
        await api.createOrder(orderData);
      }
      await loadData();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving Order:', error);
      alert('Erro ao salvar pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(dict.common.deleteConfirm)) return;
    try {
      await api.deleteOrder(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting Order:', error);
      alert('Erro ao deletar pedido.');
    }
  };

  const columns: { id: ColumnType; title: string; icon: any; colorClass: string }[] = [
    { id: 'pending', title: pedDict.columns.pending, icon: Clock, colorClass: 'text-amber-500' },
    { id: 'printing', title: pedDict.columns.printing, icon: Printer, colorClass: 'text-blue-500' },
    { id: 'finishing', title: pedDict.columns.finishing, icon: Package, colorClass: 'text-purple-500' },
    { id: 'ready', title: pedDict.columns.ready, icon: CheckCircle, colorClass: 'text-green-500' },
    { id: 'shipped', title: pedDict.columns.shipped, icon: Truck, colorClass: 'text-slate-500' },
  ];

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center h-full">Carregando fila...</div>;
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pedDict.title}</h1>
          <p className="text-muted-foreground mt-1">{pedDict.description}</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          {dict.forms.addOrder}
        </button>
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
                    const sku = skus.find(s => s.id === order.sku_id);
                    const deadline = new Date(order.deadline);
                    const isNearDeadline = deadline.getTime() - Date.now() < 24 * 60 * 60 * 1000;

                    return (
                      <div key={order.id} className="group bg-card p-3 rounded-md border shadow-sm flex flex-col cursor-pointer hover:border-primary transition-colors relative">
                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-all bg-card/90 rounded-full p-1 border shadow-sm">
                          <button 
                            onClick={(e) => openEditModal(order, e)}
                            className="text-muted-foreground hover:text-primary transition-colors p-1"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={(e) => handleDeleteOrder(order.id, e)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
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

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingOrder ? dict.common.edit : dict.forms.addOrder}
      >
        <form onSubmit={handleSaveOrder} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{dict.forms.order.sku}</label>
            <select required defaultValue={editingOrder?.sku_id || ''} name="sku" className="w-full p-2 border rounded-md text-sm bg-background">
              <option value="">Selecione um produto do catálogo...</option>
              {skus.map(sku => (
                <option key={sku.id} value={sku.id}>{sku.name} ({sku.filament_type})</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">{dict.forms.order.customerName}</label>
            <input required defaultValue={editingOrder?.customer_name || ''} name="customerName" type="text" className="w-full p-2 border rounded-md text-sm bg-background" placeholder="Nome do Cliente ou Plataforma" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{dict.forms.order.deadline}</label>
              <input required defaultValue={editingOrder ? new Date(editingOrder.deadline).toISOString().split('T')[0] : ''} name="deadline" type="date" className="w-full p-2 border rounded-md text-sm bg-background" />
            </div>
            {editingOrder && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select required defaultValue={editingOrder.status} name="status" className="w-full p-2 border rounded-md text-sm bg-background">
                  {columns.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
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
              {dict.common.cancel}
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : dict.common.save}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
