'use client';
import { useEffect, useState } from 'react';
import { useDictionary } from '@/lib/i18n';
import { api, Inventory } from '@/services/api';
import { AlertTriangle, CheckCircle, Edit2, Plus, Trash2, Thermometer, Play, Pause, Layers, Copy, QrCode, Printer as PrinterIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';

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

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    const fetchedInventory = await api.getInventory();

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
      toast.success(newStatus === 'in_use' ? 'Carretel em uso!' : 'Carretel devolvido ao estoque!');
      await loadData();
    } catch (error) {
      toast.error('Erro ao atualizar status do carretel.');
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
    };

    try {
      if (editingItem) {
        await api.updateInventory(editingItem.id, inventoryData);
      } else {
        await api.createInventory(inventoryData);
      }
      await loadData();
      setIsModalOpen(false);
      toast.success('Carretel salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar rolo de filamento.');
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
      toast.error('Quantidade inválida (1-50).');
      setIsSubmitting(false);
      return;
    }

    const template = batchGroup.items[0];
    const dataList: Partial<Inventory>[] = Array(quantity).fill({
      material_type: template.material_type,
      brand: template.brand,
      color: template.color,
      color_hex: template.color_hex,
      initial_weight_grams: template.initial_weight_grams,
      remaining_grams: template.initial_weight_grams,
      temp_min: template.temp_min,
      temp_max: template.temp_max,
      status: 'available'
    });

    try {
      await api.createInventoryBatch(dataList);
      await loadData();
      setIsBatchModalOpen(false);
      toast.success(`${quantity} rolo(s) adicionado(s) com sucesso!`);
    } catch (error) {
      toast.error('Erro ao adicionar lote de rolos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInventory = async (id: string) => {
    if (!window.confirm(dict.common.deleteConfirm)) return;
    try {
      await api.deleteInventory(id);
      await loadData();
      toast.success('Carretel removido com sucesso!');
    } catch (error) {
      toast.error('Erro ao deletar rolo de filamento.');
    }
  };

  const getStatus = (item: Inventory) => {
    if (item.status === 'in_use') return { label: 'Em Uso', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Play };
    if (item.remaining_grams <= 150) return { label: estDict.status.critical, color: 'text-destructive', bg: 'bg-destructive/10', icon: AlertTriangle };
    if (item.remaining_grams <= 300) return { label: estDict.status.low, color: 'text-amber-500', bg: 'bg-amber-500/10', icon: AlertTriangle };
    return { label: estDict.status.ok, color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle };
  };

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center h-full">Carregando estoque...</div>;
  }

  return (
    <div className="p-6 h-full flex flex-col max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{estDict.title}</h1>
          <p className="text-muted-foreground mt-1">Gestão de Perfil de Materiais e Instâncias (Rolos)</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Perfil/Rolo
        </button>
      </div>

      <div className="space-y-4">
        {groups.length === 0 && (
          <div className="p-12 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-card">
            Nenhum perfil de material cadastrado no momento.
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
                      Total: {(group.totalGrams / 1000).toFixed(2)} kg
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                {/* Badges de Quantidade */}
                <div className="flex space-x-2">
                  <div className="text-center px-3 py-1 bg-background border rounded-md">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Lacrados</div>
                    <div className="font-bold text-green-600">{group.sealedCount}</div>
                  </div>
                  <div className="text-center px-3 py-1 bg-background border rounded-md">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Abertos</div>
                    <div className="font-bold text-amber-500">{group.openCount}</div>
                  </div>
                  <div className="text-center px-3 py-1 bg-background border rounded-md">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Em Uso</div>
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
                    + Lote
                  </button>
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="p-1.5 hover:bg-background rounded-md text-muted-foreground border border-transparent hover:border-border transition-colors"
                  >
                    {expandedGroups[group.key] ? 'Ocultar Rolos ▲' : 'Ver Rolos ▼'}
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
                      <th className="px-6 py-2 font-medium text-xs text-muted-foreground">ID do Rolo</th>
                      <th className="px-6 py-2 font-medium text-xs text-muted-foreground">Restante (Gasto)</th>
                      <th className="px-6 py-2 font-medium text-xs text-muted-foreground">Status Logístico</th>
                      <th className="px-6 py-2 font-medium text-xs text-muted-foreground text-right">Ações</th>
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
                              {isSealed && <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">LACRADO</span>}
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
                                title="Gerar Etiqueta QR"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => toggleStatus(item)}
                                className="p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors"
                                title={item.status === 'in_use' ? 'Devolver ao Estoque' : 'Colocar em Uso (Manual)'}
                              >
                                {item.status === 'in_use' ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-blue-500" />}
                              </button>
                              <button
                                onClick={() => openEditModal(item)}
                                className="p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors"
                                title="Editar Peso Manualmente"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteInventory(item.id)}
                                className="p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors"
                                title="Descartar Rolo"
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
      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={editingItem ? 'Editar Perfil / Rolo' : 'Criar Novo Perfil / Rolo'}>
        <form onSubmit={handleSaveInventory} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1">Material</label>
              <input required name="material_type" defaultValue={editingItem?.material_type} placeholder="PLA, PETG..." className="w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">Marca</label>
              <input required name="brand" defaultValue={editingItem?.brand} placeholder="eSun, Hatchbox..." className="w-full p-2 border rounded-md" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1">Nome da Cor</label>
              <input required name="color" defaultValue={editingItem?.color} placeholder="Vermelho Fogo" className="w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">Cor Visual (HEX)</label>
              <input type="color" required name="color_hex" defaultValue={editingItem?.color_hex || '#cccccc'} className="w-full h-10 p-1 border rounded-md cursor-pointer" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1">Peso Inicial (g)</label>
              <input required type="number" name="initial_weight_grams" defaultValue={editingItem?.initial_weight_grams || 1000} className="w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">Restante (g)</label>
              <input required type="number" name="remaining_grams" defaultValue={editingItem?.remaining_grams || 1000} className="w-full p-2 border rounded-md" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1">Temp. Mínima (°C)</label>
              <input required type="number" name="temp_min" defaultValue={editingItem?.temp_min || 190} className="w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">Temp. Máxima (°C)</label>
              <input required type="number" name="temp_max" defaultValue={editingItem?.temp_max || 220} className="w-full p-2 border rounded-md" />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold block mb-1">Status de Uso</label>
            <select name="status" defaultValue={editingItem?.status || 'available'} className="w-full p-2 border rounded-md">
              <option value="available">Disponível no Estoque</option>
              <option value="in_use">Em Uso (Checkout)</option>
            </select>
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
      <Modal isOpen={isBatchModalOpen} onClose={() => !isSubmitting && setIsBatchModalOpen(false)} title="Dar Entrada de Lote (Rolos Lacrados)">
        {batchGroup && (
          <form onSubmit={handleSaveBatch} className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-md mb-4 border">
              <p className="text-sm text-muted-foreground mb-2">Você está dando entrada no material:</p>
              <h3 className="font-bold text-lg">{batchGroup.brand} {batchGroup.material_type} - {batchGroup.color}</h3>
              <p className="text-xs font-medium mt-1">Peso Lacrado Padrão: {batchGroup.items[0]?.initial_weight_grams}g</p>
            </div>

            <div>
              <label className="text-sm font-bold block mb-2">Quantos rolos idênticos acabaram de chegar?</label>
              <input
                required
                type="number"
                name="quantity"
                min="1"
                max="50"
                defaultValue="5"
                className="w-full p-3 border rounded-md text-lg font-medium text-center"
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">Serão criadas instâncias independentes para rastreio exato.</p>
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-6 border-t">
              <button type="button" onClick={() => setIsBatchModalOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted">
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md disabled:opacity-50 hover:bg-green-700 flex items-center">
                <Copy className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Gerando Instâncias...' : 'Gerar Instâncias no Estoque'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal de Etiqueta QR Code */}
      <Modal isOpen={!!labelItem} onClose={() => setLabelItem(null)} title="Rastreio do Rolo (QR Code)">
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
                Fechar
              </button>
              <button onClick={printLabel} className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 flex items-center transition-colors">
                <PrinterIcon className="w-4 h-4 mr-2" />
                Imprimir Etiqueta
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}