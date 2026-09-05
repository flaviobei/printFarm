'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Shield, Search, MoreVertical, CheckCircle, AlertTriangle, XCircle, Gift, DollarSign, Users } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDictionary } from '@/lib/i18n';

type AdminUser = {
  id: string;
  email: string;
  name: string;
  plan: string;
  isCourtesy: boolean;
  trialEndsAt: string | null;
  revenue: number;
  subscribedAt: string;
};

export default function AdminPage() {
  const { dict } = useDictionary();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    const data = await api.getAdminUsers();
    setUsers(data);
    setIsLoading(false);
  }

  const openManageModal = (user: AdminUser) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const newPlan = formData.get('plan') as string;
    const isCourtesy = formData.get('isCourtesy') === 'true';
    const trialStatus = formData.get('trialStatus') as string;

    let newTrialEndsAt = editingUser.trialEndsAt;
    
    if (trialStatus === 'none') {
      newTrialEndsAt = null;
    } else if (trialStatus === 'extend') {
      newTrialEndsAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
    }

    try {
      await api.updateUserPlan(editingUser.id, {
        plan: newPlan,
        isCourtesy,
        trialEndsAt: newTrialEndsAt
      });
      toast.success(`Plano atualizado para ${editingUser.name}`);
      
      // Update local state optimistically
      setUsers(prev => prev.map(u => u.id === editingUser.id ? {
        ...u,
        plan: newPlan,
        isCourtesy,
        trialEndsAt: newTrialEndsAt,
      } : u));
      
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Erro ao atualizar plano.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = users.reduce((acc, curr) => acc + curr.revenue, 0);
  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center h-full">Carregando painel admin...</div>;
  }

  return (
    <div className="p-8 h-full flex flex-col max-w-7xl mx-auto">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 bg-red-100 text-red-600 rounded-lg">
          <Shield className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel Super Admin</h1>
          <p className="text-muted-foreground mt-1">Gerenciamento global de clientes e assinaturas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-card p-6 rounded-xl border shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-primary/10 text-primary rounded-full">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Lojas Ativas</p>
            <h2 className="text-2xl font-bold">{users.length}</h2>
          </div>
        </div>
        <div className="bg-card p-6 rounded-xl border shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">MRR Estimado</p>
            <h2 className="text-2xl font-bold text-green-600">{formatBRL(totalRevenue)}</h2>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-card rounded-xl border shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-muted/20">
          <h2 className="font-semibold text-lg">Lista de Clientes (Mock)</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-md text-sm bg-background"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Loja / Usuário</th>
                <th className="px-6 py-4 font-medium">Fidelidade</th>
                <th className="px-6 py-4 font-medium">Plano Atual</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredUsers.map((user) => {
                const isTrial = user.trialEndsAt && new Date(user.trialEndsAt) > new Date();
                const isExpired = user.trialEndsAt && new Date(user.trialEndsAt) <= new Date();

                // Lógica da Fidelidade
                const subDate = new Date(user.subscribedAt || Date.now());
                const monthsDiff = Math.max(0, (Date.now() - subDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
                // Define 1 ano (12 meses) como 100% da barra visual
                const progressPct = Math.min(100, (monthsDiff / 12) * 100);
                
                let loyaltyText = '';
                if (monthsDiff < 1) {
                  loyaltyText = 'Menos de 1 mês';
                } else if (monthsDiff < 12) {
                  loyaltyText = `${Math.floor(monthsDiff)} meses`;
                } else {
                  loyaltyText = `+${Math.floor(monthsDiff / 12)} ano(s)`;
                }

                return (
                  <tr key={user.id} className="odd:bg-background even:bg-muted/20 hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 w-48">
                      <div className="flex flex-col space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-muted-foreground">{loyaltyText}</span>
                          {progressPct === 100 && <span className="text-amber-500 font-bold">★</span>}
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              progressPct === 100 ? "bg-amber-500" : "bg-primary"
                            )}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="capitalize font-medium">{user.plan}</span>
                        {user.isCourtesy && (
                          <span className="flex items-center text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                            <Gift className="w-3 h-3 mr-1" /> Cortesia
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isExpired ? (
                        <span className="flex items-center text-red-600 font-medium">
                          <XCircle className="w-4 h-4 mr-1.5" /> Expirado
                        </span>
                      ) : isTrial ? (
                        <span className="flex items-center text-amber-600 font-medium">
                          <AlertTriangle className="w-4 h-4 mr-1.5" /> Trial até {new Date(user.trialEndsAt!).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="flex items-center text-green-600 font-medium">
                          <CheckCircle className="w-4 h-4 mr-1.5" /> Ativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openManageModal(user)}
                        className="text-primary hover:underline font-medium text-sm"
                      >
                        Gerenciar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Nenhum cliente encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title="Gerenciar Assinatura"
      >
        {editingUser && (
          <form onSubmit={handleSavePlan} className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{editingUser.name}</p>
                <p className="text-xs text-muted-foreground">{editingUser.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold block">Plano Atribuído</label>
              <select name="plan" defaultValue={editingUser.plan} className="w-full p-2.5 border rounded-md bg-background text-sm">
                <option value="free">Hobby (Gratuito)</option>
                <option value="basic">Básico</option>
                <option value="pro">Profissional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div className="space-y-3 p-4 border rounded-lg bg-card">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  name="isCourtesy" 
                  value="true"
                  defaultChecked={editingUser.isCourtesy} 
                  className="mt-1 w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                />
                <div>
                  <p className="text-sm font-bold flex items-center">
                    <Gift className="w-4 h-4 mr-1.5 text-purple-600" />
                    Cortesia Permanente
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se marcado, o usuário nunca será bloqueado nem cobrado pelo Stripe, independentemente do plano escolhido.
                  </p>
                </div>
              </label>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold block">Controle de Trial</label>
              <select name="trialStatus" defaultValue="keep" className="w-full p-2.5 border rounded-md bg-background text-sm">
                <option value="keep">Manter status atual</option>
                <option value="none">Sem Trial (Cobrança Ativa)</option>
                <option value="extend">Iniciar/Estender Trial (+15 dias)</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                {isSubmitting ? 'Aplicando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
