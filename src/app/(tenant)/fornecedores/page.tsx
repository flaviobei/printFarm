'use client';

import { useEffect, useState } from 'react';
import { api, Supplier } from '@/services/api';
import { Truck, Plus, Trash2, Edit2, Contact, Building } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { useDictionary } from '@/lib/i18n';
import { PageLayout } from '@/components/ui/PageLayout';
import { PageHeader } from '@/components/ui/PageHeader';

export default function FornecedoresPage() {
  const { dict } = useDictionary();
  const t = dict.suppliers;
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const data = await api.getSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error(error);
      toast.error(t?.toast?.error || 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }

  const handleOpenModal = (supplier?: Supplier) => {
    setEditingSupplier(supplier || null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(dict.common?.deleteConfirm || 'Tem certeza que deseja excluir?')) return;
    
    try {
      await api.deleteSupplier(id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
      toast.success(t?.toast?.deleted || 'Fornecedor removido com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error(t?.toast?.error || 'Erro ao remover fornecedor.');
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      company_name: formData.get('company_name') as string,
      cnpj: formData.get('cnpj') as string,
      contact_name: formData.get('contact_name') as string,
      contact_email: formData.get('contact_email') as string,
      contact_phone: formData.get('contact_phone') as string,
      payment_data: formData.get('payment_data') as string,
      notes: formData.get('notes') as string,
    };

    try {
      if (editingSupplier) {
        const updated = await api.updateSupplier(editingSupplier.id, data);
        setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? { ...s, ...updated } : s));
        toast.success(t?.toast?.updated || 'Fornecedor atualizado!');
      } else {
        const created = await api.createSupplier(data);
        setSuppliers(prev => [created as Supplier, ...prev]);
        toast.success(t?.toast?.created || 'Fornecedor criado!');
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(t?.toast?.error || 'Erro ao salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => {
    const searchLower = search.toLowerCase();
    return s.company_name.toLowerCase().includes(searchLower) || (s.cnpj && s.cnpj.toLowerCase().includes(searchLower));
  });

  return (
    <PageLayout>
      <PageHeader 
        title={t?.title || 'Fornecedores'}
        subtitle={t?.subtitle || 'Gerencie os fornecedores de filamentos e outros insumos.'}
        icon={<Truck className="w-8 h-8 mr-3 text-primary" />}
        action={
          <button 
            onClick={() => handleOpenModal()}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t?.addSupplier || 'Novo Fornecedor'}
          </button>
        }
      />

      <div className="bg-card rounded-lg border shadow-sm flex flex-col min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b flex items-center gap-4 bg-muted/20">
          <input
            type="text"
            placeholder={t?.searchPlaceholder || 'Buscar fornecedor por nome ou CNPJ...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b sticky top-0 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-medium">{t?.table?.company || 'Empresa'}</th>
                <th className="px-6 py-4 font-medium">{t?.table?.contact || 'Contato'}</th>
                <th className="px-6 py-4 font-medium text-right">{t?.table?.actions || 'Ações'}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="h-8 w-8 bg-muted rounded-full mb-4"></div>
                      <p>{t?.loading || 'Carregando fornecedores...'}</p>
                    </div>
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Building className="h-12 w-12 mb-4 opacity-20" />
                      <p className="text-lg font-medium text-slate-900">{t?.noSuppliersTitle || 'Nenhum fornecedor cadastrado'}</p>
                      <p className="text-sm">{t?.noSuppliersDesc || 'Você ainda não cadastrou nenhum fornecedor. Adicione o primeiro!'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-base">{supplier.company_name}</div>
                      {supplier.cnpj && <div className="text-xs font-mono text-muted-foreground mt-1">CNPJ: {supplier.cnpj}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-slate-700">
                        <Contact className="w-4 h-4 mr-2 text-slate-400" />
                        <span className="font-medium">{supplier.contact_name || 'N/A'}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 pl-6">
                        {supplier.contact_email && <div>{supplier.contact_email}</div>}
                        {supplier.contact_phone && <div>{supplier.contact_phone}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleOpenModal(supplier)}
                        className="p-2 text-slate-500 hover:text-primary transition-colors inline-flex"
                        title={dict.common?.edit || "Editar"}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(supplier.id)}
                        className="p-2 text-slate-500 hover:text-destructive transition-colors inline-flex ml-1"
                        title={dict.common?.delete || "Remover"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={editingSupplier ? (t?.form?.editTitle || 'Editar Fornecedor') : (t?.form?.createTitle || 'Cadastrar Fornecedor')}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1">{t?.form?.companyName || 'Nome da Empresa'}</label>
              <input required name="company_name" defaultValue={editingSupplier?.company_name} placeholder="Sermac3D, eSun Brasil..." className="w-full p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">{t?.form?.cnpj || 'CNPJ / Documento'}</label>
              <input name="cnpj" defaultValue={editingSupplier?.cnpj} placeholder="00.000.000/0001-00" className="w-full p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1">{t?.form?.contactName || 'Nome do Contato'}</label>
              <input name="contact_name" defaultValue={editingSupplier?.contact_name} placeholder="Carlos (Vendas)" className="w-full p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">{t?.form?.contactEmail || 'Email'}</label>
              <input type="email" name="contact_email" defaultValue={editingSupplier?.contact_email} placeholder="vendas@empresa.com" className="w-full p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1">{t?.form?.contactPhone || 'Telefone / Whats'}</label>
              <input name="contact_phone" defaultValue={editingSupplier?.contact_phone} placeholder="(11) 99999-9999" className="w-full p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold block mb-1">{t?.form?.paymentData || 'Dados Bancários / Pagamento'}</label>
            <textarea name="payment_data" defaultValue={editingSupplier?.payment_data} rows={2} placeholder="Pix: cnpj..., Faturamento 28d" className="w-full p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none"></textarea>
          </div>

          <div>
            <label className="text-sm font-bold block mb-1">{t?.form?.notes || 'Anotações (Opcional)'}</label>
            <textarea name="notes" defaultValue={editingSupplier?.notes} rows={2} placeholder="Apenas enviam acima de 10kg..." className="w-full p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none"></textarea>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
              {dict.common?.cancel || 'Cancelar'}
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50 hover:bg-primary/90 transition-colors">
              {isSubmitting ? (dict.common?.loading || 'Salvando...') : (dict.common?.save || 'Salvar')}
            </button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
