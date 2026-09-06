'use client';

import { useEffect, useState } from 'react';
import { useDictionary } from '@/lib/i18n';
import { api, Transaction, Order, SKU } from '@/services/api';
import { CircleDollarSign, TrendingUp, TrendingDown, Plus, Trash2, Calendar, FileText, List as ListIcon, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageLayout } from '@/components/ui/PageLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/modal';

export default function FinanceiroPage() {
  const { dict } = useDictionary();
  const finDict = (dict as any).finance;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [tData, oData, sData, itemsData] = await Promise.all([
        api.getTransactions(),
        api.getDeliveredOrders(),
        api.getSKUs(),
        api.getAllOrderItems()
      ]);

      // Conversão de Pedidos Entregues para Receitas
      const orderTransactions: Transaction[] = oData.map(order => {
        const items = itemsData.filter(i => i.order_id === order.id);
        const totalAmount = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
        const productNames = items.map(i => sData.find(s => s.id === i.sku_id)?.name || '?').join(', ');
        return {
          id: `order_${order.id}`,
          user_id: order.user_id,
          type: 'income',
          category: 'Venda',
          description: `Pedido: ${productNames} - Cliente: ${order.customer_name}`,
          amount: totalAmount,
          date: order.created_at.split('T')[0],
          related_entity_id: order.id,
          created_at: order.created_at
        };
      });

      const combined = [...tData, ...orderTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(combined);
    } catch (error) {
      console.error(error);
      toast.error(dict.common?.loading || 'Erro ao carregar dados financeiros');
    } finally {
      setIsLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (id.startsWith('order_')) {
      toast.error('Não é possível excluir receitas automáticas de vendas por aqui. Exclua o pedido no Kanban.');
      return;
    }

    if (!confirm(dict.common?.deleteConfirm || 'Tem certeza que deseja excluir este lançamento?')) return;
    
    try {
      await api.deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast.success(finDict?.toast?.deleted || 'Excluído com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error(finDict?.toast?.error || 'Erro ao excluir.');
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as 'income' | 'expense';
    const amount = Number(formData.get('amount'));
    const date = formData.get('date') as string;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;

    try {
      await api.createTransaction({
        type,
        amount,
        date,
        category,
        description
      });
      await loadData();
      setIsModalOpen(false);
      toast.success(finDict?.toast?.saved || 'Salvo com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error(finDict?.toast?.error || 'Erro ao salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredData = transactions.filter(t => {
    if (filter === 'income') return t.type === 'income';
    if (filter === 'expense') return t.type === 'expense';
    return true;
  });

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

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
        title={finDict?.title || 'Financeiro'}
        subtitle={finDict?.subtitle || 'Acompanhe as receitas e despesas'}
        icon={<CircleDollarSign className="w-8 h-8 mr-3 text-primary" />}
        action={
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{finDict?.addTransaction || 'Novo Lançamento'}</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 rounded-2xl border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">{finDict?.kpis?.totalIncome || 'Receitas'}</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-emerald-600">R$ {totalIncome.toFixed(2)}</div>
        </div>

        <div className="p-6 rounded-2xl border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">{finDict?.kpis?.totalExpense || 'Despesas'}</span>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-red-600">R$ {totalExpense.toFixed(2)}</div>
        </div>

        <div className={cn("p-6 rounded-2xl border shadow-sm", netBalance >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100")}>
          <div className="flex items-center justify-between mb-2">
            <span className={cn("text-sm font-medium", netBalance >= 0 ? "text-emerald-700" : "text-red-700")}>
              {finDict?.kpis?.netBalance || 'Saldo Líquido'}
            </span>
            <Wallet className={cn("w-4 h-4", netBalance >= 0 ? "text-emerald-600" : "text-red-600")} />
          </div>
          <div className={cn("text-3xl font-bold", netBalance >= 0 ? "text-emerald-700" : "text-red-700")}>
            R$ {netBalance.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center p-4 border-b gap-2 bg-muted/20">
          <button onClick={() => setFilter('all')} className={cn("px-4 py-2 text-sm font-medium rounded-md transition-colors", filter === 'all' ? "bg-primary text-primary-foreground shadow" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
            {finDict?.filters?.all || 'Todos'}
          </button>
          <button onClick={() => setFilter('income')} className={cn("px-4 py-2 text-sm font-medium rounded-md transition-colors", filter === 'income' ? "bg-emerald-500 text-white shadow" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
            {finDict?.filters?.income || 'Entradas'}
          </button>
          <button onClick={() => setFilter('expense')} className={cn("px-4 py-2 text-sm font-medium rounded-md transition-colors", filter === 'expense' ? "bg-red-500 text-white shadow" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
            {finDict?.filters?.expense || 'Saídas'}
          </button>
        </div>

        <div className="overflow-x-auto flex-1">
          {filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <CircleDollarSign className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold">{finDict?.noTransactionsTitle || 'Nenhum lançamento'}</h3>
              <p className="text-muted-foreground max-w-sm mt-1">{finDict?.noTransactionsDesc}</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/40">
                <tr>
                  <th className="px-6 py-4 font-semibold">{finDict?.table?.date || 'Data'}</th>
                  <th className="px-6 py-4 font-semibold">{finDict?.table?.description || 'Descrição'}</th>
                  <th className="px-6 py-4 font-semibold">{finDict?.table?.category || 'Categoria'}</th>
                  <th className="px-6 py-4 font-semibold text-right">{finDict?.table?.amount || 'Valor'}</th>
                  <th className="px-6 py-4 font-semibold text-center w-24">{finDict?.table?.actions || 'Ações'}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredData.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="font-medium">{t.description}</span>
                        {t.id.startsWith('order_') && (
                          <span className="ml-2 px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-full font-bold uppercase">Automático</span>
                        )}
                        {t.category.includes('Estoque') && (
                          <span className="ml-2 px-2 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full font-bold uppercase">Automático</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-muted-foreground">
                        <ListIcon className="w-4 h-4 mr-2" />
                        {t.category}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={cn("font-bold", t.type === 'income' ? 'text-emerald-600' : 'text-red-600')}>
                        {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {!t.id.startsWith('order_') && !t.category.includes('Estoque') && (
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={dict.common?.delete || 'Excluir'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={finDict?.addTransaction || 'Nova Movimentação'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{finDict?.form?.type || 'Tipo'}</label>
              <select 
                name="type" 
                required 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="expense">{finDict?.types?.expense || 'Saída (Despesa)'}</option>
                <option value="income">{finDict?.types?.income || 'Entrada (Receita)'}</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">{finDict?.form?.date || 'Data'}</label>
              <input
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{finDict?.form?.amount || 'Valor (R$)'}</label>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{finDict?.form?.category || 'Categoria'}</label>
            <input
              name="category"
              type="text"
              required
              placeholder="Ex: Luz, Internet, Manutenção"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{finDict?.form?.description || 'Descrição'}</label>
            <input
              name="description"
              type="text"
              required
              placeholder="Ex: Conta de energia ref. Julho"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
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
              className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (dict.common?.loading || 'Salvando...') : (dict.common?.save || 'Salvar')}
            </button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  );
}
