'use client';

import { useEffect, useState } from 'react';
import { useDictionary } from '@/lib/i18n';
import { api, FinishedGood, SKU } from '@/services/api';
import { Package, Box, DollarSign, Plus, Edit2, Trash2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { PageLayout } from '@/components/ui/PageLayout';
import { PageHeader } from '@/components/ui/PageHeader';

export default function PecasPage() {
  const { dict: fullDict } = useDictionary();
  const dict = (fullDict as any).pecas;

  const [goods, setGoods] = useState<FinishedGood[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setIsLoading(true);
    const [fetchedGoods, fetchedSkus] = await Promise.all([
      api.getFinishedGoods(),
      api.getSKUs()
    ]);
    setGoods(fetchedGoods);
    setSkus(fetchedSkus);
    setIsLoading(false);
  }

  // Agrupar por SKU
  const grouped = skus.map(sku => {
    const entries = goods.filter(g => g.sku_id === sku.id);
    const totalQty = entries.reduce((sum, g) => sum + g.quantity, 0);
    return { sku, entries, totalQty };
  }).filter(g => g.totalQty > 0);

  const totalPieces = grouped.reduce((sum, g) => sum + g.totalQty, 0);
  const totalSkusWithStock = grouped.length;
  const estimatedValue = grouped.reduce((sum, g) => sum + (g.totalQty * g.sku.sale_price), 0);

  const handleAddManual = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    try {
      await api.addFinishedGoods({
        sku_id: formData.get('sku_id') as string,
        quantity: Number(formData.get('quantity')),
      });
      toast.success('Peças adicionadas ao estoque!');
      await loadData();
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Erro ao adicionar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta entrada do estoque?')) return;
    try {
      await api.deleteFinishedGood(id);
      toast.success('Removido!');
      await loadData();
    } catch (error) {
      toast.error('Erro ao remover.');
    }
  };

  const handleAdjust = async (id: string, currentQty: number) => {
    const newQty = prompt('Nova quantidade:', String(currentQty));
    if (newQty === null) return;
    const qty = Number(newQty);
    if (isNaN(qty) || qty < 0) { toast.error('Quantidade inválida.'); return; }
    try {
      if (qty === 0) {
        await api.deleteFinishedGood(id);
      } else {
        await api.updateFinishedGood(id, { quantity: qty });
      }
      toast.success('Estoque ajustado!');
      await loadData();
    } catch (error) {
      toast.error('Erro ao ajustar.');
    }
  };

  if (isLoading) {
    return <PageLayout><div className="flex h-full items-center justify-center"><div className="text-muted-foreground">Carregando...</div></div></PageLayout>;
  }

  return (
    <PageLayout>
      <PageHeader
        title={dict?.title || 'Peças Prontas'}
        subtitle={dict?.description || 'Estoque de peças impressas prontas para venda.'}
        icon={<Package className="w-8 h-8 mr-3 text-primary" />}
        action={
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            {dict?.addManual || 'Entrada Manual'}
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 rounded-2xl border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">{dict?.kpis?.totalPieces || 'Total de Peças'}</span>
            <Package className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-bold">{totalPieces}</div>
        </div>
        <div className="p-6 rounded-2xl border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">{dict?.kpis?.totalSkus || 'SKUs com Estoque'}</span>
            <Box className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-3xl font-bold text-violet-600">{totalSkusWithStock}</div>
        </div>
        <div className="p-6 rounded-2xl border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">{dict?.kpis?.estimatedValue || 'Valor Estimado'}</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-emerald-600">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estimatedValue)}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40">
              <tr>
                <th className="px-6 py-4 font-semibold">{dict?.table?.product || 'Produto'}</th>
                <th className="px-6 py-4 font-semibold text-center">{dict?.table?.quantity || 'Quantidade'}</th>
                <th className="px-6 py-4 font-semibold text-right">{dict?.table?.value || 'Valor'}</th>
                <th className="px-6 py-4 font-semibold text-right">{dict?.table?.actions || 'Ações'}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {grouped.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    {dict?.noStock || 'Nenhuma peça em estoque no momento.'}
                  </td>
                </tr>
              ) : (
                grouped.map(({ sku, entries, totalQty }) => (
                  <tr key={sku.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {sku.image_url ? (
                          <img src={sku.image_url} alt={sku.name} className="w-10 h-10 rounded object-cover border" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted/50 border flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold">{sku.name}</div>
                          <div className="text-xs text-muted-foreground">{sku.filament_type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-2xl font-bold">{totalQty}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalQty * sku.sale_price)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {entries.map(entry => (
                        <div key={entry.id} className="inline-flex items-center gap-1 ml-2">
                          <button
                            onClick={() => handleAdjust(entry.id, entry.quantity)}
                            className="p-1 text-muted-foreground hover:text-primary transition-colors"
                            title={dict?.adjust || 'Ajustar'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Entrada Manual */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={dict?.addManual || 'Entrada Manual'}>
        <form onSubmit={handleAddManual} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">Produto (SKU)</label>
            <select name="sku_id" required className="w-full p-2 border rounded-md text-sm bg-background">
              <option value="">Selecione...</option>
              {skus.map(s => <option key={s.id} value={s.id}>{s.name} ({s.filament_type})</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">Quantidade</label>
            <input name="quantity" type="number" min={1} defaultValue={1} required className="w-full p-2 border rounded-md text-sm bg-background" />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50 hover:bg-primary/90 transition-colors">
              {isSubmitting ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
