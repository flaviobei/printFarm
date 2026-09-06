'use client';

import { useEffect, useState } from 'react';
import { api, Supply } from '@/services/api';
import { Package, Plus, Trash2, Edit2 } from 'lucide-react';
import { PageLayout } from '@/components/ui/PageLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';

export default function InsumosPage() {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Supply | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const data = await api.getSupplies();
      setSupplies(data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar insumos.');
    } finally {
      setIsLoading(false);
    }
  }

  const handleSaveSupply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      quantity: Number(formData.get('quantity')),
      unit: formData.get('unit') as string,
      cost: Number(formData.get('cost')),
    };

    try {
      if (editingItem) {
        await api.updateSupply(editingItem.id, data);
        toast.success('Insumo atualizado!');
      } else {
        await api.createSupply(data);
        toast.success('Insumo adicionado!');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar insumo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este insumo?')) return;
    try {
      await api.deleteSupply(id);
      toast.success('Insumo removido!');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir insumo.');
    }
  };

  const openEditModal = (item: Supply) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  return (
    <PageLayout>
      <PageHeader 
        title="Estoque de Insumos Extras"
        subtitle="Gerencie embalagens, tintas, manuais e outros insumos não-plásticos."
        icon={<Package className="w-8 h-8 mr-3 text-primary" />}
        action={
          <button onClick={openNewModal} className="flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Insumo
          </button>
        }
      />

      <div className="bg-card rounded-lg border shadow-sm flex-1 p-6">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">Carregando...</div>
        ) : supplies.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-md border border-dashed">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-foreground">Nenhum Insumo Cadastrado</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">Cadastre itens como caixas de papelão, parafusos ou tintas para controlar seu estoque.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome do Item</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Qtd Atual</th>
                  <th className="px-4 py-3 font-medium">Custo (R$)</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {supplies.map(item => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-bold">{item.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{item.quantity}</span> <span className="text-xs text-muted-foreground">{item.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">R$ {item.cost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEditModal(item)} className="p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors" title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={editingItem ? 'Editar Insumo' : 'Novo Insumo'}>
        <form onSubmit={handleSaveSupply} className="space-y-4">
          <div>
            <label className="text-sm font-bold block mb-1">Nome / Descrição</label>
            <input required name="name" defaultValue={editingItem?.name} placeholder="Ex: Caixa 15x15x15" className="w-full p-2 border rounded-md bg-background" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1">Categoria</label>
              <select required name="category" defaultValue={editingItem?.category || 'Embalagem'} className="w-full p-2 border rounded-md bg-background">
                <option value="Embalagem">Embalagem</option>
                <option value="Pintura/Acabamento">Pintura/Acabamento</option>
                <option value="Ferragens">Ferragens / Montagem</option>
                <option value="Brindes/Mimos">Brindes / Mimos</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">Unidade de Medida</label>
              <select required name="unit" defaultValue={editingItem?.unit || 'un'} className="w-full p-2 border rounded-md bg-background">
                <option value="un">Unidades (un)</option>
                <option value="g">Gramas (g)</option>
                <option value="ml">Mililitros (ml)</option>
                <option value="m">Metros (m)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1">Quantidade em Estoque</label>
              <input required type="number" step="0.01" name="quantity" defaultValue={editingItem?.quantity ?? 0} className="w-full p-2 border rounded-md bg-background" />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">Custo Unitário (R$)</label>
              <input type="number" step="0.01" name="cost" defaultValue={editingItem?.cost ?? 0} className="w-full p-2 border rounded-md bg-background" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50 hover:bg-primary/90">
              {isSubmitting ? 'Salvando...' : 'Salvar Insumo'}
            </button>
          </div>
        </form>
      </Modal>

    </PageLayout>
  );
}
