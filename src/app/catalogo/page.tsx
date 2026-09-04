'use client';

import { useEffect, useState } from 'react';
import { getDictionary } from '@/lib/i18n';
import { api, SKU, UserSettings } from '@/services/api';
import { calculatePrintCost, CostParameters } from '@/services/cost-calculator';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';

export default function CatalogoPage() {
  const dict = getDictionary();
  const catDict = dict.catalogo;
  const [skus, setSkus] = useState<SKU[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<SKU | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    const [fetchedSkus, fetchedSettings] = await Promise.all([
      api.getSKUs(),
      api.getUserSettings()
    ]);
    setSkus(fetchedSkus);
    setSettings(fetchedSettings);
    setIsLoading(false);
  }

  const safeSettings = settings || {
    electricity_price_per_kwh: 0.85,
    printer_power_watts: 250,
    failure_rate_percentage: 5,
    marketplace_fee_percentage: 12
  };

  const openCreateModal = () => {
    setEditingSku(null);
    setIsModalOpen(true);
  };

  const openEditModal = (sku: SKU) => {
    setEditingSku(sku);
    setIsModalOpen(true);
  };

  const handleSaveSKU = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const skuData = {
      name: formData.get('name') as string,
      filament_type: formData.get('material') as string,
      weight_grams: Number(formData.get('weight')),
      print_time_hours: Number(formData.get('printTime')),
      sale_price: Number(formData.get('salePrice')),
    };

    try {
      if (editingSku) {
        await api.updateSKU(editingSku.id, skuData);
      } else {
        await api.createSKU(skuData);
      }
      await loadData();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving SKU:', error);
      alert('Erro ao salvar produto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSKU = async (id: string) => {
    if (!window.confirm(dict.common.deleteConfirm)) return;
    try {
      await api.deleteSKU(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting SKU:', error);
      alert('Erro ao deletar produto. Ele pode estar atrelado a um pedido existente.');
    }
  };

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center h-full">Carregando catálogo...</div>;
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{catDict.title}</h1>
          <p className="text-muted-foreground mt-1">{catDict.description}</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          {dict.forms.addSku}
        </button>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium">{catDict.table.name}</th>
                <th className="px-6 py-3 font-medium">{catDict.table.material}</th>
                <th className="px-6 py-3 font-medium">{catDict.table.specs}</th>
                <th className="px-6 py-3 font-medium">{catDict.table.salePrice}</th>
                <th className="px-6 py-3 font-medium">{catDict.table.netProfit}</th>
                <th className="px-6 py-3 font-medium text-right">{catDict.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {skus.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Nenhum produto cadastrado no momento.
                  </td>
                </tr>
              )}
              {skus.map((sku) => {
                const params: CostParameters = {
                  filamentPricePerKg: 120.00,
                  printerPowerWatts: Number(safeSettings.printer_power_watts),
                  electricityPricePerKwh: Number(safeSettings.electricity_price_per_kwh),
                  failureRatePercentage: Number(safeSettings.failure_rate_percentage),
                  packagingCost: 2.50,
                  shippingCost: 0,
                  marketplaceFeePercentage: Number(safeSettings.marketplace_fee_percentage),
                  filamentWeightGrams: Number(sku.weight_grams),
                  printTimeHours: Number(sku.print_time_hours),
                  salePrice: Number(sku.sale_price),
                };
                
                const costResult = calculatePrintCost(params);
                const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
                const isProfitable = costResult.netProfit > 0;

                return (
                  <tr key={sku.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{sku.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5" title={sku.id}>
                        ID: {sku.id.split('-')[0]}...
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                        {sku.filament_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div>{sku.weight_grams}g</div>
                      <div>{sku.print_time_hours}h</div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {formatBRL(sku.sale_price)}
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn("font-bold", isProfitable ? "text-green-600 dark:text-green-500" : "text-destructive")}>
                        {formatBRL(costResult.netProfit)}
                      </div>
                      <div className={cn("text-xs font-medium mt-0.5", isProfitable ? "text-green-600/80 dark:text-green-500/80" : "text-destructive/80")}>
                        {costResult.profitMarginPercentage.toFixed(1)}% {catDict.table.margin.toLowerCase()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openEditModal(sku)}
                        className="text-muted-foreground hover:text-primary transition-colors p-2" 
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteSKU(sku.id)}
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
        title={editingSku ? dict.common.edit : dict.forms.addSku}
      >
        <form onSubmit={handleSaveSKU} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{dict.forms.sku.name}</label>
            <input required defaultValue={editingSku?.name || ''} name="name" type="text" className="w-full p-2 border rounded-md text-sm bg-background" placeholder="Dragão Articulado" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{dict.forms.sku.material}</label>
              <input required defaultValue={editingSku?.filament_type || ''} name="material" type="text" className="w-full p-2 border rounded-md text-sm bg-background" placeholder="PLA Silk" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{dict.forms.sku.weight}</label>
              <input required defaultValue={editingSku?.weight_grams || ''} name="weight" type="number" step="1" min="1" className="w-full p-2 border rounded-md text-sm bg-background" placeholder="150" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{dict.forms.sku.printTime}</label>
              <input required defaultValue={editingSku?.print_time_hours || ''} name="printTime" type="number" step="0.1" min="0.1" className="w-full p-2 border rounded-md text-sm bg-background" placeholder="8.5" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{dict.forms.sku.salePrice}</label>
              <input required defaultValue={editingSku?.sale_price || ''} name="salePrice" type="number" step="0.01" min="1" className="w-full p-2 border rounded-md text-sm bg-background" placeholder="89.90" />
            </div>
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
