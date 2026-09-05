'use client';

import { useEffect, useState } from 'react';
import { useDictionary } from '@/lib/i18n';
import { api, SKU, UserSettings } from '@/services/api';
import { calculatePrintCost, CostParameters } from '@/services/cost-calculator';
import { Edit2, Plus, Trash2, ImageIcon, Palette, X, Upload, Download, FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
import { PageLayout } from '@/components/ui/PageLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Box } from 'lucide-react';

export default function CatalogoPage() {
  const { dict } = useDictionary();
  const catDict = dict.catalogo;
  const [skus, setSkus] = useState<SKU[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<SKU | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isMulticolor, setIsMulticolor] = useState(false);
  const [colorWeights, setColorWeights] = useState<number[]>([0, 0]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

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
    setIsMulticolor(false);
    setColorWeights([0, 0]);
    setImageFile(null);
    setPreviewUrl(null);
    setIsModalOpen(true);
  };

  const openEditModal = (sku: SKU) => {
    setEditingSku(sku);
    setIsMulticolor(!!sku.multicolor_weights?.length);
    setColorWeights(sku.multicolor_weights?.length ? sku.multicolor_weights : [0, 0]);
    setImageFile(null);
    setPreviewUrl(sku.image_url || null);
    setIsModalOpen(true);
  };

  const handleSaveSKU = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    let imageUrl = editingSku?.image_url || null;
    if (imageFile) {
      try {
        imageUrl = await api.uploadSkuImage(imageFile);
      } catch (err) {
        console.error('Error uploading image', err);
        toast.error('Erro ao fazer upload da imagem.');
        setIsSubmitting(false);
        return;
      }
    }

    const calculatedWeight = isMulticolor 
      ? colorWeights.reduce((acc, curr) => acc + curr, 0)
      : Number(formData.get('weight'));

    const skuData: Partial<SKU> = {
      name: formData.get('name') as string,
      filament_type: formData.get('material') as string,
      weight_grams: calculatedWeight,
      print_time_hours: Number(formData.get('printTime')),
      sale_price: Number(formData.get('salePrice')),
      image_url: imageUrl,
      multicolor_weights: isMulticolor ? colorWeights : null
    };

    try {
      if (editingSku) {
        await api.updateSKU(editingSku.id, skuData);
      } else {
        await api.createSKU(skuData as Omit<SKU, 'id' | 'created_at' | 'user_id'>);
      }
      await loadData();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving SKU:', error);
      toast.error('Erro ao salvar produto.');
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
      toast.error('Erro ao deletar produto. Ele pode estar atrelado a um pedido existente.');
    }
  };

  const handleExportCSV = () => {
    const headers = ['name', 'filament_type', 'weight_grams', 'print_time_hours', 'sale_price', 'multicolor_weights'];
    const csvRows = [
      headers.join(';'),
      ...skus.map(sku => [
        sku.name,
        sku.filament_type,
        sku.weight_grams,
        sku.print_time_hours,
        sku.sale_price,
        sku.multicolor_weights?.length ? sku.multicolor_weights.join(',') : ''
      ].join(';'))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `printfarm_skus_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${skus.length} ${dict.toast.exportSuccess}`);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset para permitir reimportar o mesmo arquivo

    const text = await file.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      toast.error(dict.toast.importEmpty);
      return;
    }

    const dataLines = lines.slice(1); // pula header
    let imported = 0;
    let errors = 0;

    for (const line of dataLines) {
      const cols = line.split(';').map(c => c.trim());
      if (cols.length < 5) { errors++; continue; }

      const [name, filament_type, weight_str, time_str, price_str, multicolor_str] = cols;
      const weight = Number(weight_str);
      const time = Number(time_str);
      const price = Number(price_str);

      if (!name || !filament_type || isNaN(weight) || isNaN(time) || isNaN(price)) {
        errors++;
        continue;
      }

      const multicolor_weights = multicolor_str 
        ? multicolor_str.split(',').map(Number).filter(n => !isNaN(n) && n > 0)
        : null;

      try {
        await api.createSKU({
          name,
          filament_type,
          weight_grams: weight,
          print_time_hours: time,
          sale_price: price,
          multicolor_weights: multicolor_weights?.length ? multicolor_weights : null,
        } as any);
        imported++;
      } catch {
        errors++;
      }
    }

    toast.success(`${dict.toast.importComplete}: ${imported} SKUs${errors > 0 ? `, ${errors} errors` : ''}.`);
    await loadData();
  };

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center h-full">{catDict.loading}</div>;
  }

  return (
    <PageLayout>
      <PageHeader 
        title={catDict.title}
        subtitle={catDict.description}
        icon={<Box className="w-8 h-8 mr-3 text-primary" />}
        action={
          <>
            <button 
              onClick={handleExportCSV}
              disabled={skus.length === 0}
              className="flex items-center border px-3 py-2 rounded-md text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40"
              title={catDict.export}
            >
              <Download className="w-4 h-4 mr-1.5" />
              {catDict.export}
            </button>
            <label className="flex items-center border px-3 py-2 rounded-md text-sm font-medium hover:bg-muted transition-colors cursor-pointer">
              <FileUp className="w-4 h-4 mr-1.5" />
              {catDict.import}
              <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
            </label>
            <button 
              onClick={openCreateModal}
              className="flex items-center bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {dict.forms.addSku}
            </button>
          </>
        }
      />

      <div className="rounded-md border bg-card text-card-foreground shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium w-12"></th>
                <th className="px-4 py-3 font-medium">{catDict.table.name}</th>
                <th className="px-4 py-3 font-medium">{catDict.table.material}</th>
                <th className="px-4 py-3 font-medium">{catDict.table.specs}</th>
                <th className="px-4 py-3 font-medium">{catDict.table.salePrice}</th>
                <th className="px-4 py-3 font-medium">{catDict.table.netProfit}</th>
                <th className="px-4 py-3 font-medium text-right">{catDict.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {skus.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    {catDict.noProducts}
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
                    <td className="px-4 py-3">
                      {sku.image_url ? (
                        <div 
                          className="w-11 h-11 rounded-lg overflow-hidden border-2 border-muted cursor-pointer hover:ring-2 hover:ring-primary hover:border-primary transition-all flex-shrink-0"
                          onClick={() => setLightboxUrl(sku.image_url!)}
                        >
                          <img 
                            src={sku.image_url} 
                            alt={sku.name} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-muted/50 border-2 border-dashed flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground flex items-center gap-1.5">
                        {sku.name}
                        {sku.multicolor_weights?.length ? (
                          <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-sm border border-violet-200 flex items-center gap-0.5">
                            <Palette className="w-2.5 h-2.5" />
                            {sku.multicolor_weights.length} {dict.common.colors}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5" title={sku.id}>
                        ID: {sku.id.split('-')[0]}...
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                        {sku.filament_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{sku.weight_grams}g</div>
                      <div>{sku.print_time_hours}h</div>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatBRL(sku.sale_price)}
                    </td>
                    <td className="px-4 py-3">
                      <div className={cn("font-bold", isProfitable ? "text-green-600 dark:text-green-500" : "text-destructive")}>
                        {formatBRL(costResult.netProfit)}
                      </div>
                      <div className={cn("text-xs font-medium mt-0.5", isProfitable ? "text-green-600/80 dark:text-green-500/80" : "text-destructive/80")}>
                        {costResult.profitMarginPercentage.toFixed(1)}% {catDict.table.margin.toLowerCase()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => openEditModal(sku)}
                        className="text-muted-foreground hover:text-primary transition-colors p-2" 
                        title={dict.common.edit}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteSKU(sku.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-2" 
                        title={dict.common.delete}
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
          {/* Upload de Foto */}
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-primary" />
              {catDict.productPhoto}
            </label>
            <div className="flex items-center gap-4">
              {previewUrl ? (
                <div className="relative group">
                  <img src={previewUrl} alt="Preview" className="w-20 h-20 rounded-lg object-cover border shadow-sm" />
                  <button
                    type="button"
                    onClick={() => { setPreviewUrl(null); setImageFile(null); }}
                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground bg-muted/30">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}
              <label className="cursor-pointer flex items-center gap-2 px-3 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors">
                <Upload className="w-4 h-4" />
                {previewUrl ? catDict.changeImage : catDict.uploadImage}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      setPreviewUrl(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
            </div>
          </div>

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
              <label className="text-sm font-medium">{dict.forms.sku.printTime}</label>
              <input required defaultValue={editingSku?.print_time_hours || ''} name="printTime" type="number" step="0.1" min="0.1" className="w-full p-2 border rounded-md text-sm bg-background" placeholder="8.5" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{dict.forms.sku.salePrice}</label>
              <input required defaultValue={editingSku?.sale_price || ''} name="salePrice" type="number" step="0.01" min="1" className="w-full p-2 border rounded-md text-sm bg-background" placeholder="89.90" />
            </div>
          </div>

          {/* Toggle Multi-Cor */}
          <div className="border rounded-lg p-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isMulticolor}
                onChange={(e) => setIsMulticolor(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Palette className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-bold">{catDict.multicolor}</span>
            </label>

            {isMulticolor ? (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs text-muted-foreground">{catDict.multicolorTip}</p>
                {colorWeights.map((w, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground w-14">{catDict.colorLabel} {idx + 1}</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={w}
                      onChange={(e) => {
                        const newWeights = [...colorWeights];
                        newWeights[idx] = Number(e.target.value) || 0;
                        setColorWeights(newWeights);
                      }}
                      className="flex-1 p-2 border rounded-md text-sm bg-background"
                      placeholder="Peso (g)"
                    />
                    {colorWeights.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setColorWeights(colorWeights.filter((_, i) => i !== idx))}
                        className="text-destructive hover:text-destructive/80 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setColorWeights([...colorWeights, 0])}
                    className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> {catDict.addColor}
                  </button>
                  <span className="text-xs font-bold text-foreground">
                    {catDict.totalLabel}: {colorWeights.reduce((a, b) => a + b, 0)}g
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-2 border-t">
                <label className="text-sm font-medium">{dict.forms.sku.weight}</label>
                <input required defaultValue={editingSku?.weight_grams || ''} name="weight" type="number" step="1" min="1" className="w-full p-2 border rounded-md text-sm bg-background" placeholder="150" />
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
              {isSubmitting ? catDict.saving : dict.common.save}
            </button>
          </div>
        </form>
      </Modal>

      {/* Lightbox de Foto */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 cursor-pointer animate-in fade-in duration-200"
          onClick={() => setLightboxUrl(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={lightboxUrl} 
            alt={dict.common.product} 
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </PageLayout>
  );
}
