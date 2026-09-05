'use client';

import { useEffect, useState } from 'react';
import { api, Printer } from '@/services/api';
import { Printer as PrinterIcon, Plus, Trash2, Edit2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { useDictionary } from '@/lib/i18n';

export default function ImpressorasPage() {
  const { dict } = useDictionary();
  const t = dict.impressoras;
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    const data = await api.getPrinters();
    setPrinters(data);
    setIsLoading(false);
  }

  const openAddModal = () => {
    setEditingPrinter(null);
    setIsModalOpen(true);
  };

  const openEditModal = (printer: Printer) => {
    setEditingPrinter(printer);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(dict.common.deleteConfirm)) return;
    try {
      await api.deletePrinter(id);
      setPrinters(prev => prev.filter(p => p.id !== id));
      toast.success(dict.toast.printerRemoved);
    } catch (error) {
      toast.error(dict.toast.printerRemoveError);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get('name') as string,
      brand: formData.get('brand') as string,
      model: formData.get('model') as string,
      power_watts: Number(formData.get('power_watts')),
      spool_capacity: Number(formData.get('spool_capacity')) || 1,
      status: formData.get('status') as string,
    };

    try {
      if (editingPrinter) {
        const updated = await api.updatePrinter(editingPrinter.id, payload);
        setPrinters(prev => prev.map(p => p.id === editingPrinter.id ? updated : p));
        toast.success(dict.toast.printerUpdated);
      } else {
        const added = await api.addPrinter(payload);
        setPrinters(prev => [added, ...prev]);
        toast.success(dict.toast.printerAdded);
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error(dict.toast.printerSaveError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-8 flex justify-center">{t.loading}</div>;

  return (
    <div className="p-6 h-full flex flex-col max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-muted-foreground mt-1">{t.description}</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> {t.newPrinter}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {printers.map((printer) => (
          <div key={printer.id} className="bg-card border rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <PrinterIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
                    {printer.name}
                    {printer.spool_capacity > 1 && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-sm border border-indigo-200">
                        AMS/MMU ({printer.spool_capacity} {dict.common.colors})
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground">{printer.brand} • {printer.model}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEditModal(printer)} className="text-muted-foreground hover:text-primary transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(printer.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm mt-auto border-t pt-4">
              <div className="flex items-center text-muted-foreground">
                <Zap className="w-4 h-4 mr-1 text-amber-500" />
                {printer.power_watts}W
              </div>
              <div className="flex items-center">
                <span className={`w-2 h-2 rounded-full mr-2 ${printer.status === 'printing' ? 'bg-amber-500 animate-pulse' : printer.status === 'maintenance' ? 'bg-red-500' : 'bg-green-500'}`} />
                <span className="capitalize font-medium text-xs">
                  {(t.statusLabel as any)[printer.status] || printer.status}
                </span>
              </div>
            </div>
          </div>
        ))}
        {printers.length === 0 && (
          <div className="col-span-full p-12 text-center border-2 border-dashed rounded-xl text-muted-foreground">
            <PrinterIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t.noPrinters}</p>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={editingPrinter ? dict.common.edit : t.newPrinter}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-bold block mb-1">{t.form.nickname}</label>
            <input required name="name" defaultValue={editingPrinter?.name} placeholder="Ex: Ender 1 - Preta" className="w-full p-2 border rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1">{t.form.brand}</label>
              <input required name="brand" defaultValue={editingPrinter?.brand} placeholder="Ex: Creality" className="w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">{t.form.model}</label>
              <input required name="model" defaultValue={editingPrinter?.model} placeholder="Ex: Ender 3 V2" className="w-full p-2 border rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1">{t.form.watts}</label>
              <input required type="number" name="power_watts" defaultValue={editingPrinter?.power_watts || 350} className="w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1" title={t.form.spoolCapacityTooltip}>{t.form.spoolCapacity}</label>
              <input required type="number" name="spool_capacity" min={1} max={16} defaultValue={editingPrinter?.spool_capacity || 1} className="w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">{t.form.currentStatus}</label>
              <select required name="status" defaultValue={editingPrinter?.status || 'idle'} className="w-full p-2 border rounded-md">
                <option value="idle">{t.status.idle}</option>
                <option value="printing">{t.status.printing}</option>
                <option value="maintenance">{t.status.maintenance}</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t mt-6">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-md">{dict.common.cancel}</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50">
              {isSubmitting ? dict.catalogo.saving : dict.common.save}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
