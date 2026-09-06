'use client';
import { useEffect, useState } from 'react';
import { useDictionary } from '@/lib/i18n';
import { api, Inventory, Supplier } from '@/services/api';
import { AlertTriangle, CheckCircle, Edit2, Plus, Trash2, Thermometer, Play, Pause, Layers, Copy, QrCode, Printer as PrinterIcon, Info, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
import { PageLayout } from '@/components/ui/PageLayout';
import { PageHeader } from '@/components/ui/PageHeader';

// Estrutura de Agrupamento
type InventoryGroup = {
  key: string;
  material_type: string;
  brand: string;
  color: string;
  color_hex: string;
  temp_min: number;
  temp_max: number;
  items: Inventory[];
  totalGrams: number;
  sealedCount: number;
  openCount: number;
  inUseCount: number;
};

export default function EstoquePage() {
  const { dict } = useDictionary();
  const estDict = dict.estoque;
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [groups, setGroups] = useState<InventoryGroup[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lote Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchGroup, setBatchGroup] = useState<InventoryGroup | null>(null);

  // Etiqueta Modal State
  const [labelItem, setLabelItem] = useState<Inventory | null>(null);

  // Discard Modal State
  const [discardItem, setDiscardItem] = useState<Inventory | null>(null);
  const [warrantyInfo, setWarrantyInfo] = useState<{ supplier: Supplier, inventory: Inventory } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    const [fetchedInventory, fetchedSuppliers] = await Promise.all([
      api.getInventory(),
      api.getSuppliers()
    ]);
    setSuppliers(fetchedSuppliers);

    // Process Grouping
    const grouped = fetchedInventory.reduce((acc, item) => {
      const key = `${item.brand}-${item.material_type}-${item.color_hex}`;
      if (!acc[key]) {
        acc[key] = {
          key,
          material_type: item.material_type,
          brand: item.brand,
          color: item.color,
          color_hex: item.color_hex,
          temp_min: item.temp_min,
          temp_max: item.temp_max,
          items: [],
          totalGrams: 0,
          sealedCount: 0,
          openCount: 0,
          inUseCount: 0,
        };
      }

      acc[key].items.push(item);
      acc[key].totalGrams += Number(item.remaining_grams);

      if (item.status === 'in_use') {
        acc[key].inUseCount++;
      } else if (Number(item.remaining_grams) >= Number(item.initial_weight_grams)) {
        acc[key].sealedCount++;
      } else if (Number(item.remaining_grams) > 0) {
        acc[key].openCount++;
      }
      return acc;
    }, {} as Record<string, InventoryGroup>);

    setGroups(Object.values(grouped));
    setInventory(fetchedInventory);
    setIsLoading(false);
  }

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Inventory) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const openBatchModal = (group: InventoryGroup) => {
    setBatchGroup(group);
    setIsBatchModalOpen(true);
  };

  const openLabelModal = (item: Inventory) => {
    setLabelItem(item);
  };

  const printLabel = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !labelItem) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Etiqueta ${labelItem.id.split('-')[0]}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; padding: 20px; color: #0f172a; }
            .label { border: 4px solid #0f172a; border-radius: 0.75rem; padding: 1.5rem; background: #fff; width: 18rem; box-sizing: border-box; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 1rem; }
            .brand { font-weight: 900; font-size: 1.5rem; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; }
            .material { font-weight: 700; font-size: 1.125rem; margin: 0.25rem 0 0 0; }
            .qr-container { display: flex; justify-content: center; margin-bottom: 1rem; }
            .qr-container img { border-radius: 0.375rem; border: 1px solid #e2e8f0; padding: 0.25rem; width: 180px; height: 180px; }
            .details { text-align: center; margin: 0; }
            .color-row { font-weight: 700; display: flex; justify-content: center; align-items: center; margin: 0 0 0.5rem 0; font-size: 1rem; }
            .color-dot { width: 1rem; height: 1rem; border-radius: 9999px; border: 1px solid #cbd5e1; margin-right: 0.5rem; }
            .temp { font-size: 0.875rem; font-weight: 500; background-color: #f1f5f9; border-radius: 0.25rem; padding: 0.25rem 0.5rem; margin: 0.5rem 1rem; display: inline-block; }
            .id-text { font-size: 0.625rem; font-family: monospace; color: #64748b; margin-top: 0.75rem; word-break: break-all; }
            @page { margin: 0; }
            @media print {
              body { padding: 0; display: block; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .label { margin: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="header">
              <h2 class="brand">${labelItem.brand}</h2>
              <h3 class="material">${labelItem.material_type}</h3>
            </div>
            <div class="qr-container">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${labelItem.id}" alt="QR Code" onload="window.print(); window.close();" />
            </div>
            <div class="details">
              <p class="color-row">
                <span class="color-dot" style="background-color: ${labelItem.color_hex}"></span>
                ${labelItem.color}
              </p>
              <div class="temp">${labelItem.temp_min}°C - ${labelItem.temp_max}°C</div>
              <div class="id-text">ID: ${labelItem.id}</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const toggleStatus = async (item: Inventory) => {
    try {
      const newStatus = item.status === 'in_use' ? 'available' : 'in_use';
      await api.updateInventory(item.id, { status: newStatus });
      toast.success(newStatus === 'in_use' ? dict?.toast?.rollInUse || 'Carretel em uso!' : dict?.toast?.rollReturned || 'Carretel devolvido ao estoque!');
      await loadData();
    } catch (error) {
      toast.error(dict?.toast?.rollStatusError || 'Erro ao atualizar status do carretel.');
    }
  };

  const handleSaveInventory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const inventoryData: Partial<Inventory> = {
      material_type: formData.get('material_type') as string,
      brand: formData.get('brand') as string,
      color: formData.get('color') as string,
      color_hex: formData.get('color_hex') as string,
      initial_weight_grams: Number(formData.get('initial_weight_grams')),
      remaining_grams: Number(formData.get('remaining_grams')),
      temp_min: Number(formData.get('temp_min')),
      temp_max: Number(formData.get('temp_max')),
      status: formData.get('status') as string,
      cost: Number(formData.get('cost')) || 0,
      supplier_id: (formData.get('supplier_id') as string) || null,
      invoice_number: (formData.get('invoice_number') as string) || null,
      entry_date: (formData.get('entry_date') as string) || undefined,
    };

    try {
      if (editingItem) {
        await api.updateInventory(editingItem.id, inventoryData);
      } else {
        await api.createInventory(inventoryData);
      }
      await loadData();
      setIsModalOpen(false);
      toast.success(dict?.toast?.rollSaved || 'Carretel salvo com sucesso!');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(`${dict?.toast?.rollSaveError || 'Erro ao salvar rolo'}: ${error?.message || 'Desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveBatch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!batchGroup || batchGroup.items.length === 0) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const quantity = Number(formData.get('quantity'));

    if (quantity <= 0 || quantity > 50) {
      toast.error(dict?.toast?.invalidQuantity || 'Quantidade inválida (1-50).');
      setIsSubmitting(false);
      return;
    }

    const cost = Number(formData.get('cost')) || 0;
    const supplier_id = (formData.get('supplier_id') as string) || null;
    const invoice_number = (formData.get('invoice_number') as string) || null;
    const entry_date = (formData.get('entry_date') as string) || undefined;

    const newItems: Partial<Inventory>[] = Array.from({ length: quantity }).map(() => ({
      material_type: batchGroup.material_type,
      brand: batchGroup.brand,
      color: batchGroup.color,
      color_hex: batchGroup.color_hex,
      initial_weight_grams: Number(batchGroup.items[0]?.initial_weight_grams || 1000),
      remaining_grams: Number(batchGroup.items[0]?.initial_weight_grams || 1000),
      temp_min: batchGroup.temp_min,
      temp_max: batchGroup.temp_max,
      status: 'available',
      cost,
      supplier_id,
      invoice_number,
      entry_date
    }));

    try {
      await api.createInventoryBatch(newItems);
      await loadData();
      setIsBatchModalOpen(false);
      toast.success(`${quantity} ${dict?.toast?.batchAdded || 'rolo(s) adicionado(s) com sucesso!'}`);
    } catch (error: any) {
      console.error('Batch save error:', error);
      toast.error(`${dict?.toast?.batchSaveError || 'Erro ao adicionar lote'}: ${error?.message || 'Desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInventory = async (id: string) => {
    if (!confirm(dict.common?.deleteConfirm || 'Tem certeza que deseja excluir permanentemente este rolo?')) return;
    try {
      await api.deleteInventory(id);
      await loadData();
      toast.success(dict?.toast?.rollDeleted || 'Operação realizada com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error(dict?.toast?.rollDeleteError || 'Erro ao deletar rolo.');
    }
  };

  const handleDiscardSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!discardItem) return;
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const reason = formData.get('reason') as string;
    const quantity = Number(formData.get('quantity'));
    const triggerWarranty = formData.get('triggerWarranty') === 'true';

    try {
      // Deduz a quantidade do estoque
      const newRemaining = Math.max(0, discardItem.remaining_grams - quantity);
      
      await api.updateInventory(discardItem.id, {
        remaining_grams: newRemaining,
        status: newRemaining === 0 ? 'discarded' : discardItem.status,
        discard_reason: reason,
        warranty_triggered: triggerWarranty
      });
      
      // Opcional: logar na tabela de log (descarte)
      await api.logMaterialUsage({
        inventory_id: discardItem.id,
        weight_used: 0,
        weight_wasted: quantity,
        type: 'failure'
      });

      await loadData();
      toast.success(dict?.toast?.discarded || 'Descarte registrado com sucesso!');
      
      if (triggerWarranty && discardItem.supplier_id) {
        const sup = suppliers.find(s => s.id === discardItem.supplier_id);
        if (sup) {
          setWarrantyInfo({ supplier: sup, inventory: discardItem });
        }
      }
      setDiscardItem(null);
    } catch (error) {
      console.error(error);
      toast.error(dict?.toast?.completionError || 'Erro ao registrar descarte.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatus = (item: Inventory) => {
    if (item.status === 'in_use') return { label: estDict?.inUse || 'Em Uso', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Play };
    if (item.remaining_grams <= 150) return { label: estDict.status.critical, color: 'text-destructive', bg: 'bg-destructive/10', icon: AlertTriangle };
    if (item.remaining_grams <= 300) return { label: estDict.status.low, color: 'text-amber-500', bg: 'bg-amber-500/10', icon: AlertTriangle };
    return { label: estDict.status.ok, color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle };
  };

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center h-full">{estDict?.loading || 'Carregando estoque...'}</div>;
  }

  return (
    <PageLayout>
      <PageHeader 
        title={estDict.title}
        subtitle={estDict?.subtitle || 'Gestão de Perfil de Materiais e Instâncias (Rolos)'}
        icon={<Package className="w-8 h-8 mr-3 text-primary" />}
        action={
          <button
            onClick={openCreateModal}
            className="flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            {estDict?.newProfile || 'Novo Perfil/Rolo'}
          </button>
        }
      />

      <div className="space-y-4">
        {groups.length === 0 && (
          <div className="p-12 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-card">
            {estDict?.noProfiles || 'Nenhum perfil de material cadastrado no momento.'}
          </div>
        )}

        {groups.map((group) => (
          <div key={group.key} className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            {/* Header do Perfil de Material (Resumo) */}
            <div className="bg-muted/30 p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div
                className="flex items-center space-x-4 cursor-pointer flex-1"
                onClick={() => toggleGroup(group.key)}
              >
                <div
                  className="w-12 h-12 rounded-full border-2 border-gray-300 shadow-sm flex-shrink-0"
                  style={{ backgroundColor: group.color_hex || '#cccccc' }}
                />
                <div>
                  <h3 className="font-bold text-lg flex items-center">
                    {group.brand} {group.material_type}
                    <span className="ml-2 text-sm font-normal text-muted-foreground border px-2 py-0.5 rounded-full bg-background">
                      {group.color}
                    </span>
                  </h3>
                  <div className="flex space-x-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center">
                      <Thermometer className="w-3.5 h-3.5 mr-1" />
                      {group.temp_min}°C - {group.temp_max}°C
                    </span>
                    <span className="flex items-center font-medium text-foreground">
                      {estDict?.total || 'Total:'} {(group.totalGrams / 1000).toFixed(2)} kg
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                {/* Badges de Quantidade */}
                <div className="flex space-x-2">
                  <div className="text-center px-3 py-1 bg-background border rounded-md">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">{estDict?.sealed || 'Lacrados'}</div>
                    <div className="font-bold text-green-600">{group.sealedCount}</div>
                  </div>
                  <div className="text-center px-3 py-1 bg-background border rounded-md">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">{estDict?.open || 'Abertos'}</div>
                    <div className="font-bold text-amber-500">{group.openCount}</div>
                  </div>
                  <div className="text-center px-3 py-1 bg-background border rounded-md">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">{estDict?.inUse || 'Em Uso'}</div>
                    <div className="font-bold text-blue-500">{group.inUseCount}</div>
                  </div>
                </div>

                {/* Botões do Perfil */}
                <div className="flex space-x-2 border-l pl-6">
                  <button
                    onClick={() => openBatchModal(group)}
                    className="flex items-center bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border"
                  >
                    <Layers className="w-4 h-4 mr-1.5" />
                    {estDict?.addBatch || '+ Lote'}
                  </button>
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="p-1.5 hover:bg-background rounded-md text-muted-foreground border border-transparent hover:border-border transition-colors"
                  >
                    {expandedGroups[group.key] ? estDict?.hideRolls || 'Ocultar Rolos ▲' : estDict?.showRolls || 'Ver Rolos ▼'}
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de Instâncias (Rolos Individuais) */}
            {expandedGroups[group.key] && (
              <div className="border-t bg-background">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/10 border-b">
                    <tr>
                      <th className="px-6 py-2 font-medium text-xs text-muted-foreground">{estDict?.table?.rollId || 'ID do Rolo'}</th>
                      <th className="px-6 py-2 font-medium text-xs text-muted-foreground">{estDict?.table?.remainingGas || 'Restante (Gasto)'}</th>
                      <th className="px-6 py-2 font-medium text-xs text-muted-foreground">{estDict?.table?.logistics || 'Status Logístico'}</th>
                      <th className="px-6 py-2 font-medium text-xs text-muted-foreground text-right">{estDict?.table?.actions || 'Ações'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {group.items.map((item) => {
                      const status = getStatus(item);
                      const initial = item.initial_weight_grams || 1000;
                      const percentage = Math.min(Math.max((Number(item.remaining_grams) / initial) * 100, 0), 100);
                      const isSealed = Number(item.remaining_grams) >= initial;

                      return (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                            {item.id.split('-')[0]}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center space-x-4">
                              <div className="font-medium min-w-[50px]">{item.remaining_grams}g</div>
                              <div className="flex-1 max-w-[200px]">
                                <div className="w-full bg-secondary rounded-full h-2 shadow-inner overflow-hidden border border-gray-200">
                                  <div
                                    className="h-full"
                                    style={{ width: `${percentage}%`, backgroundColor: item.color_hex || '#cccccc' }}
                                  ></div>
                                </div>
                              </div>
                              {isSealed && <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">{estDict?.table?.sealedBadge || 'LACRADO'}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase", status.bg, status.color)}>
                              <status.icon className="w-3 h-3 mr-1" />
                              {status.label}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => openLabelModal(item)}
                                className="p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors"
                                title={estDict?.actions?.qr || 'Gerar Etiqueta QR'}
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => toggleStatus(item)}
                                className="p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors"
                                title={item.status === 'in_use' ? estDict?.actions?.returnToStock || 'Devolver ao Estoque' : estDict?.actions?.putInUse || 'Colocar em Uso (Manual)'}
                              >
                                {item.status === 'in_use' ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-blue-500" />}
                              </button>
                              <button
                                onClick={() => openEditModal(item)}
                                className="p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors"
                                title={estDict?.actions?.editWeight || 'Editar Peso Manualmente'}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDiscardItem(item)}
                                className="p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors"
                                title={estDict?.actions?.discard || 'Descartar Rolo'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal Genérico */}
      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={editingItem ? estDict?.form?.editProfile || 'Editar Perfil / Rolo' : estDict?.form?.createProfile || 'Criar Novo Perfil / Rolo'}>
        <form onSubmit={handleSaveInventory} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1">{estDict?.form?.material || 'Material'}</label>
              <input required name="material_type" defaultValue={editingItem?.material_type} placeholder="PLA, PETG..." className="w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">{estDict?.form?.brand || 'Marca'}</label>
              <input required name="brand" defaultValue={editingItem?.brand} placeholder="eSun, Hatchbox..." className="w-full p-2 border rounded-md" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1">{estDict?.form?.colorName || 'Nome da Cor'}</label>
              <input required name="color" defaultValue={editingItem?.color} placeholder="Vermelho Fogo" className="w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">{estDict?.form?.colorHex || 'Cor Visual (HEX)'}</label>
              <input type="color" required name="color_hex" defaultValue={editingItem?.color_hex || '#cccccc'} className="w-full h-10 p-1 border rounded-md cursor-pointer" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1">{estDict?.form?.initialWeight || 'Peso Inicial (g)'}</label>
              <input required type="number" name="initial_weight_grams" defaultValue={editingItem?.initial_weight_grams || 1000} className="w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">{estDict?.form?.remainingWeight || 'Restante (g)'}</label>
              <input required type="number" name="remaining_grams" defaultValue={editingItem?.remaining_grams || 1000} className="w-full p-2 border rounded-md" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1">{estDict?.form?.tempMin || 'Temp. Mínima (°C)'}</label>
              <input required type="number" name="temp_min" defaultValue={editingItem?.temp_min || 190} className="w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">{estDict?.form?.tempMax || 'Temp. Máxima (°C)'}</label>
              <input required type="number" name="temp_max" defaultValue={editingItem?.temp_max || 220} className="w-full p-2 border rounded-md" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1">Status de Uso</label>
              <select name="status" defaultValue={editingItem?.status || 'available'} className="w-full p-2 border rounded-md">
                <option value="available">Disponível no Estoque</option>
                <option value="in_use">Em Uso (Checkout)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">{estDict?.form?.supplier || 'Fornecedor (Opcional)'}</label>
              <select name="supplier_id" defaultValue={editingItem?.supplier_id || ''} className="w-full p-2 border rounded-md">
                <option value="">{estDict?.form?.noSupplier || 'Nenhum fornecedor cadastrado'}</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1">{estDict?.form?.invoiceNumber || 'Nota Fiscal'}</label>
              <input type="text" name="invoice_number" defaultValue={editingItem?.invoice_number} placeholder="NF-e..." className="w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">{estDict?.form?.entryDate || 'Data de Entrada'}</label>
              <input type="date" name="entry_date" defaultValue={editingItem?.entry_date ? new Date(editingItem.entry_date).toISOString().split('T')[0] : ''} className="w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">{estDict?.form?.cost || 'Custo Unitário (R$)'}</label>
              <input type="number" step="0.01" name="cost" defaultValue={editingItem?.cost} placeholder="Ex: 89.90" className="w-full p-2 border rounded-md" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 mt-6 border-t">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted">
              {dict.common.cancel}
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50 hover:bg-primary/90">
              {isSubmitting ? dict.common.loading : dict.common.save}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Entrada em Lote */}
      <Modal isOpen={isBatchModalOpen} onClose={() => !isSubmitting && setIsBatchModalOpen(false)} title={estDict?.batch?.title || 'Dar Entrada de Lote (Rolos Lacrados)'}>
        {batchGroup && (
          <form onSubmit={handleSaveBatch} className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-md mb-4 border">
              <p className="text-sm text-muted-foreground mb-2">Você está dando entrada no material:</p>
              <h3 className="font-bold text-lg">{batchGroup.brand} {batchGroup.material_type} - {batchGroup.color}</h3>
              <p className="text-xs font-medium mt-1">Peso Lacrado Padrão: {batchGroup.items[0]?.initial_weight_grams}g</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold block mb-2">Quantos rolos idênticos chegaram?</label>
                <input
                  required
                  type="number"
                  name="quantity"
                  min="1"
                  max="50"
                  defaultValue="5"
                  className="w-full p-3 border rounded-md text-lg font-medium text-center bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-bold block mb-2">{estDict?.batch?.supplier || 'Fornecedor'}</label>
                <select name="supplier_id" className="w-full p-3 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="">{estDict?.form?.noSupplier || 'Selecione...'}</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-bold block mb-1">{estDict?.batch?.invoiceNumber || 'Nota Fiscal (NF)'}</label>
                <input type="text" name="invoice_number" placeholder="Opcional..." className="w-full p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-sm font-bold block mb-1">{estDict?.batch?.entryDate || 'Data da Compra'}</label>
                <input type="date" name="entry_date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-sm font-bold block mb-1">{estDict?.batch?.cost || 'Custo por Rolo (R$)'}</label>
                <input type="number" step="0.01" name="cost" placeholder="Ex: 89.90" className="w-full p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-6 border-t">
              <button type="button" onClick={() => setIsBatchModalOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted">
                {estDict?.batch?.cancel || 'Cancelar'}
              </button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md disabled:opacity-50 hover:bg-green-700 flex items-center">
                <Copy className="w-4 h-4 mr-2" />
                {isSubmitting ? estDict?.batch?.generating || 'Gerando Instâncias...' : estDict?.batch?.generate || 'Gerar Instâncias no Estoque'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal de Etiqueta QR Code */}
      <Modal isOpen={!!labelItem} onClose={() => setLabelItem(null)} title={estDict?.qr?.title || 'Rastreio do Rolo (QR Code)'}>
        {labelItem && (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="border-4 border-slate-900 rounded-xl p-6 bg-white w-72 shadow-lg mb-6 text-slate-900">
              <div className="text-center border-b-2 border-slate-200 pb-4 mb-4">
                <h2 className="font-black text-2xl uppercase tracking-widest">{labelItem.brand}</h2>
                <h3 className="font-bold text-lg">{labelItem.material_type}</h3>
              </div>

              <div className="flex justify-center mb-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${labelItem.id}`}
                  alt="QR Code"
                  className="rounded-md border p-1"
                />
              </div>

              <div className="text-center space-y-1">
                <p className="font-bold flex justify-center items-center">
                  <div className="w-4 h-4 rounded-full border border-slate-300 mr-2" style={{ backgroundColor: labelItem.color_hex }} />
                  {labelItem.color}
                </p>
                <p className="text-sm font-medium bg-slate-100 rounded px-2 py-1 mx-4">
                  {labelItem.temp_min}°C - {labelItem.temp_max}°C
                </p>
                <p className="text-[10px] font-mono text-slate-500 pt-2 break-all">ID: {labelItem.id}</p>
              </div>
            </div>

            <div className="flex justify-center w-full gap-3">
              <button onClick={() => setLabelItem(null)} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors">
                {estDict?.qr?.close || 'Fechar'}
              </button>
              <button onClick={printLabel} className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 flex items-center transition-colors">
                <PrinterIcon className="w-4 h-4 mr-2" />
                {estDict?.qr?.print || 'Imprimir Etiqueta'}
              </button>
            </div>
          </div>
        )}
      </Modal>
      {/* Modal de Descarte */}
      <Modal isOpen={!!discardItem} onClose={() => !isSubmitting && setDiscardItem(null)} title={estDict?.discard?.title || 'Descartar Rolo / Defeito'}>
        {discardItem && (
          <form onSubmit={handleDiscardSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">{estDict?.discard?.desc || 'Informe os detalhes do problema para o registro.'}</p>
            
            <div className="bg-muted/30 p-3 rounded-md border flex items-center mb-4">
              <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: discardItem.color_hex }}></div>
              <span className="font-bold mr-2">{discardItem.brand} {discardItem.material_type}</span>
              <span className="text-sm text-muted-foreground">- {discardItem.color}</span>
            </div>

            <div>
              <label className="text-sm font-bold block mb-1">{estDict?.discard?.reason || 'Motivo do Descarte'}</label>
              <select name="reason" required className="w-full p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                <option value="">Selecione...</option>
                <option value="moisture">{estDict?.discard?.reasons?.moisture || 'Umidade Excessiva'}</option>
                <option value="brittle">{estDict?.discard?.reasons?.brittle || 'Quebradiço / Ressecado'}</option>
                <option value="inconsistent">{estDict?.discard?.reasons?.inconsistent || 'Inconsistência de Diâmetro'}</option>
                <option value="tangled">{estDict?.discard?.reasons?.tangled || 'Nó no Rolo (Emaranhado)'}</option>
                <option value="other">{estDict?.discard?.reasons?.other || 'Outro'}</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-bold block mb-1">{estDict?.discard?.quantity || 'Quantidade Descartada (g)'}</label>
              <input type="number" name="quantity" required max={discardItem.remaining_grams} min="1" defaultValue={discardItem.remaining_grams} className="w-full p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none" />
              <p className="text-xs text-muted-foreground mt-1">O rolo tem {discardItem.remaining_grams}g restantes. Você pode descartar parcialmente.</p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input type="checkbox" id="triggerWarranty" name="triggerWarranty" value="true" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
              <label htmlFor="triggerWarranty" className="text-sm font-bold text-slate-700 cursor-pointer">
                {estDict?.discard?.triggerWarranty || 'Acionar Garantia (Exibir dados do Fornecedor)'}
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-6 border-t">
              <button type="button" onClick={() => setDiscardItem(null)} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
                {dict.common?.cancel || 'Cancelar'}
              </button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md disabled:opacity-50 hover:bg-red-700 transition-colors">
                {isSubmitting ? dict.common?.loading || 'Processando...' : estDict?.discard?.confirm || 'Confirmar Descarte'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Alerta de Garantia (Supplier Info) */}
      <Modal isOpen={!!warrantyInfo} onClose={() => setWarrantyInfo(null)} title={estDict?.discard?.warrantyTitle || 'Dados para Acionar Garantia'}>
        {warrantyInfo && (
          <div className="space-y-4">
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-md">
              <div className="flex">
                <AlertTriangle className="h-6 w-6 text-amber-500 mr-3" />
                <div>
                  <h3 className="text-amber-800 font-bold">{warrantyInfo.supplier.company_name}</h3>
                  <p className="text-sm text-amber-700 mt-1">{estDict?.discard?.warrantyDesc || 'Use os dados abaixo para contatar o fornecedor sobre o lote defeituoso.'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-md p-4 space-y-3">
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase">{estDict?.discard?.warrantyEmail || 'Email'}</span>
                <p className="font-medium">{warrantyInfo.supplier.contact_email || 'Não informado'}</p>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase">{estDict?.discard?.warrantyPhone || 'Telefone'}</span>
                <p className="font-medium">{warrantyInfo.supplier.contact_phone || 'Não informado'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-2">
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase">{estDict?.discard?.warrantyInvoice || 'Nota Fiscal'}</span>
                  <p className="font-mono">{warrantyInfo.inventory.invoice_number || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase">{estDict?.discard?.warrantyEntry || 'Data da Compra'}</span>
                  <p className="font-mono">{warrantyInfo.inventory.entry_date ? new Date(warrantyInfo.inventory.entry_date).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button onClick={() => setWarrantyInfo(null)} className="px-6 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-colors">
                {estDict?.discard?.warrantyClose || 'Entendido, fechar'}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </PageLayout>
  );
}