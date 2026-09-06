'use client';

import { useEffect, useState } from 'react';
import { useDictionary } from '@/lib/i18n';
import { api, Customer, Order } from '@/services/api';
import { Users, Store, User as UserIcon, Plus, Edit2, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageLayout } from '@/components/ui/PageLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/modal';

export default function ClientesPage() {
  const { dict } = useDictionary();
  const custDict = (dict as any).customers;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [fetchedCustomers, fetchedOrders] = await Promise.all([
        api.getCustomers(),
        api.getOrders() // Aqui poderíamos usar getDeliveredOrders também se quiséssemos o total geral de vendas finalizadas
      ]);
      setCustomers(fetchedCustomers);
      setOrders(fetchedOrders);
    } catch (error) {
      console.error(error);
      toast.error(dict.common?.loading || 'Erro ao carregar.');
    } finally {
      setIsLoading(false);
    }
  }

  const openCreateModal = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(dict.common?.deleteConfirm || 'Excluir cliente?')) return;
    try {
      await api.deleteCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      toast.success(custDict?.toast?.deleted || 'Removido!');
    } catch (error) {
      console.error(error);
      toast.error(custDict?.toast?.error || 'Erro ao deletar.');
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      address_line: formData.get('address') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zip_code: formData.get('zip') as string,
    };

    try {
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, data);
      } else {
        await api.createCustomer(data as Omit<Customer, 'id'|'created_at'|'user_id'>);
      }
      await loadData();
      setIsModalOpen(false);
      toast.success(custDict?.toast?.saved || 'Salvo com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error(custDict?.toast?.error || 'Erro ao salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalMarketplace = customers.filter(c => c.marketplace_source).length;
  const totalDirect = customers.length - totalMarketplace;

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex h-full items-center justify-center">
          <div className="text-muted-foreground">{dict.common?.loading || 'Carregando...'}</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader 
        title={custDict?.title || 'Clientes'}
        subtitle={custDict?.subtitle || 'Gerencie sua base de compradores'}
        icon={<Users className="w-8 h-8 mr-3 text-primary" />}
        action={
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{custDict?.addCustomer || 'Novo Cliente'}</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 rounded-2xl border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">{custDict?.kpis?.total || 'Total'}</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-bold">{customers.length}</div>
        </div>
        <div className="p-6 rounded-2xl border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">{custDict?.kpis?.marketplace || 'Marketplaces'}</span>
            <Store className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-3xl font-bold text-violet-600">{totalMarketplace}</div>
        </div>
        <div className="p-6 rounded-2xl border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">{custDict?.kpis?.direct || 'Diretos'}</span>
            <UserIcon className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-emerald-600">{totalDirect}</div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40">
              <tr>
                <th className="px-6 py-4 font-semibold">{custDict?.table?.name || 'Nome'}</th>
                <th className="px-6 py-4 font-semibold">{custDict?.table?.location || 'Localização'}</th>
                <th className="px-6 py-4 font-semibold">{custDict?.table?.source || 'Origem'}</th>
                <th className="px-6 py-4 font-semibold text-center">{custDict?.table?.orders || 'Pedidos'}</th>
                <th className="px-6 py-4 font-semibold text-right">{custDict?.table?.actions || 'Ações'}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhum cliente cadastrado.
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const customerOrders = orders.filter(o => o.customer_id === c.id || o.customer_name === c.name);
                  
                  return (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{c.name}</div>
                        <div className="flex flex-col gap-1 mt-1 text-xs text-muted-foreground">
                          {c.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3"/> {c.email}</div>}
                          {c.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3"/> {c.phone}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {c.city || c.state ? (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>{c.city} - {c.state}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50">Não informado</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {c.marketplace_source ? (
                          <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs font-bold rounded-full capitalize">
                            {c.marketplace_source}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                            Direto
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-lg">{customerOrders.length}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => openEditModal(c)}
                          className="p-2 text-muted-foreground hover:text-primary transition-colors"
                          title={dict.common?.edit || 'Editar'}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id)}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                          title={dict.common?.delete || 'Excluir'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? (dict.common?.edit || 'Editar') : (custDict?.addCustomer || 'Novo Cliente')}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{custDict?.form?.name || 'Nome'}</label>
            <input required defaultValue={editingCustomer?.name || ''} name="name" type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{custDict?.form?.email || 'E-mail'}</label>
              <input defaultValue={editingCustomer?.email || ''} name="email" type="email" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{custDict?.form?.phone || 'Telefone'}</label>
              <input defaultValue={editingCustomer?.phone || ''} name="phone" type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{custDict?.form?.address || 'Endereço (Rua, Número)'}</label>
            <input defaultValue={editingCustomer?.address_line || ''} name="address" type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{custDict?.form?.city || 'Cidade'}</label>
              <input defaultValue={editingCustomer?.city || ''} name="city" type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{custDict?.form?.state || 'Estado'}</label>
              <input defaultValue={editingCustomer?.state || ''} name="state" type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{custDict?.form?.zip || 'CEP'}</label>
              <input defaultValue={editingCustomer?.zip_code || ''} name="zip" type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-muted transition-colors"
            >
              {dict.common?.cancel || 'Cancelar'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {isSubmitting ? (dict.common?.loading || 'Salvando...') : (dict.common?.save || 'Salvar')}
            </button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
