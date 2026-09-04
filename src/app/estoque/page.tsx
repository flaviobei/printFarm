'use client';

import { useEffect, useState } from 'react';
import { useDictionary } from '@/lib/i18n';
import { api, Inventory } from '@/services/api';
import { AlertTriangle, CheckCircle, Edit2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';

export default function EstoquePage() {
  const { dict } = useDictionary();
  const estDict = dict.estoque;
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    const fetchedInventory = await api.getInventory();
    setInventory(fetchedInventory);
    setIsLoading(false);
  }

  const openCreateModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Inventory) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSaveInventory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const inventoryData = {
      material_type: formData.get('material') as string,
      color: formData.get('color') as string,
      remaining_grams: Number(formData.get('grams')),
    };

    try {
      if (editingItem) {
        await api.updateInventory(editingItem.id, inventoryData);
      } else {
        await api.createInventory(inventoryData);
      }
      await loadData();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving Inventory:', error);
      toast.error('Erro ao salvar rolo de filamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInventory = async (id: string) => {
    if (!window.confirm(dict.common.deleteConfirm)) return;
    try {
      await api.deleteInventory(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting Inventory:', error);
      toast.error('Erro ao deletar rolo de filamento.');
    }
  };

  const getStatus = (grams: number) => {
    if (grams <= 150) return { label: estDict.status.critical, color: 'text-destructive', bg: 'bg-destructive/10', icon: AlertTriangle };
    if (grams <= 300) return { label: estDict.status.low, color: 'text-amber-500', bg: 'bg-amber-500/10', icon: AlertTriangle };
    return { label: estDict.status.ok, color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle };
  };

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center h-full">Carregando estoque...</div>;
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{estDict.title}</h1>
          <p className="text-muted-foreground mt-1">{estDict.description}</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          {dict.forms.addInventory}
        </button>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium">{estDict.table.type}</th>
                <th className="px-6 py-3 font-medium">{estDict.table.color}</th>
                <th className="px-6 py-3 font-medium">{estDict.table.remaining}</th>
                <th className="px-6 py-3 font-medium">{estDict.table.status}</th>
                <th className="px-6 py-3 font-medium text-right">{estDict.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inventory.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    Nenhum filamento cadastrado no momento.
                  </td>
                </tr>
              )}
              {inventory.map((item) => {
                const status = getStatus(Number(item.remaining_grams));
                const percentage = Math.min(Math.max((Number(item.remaining_grams) / 1000) * 100, 0), 100);

                return (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{item.material_type}</div>
                      <div className="text-xs text-muted-foreground mt-0.5" title={item.id}>
                        ID: {item.id.split('-')[0]}...
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-4 h-4 rounded-full border shadow-sm"
                          style={{ backgroundColor: item.color === 'Preto' ? '#111' : item.color === 'Branco' ? '#fff' : '#DAA520' }}
                        />
                        <span>{item.color}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium mb-1">{item.remaining_grams}g</div>
                      <div className="w-full bg-secondary rounded-full h-1.5 max-w-[120px]">
                        <div 
                          className={cn("h-1.5 rounded-full", status.color.replace('text-', 'bg-'))}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold", status.bg, status.color)}>
                        <status.icon className="w-3 h-3 mr-1" />
                        {status.label}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openEditModal(item)}
                        className="text-muted-foreground hover:text-primary transition-colors p-2" 
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteInventory(item.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-2" 
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingItem ? dict.common.edit : dict.forms.addInventory}
      >
        <form onSubmit={handleSaveInventory} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{dict.forms.inventory.material}</label>
              <input required defaultValue={editingItem?.material_type || ''} name="material" type="text" className="w-full p-2 border rounded-md text-sm bg-background" placeholder="PETG" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{dict.forms.inventory.color}</label>
              <input required defaultValue={editingItem?.color || ''} name="color" type="text" className="w-full p-2 border rounded-md text-sm bg-background" placeholder="Preto" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{dict.forms.inventory.grams}</label>
            <input required defaultValue={editingItem?.remaining_grams || ''} name="grams" type="number" step="1" min="1" className="w-full p-2 border rounded-md text-sm bg-background" placeholder="1000" />
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
