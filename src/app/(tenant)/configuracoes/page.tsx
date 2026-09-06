'use client';

import { useEffect, useState } from 'react';
import { useDictionary } from '@/lib/i18n';
import { api, UserSettings } from '@/services/api';
import { Settings as SettingsIcon, Zap, Printer, AlertTriangle, Percent, Plug, Truck, Store, Database, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageLayout } from '@/components/ui/PageLayout';
import { PageHeader } from '@/components/ui/PageHeader';

export default function ConfiguracoesPage() {
  const { dict } = useDictionary();
  const setDict = dict.settings;
  const intDict = (dict as any).integrations;

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const fetchedSettings = await api.getUserSettings();
      setSettings(fetchedSettings);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      electricity_price_per_kwh: Number(formData.get('electricity')),
      printer_power_watts: Number(formData.get('power')),
      failure_rate_percentage: Number(formData.get('failure')),
      marketplace_fee_percentage: Number(formData.get('fee')),
      active_marketplaces: formData.getAll('marketplaces') as string[],
      active_logistics: formData.getAll('logistics') as string[],
    };

    try {
      const updated = await api.updateUserSettings(data);
      setSettings(updated);
      toast.success(dict?.toast?.settingsSaved || 'Configurações salvas com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error(dict?.toast?.settingsError || 'Erro ao salvar as configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearTable = async (table: string, label: string) => {
    if (!confirm(`Tem certeza que deseja apagar TODOS os dados de: ${label}? Essa ação é IRREVERSÍVEL.`)) return;
    try {
       await api.clearDatabaseTable(table);
       toast.success(`${label} apagado com sucesso!`);
    } catch (e) {
       toast.error(`Erro ao apagar ${label}.`);
    }
  };

  const handleHardReset = async () => {
    if (!confirm('ATENÇÃO: Você está prestes a ZERAR TODO O BANCO DE DADOS. Pedidos, financeiro, estoque, catálogo e configurações serão perdidos. Tem certeza absoluta?')) return;
    try {
      await api.clearDatabaseTable('transactions');
      await api.clearDatabaseTable('material_logs');
      await api.clearDatabaseTable('finished_goods');
      await api.clearDatabaseTable('print_jobs');
      await api.clearDatabaseTable('orders');
      await api.clearDatabaseTable('inventory');
      await api.clearDatabaseTable('suppliers');
      await api.clearDatabaseTable('skus');
      await api.clearDatabaseTable('printers');
      toast.success('Hard Reset concluído! O sistema está zerado.');
    } catch (e: any) {
      toast.error(`Erro ao realizar Hard Reset: ${e.message}`);
    }
  };

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center h-full">{setDict?.loading || 'Carregando configurações...'}</div>;
  }

  // Fallback defaults se não existir configuração salva
  const defaultValues = settings || {
    electricity_price_per_kwh: 0.85,
    printer_power_watts: 250,
    failure_rate_percentage: 5,
    marketplace_fee_percentage: 12,
    active_marketplaces: [] as string[],
    active_logistics: [] as string[]
  };

  return (
    <PageLayout>
      <PageHeader 
        title={setDict.title}
        subtitle={setDict.description}
        icon={<SettingsIcon className="w-8 h-8 mr-3 text-primary" />}
      />

      <div className="rounded-md border bg-card text-card-foreground shadow-sm">
        <form onSubmit={handleSave} className="p-6 space-y-8">
          
          <div className="grid gap-6 md:grid-cols-2">
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-primary">
                <Zap className="w-5 h-5" />
                <h3 className="font-semibold text-lg">{setDict.energy.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{setDict.energy.desc}</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                <input 
                  required 
                  name="electricity" 
                  type="number" 
                  step="0.01"
                  min="0"
                  defaultValue={defaultValues.electricity_price_per_kwh} 
                  className="w-full pl-9 p-2 border rounded-md text-sm bg-background focus:ring-2 focus:ring-primary focus:outline-none" 
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-primary">
                <Printer className="w-5 h-5" />
                <h3 className="font-semibold text-lg">{setDict.power.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{setDict.power.desc}</p>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">W</span>
                <input 
                  required 
                  name="power" 
                  type="number" 
                  step="1"
                  min="1"
                  defaultValue={defaultValues.printer_power_watts} 
                  className="w-full pr-9 p-2 border rounded-md text-sm bg-background focus:ring-2 focus:ring-primary focus:outline-none" 
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-primary">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-semibold text-lg">{setDict.failure.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{setDict.failure.desc}</p>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                <input 
                  required 
                  name="failure" 
                  type="number" 
                  step="0.1"
                  min="0"
                  max="100"
                  defaultValue={defaultValues.failure_rate_percentage} 
                  className="w-full pr-9 p-2 border rounded-md text-sm bg-background focus:ring-2 focus:ring-primary focus:outline-none" 
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-primary">
                <Percent className="w-5 h-5" />
                <h3 className="font-semibold text-lg">{setDict.fee.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{setDict.fee.desc}</p>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                <input 
                  required 
                  name="fee" 
                  type="number" 
                  step="0.1"
                  min="0"
                  max="100"
                  defaultValue={defaultValues.marketplace_fee_percentage} 
                  className="w-full pr-9 p-2 border rounded-md text-sm bg-background focus:ring-2 focus:ring-primary focus:outline-none" 
                />
              </div>
            </div>

          </div>

          {/* Integrações */}
          <div className="pt-6 border-t space-y-6">
            <div>
              <div className="flex items-center space-x-2 text-primary mb-1">
                <Plug className="w-5 h-5" />
                <h3 className="font-semibold text-lg">{intDict?.title || 'Integrações e Módulos'}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{intDict?.desc || 'Ative ou desative serviços.'}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 font-medium text-sm">
                  <Store className="w-4 h-4 text-muted-foreground" />
                  <span>{intDict?.marketplaces || 'Marketplaces Ativos'}</span>
                </div>
                <div className="flex flex-col space-y-3">
                  {['mercadolivre', 'shopee', 'amazon', 'aliexpress'].map((mk) => (
                    <label key={mk} className="flex items-center space-x-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="marketplaces" 
                        value={mk} 
                        defaultChecked={defaultValues.active_marketplaces?.includes(mk)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm capitalize">{mk === 'mercadolivre' ? 'Mercado Livre' : mk}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2 font-medium text-sm">
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  <span>{intDict?.logistics || 'Logística (Transportadoras)'}</span>
                </div>
                <div className="flex flex-col space-y-3">
                  {['correios', 'jadlog', 'loggi'].map((log) => (
                    <label key={log} className="flex items-center space-x-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="logistics" 
                        value={log} 
                        defaultChecked={defaultValues.active_logistics?.includes(log)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm capitalize">{log}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t flex justify-end">
            <button 
              type="submit"
              disabled={isSaving}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center"
            >
              {isSaving ? dict?.common?.loading || 'Salvando...' : dict?.common?.save}
            </button>
          </div>
        </form>

        {/* Seção de Limpeza de Banco de Dados */}
        <div className="mt-10 p-6 border border-red-200 bg-red-50/50 rounded-lg space-y-6">
          <div>
            <div className="flex items-center space-x-2 text-red-600 mb-1">
              <Database className="w-5 h-5" />
              <h3 className="font-semibold text-lg">Manutenção do Sistema (Dev)</h3>
            </div>
            <p className="text-sm text-red-600/80">Cuidado! As ações abaixo irão remover dados permanentemente do seu banco de dados.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <button onClick={() => handleClearTable('printers', 'Impressoras')} className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-md hover:bg-red-50 text-red-700 text-sm font-medium transition-colors">
              Impressoras <Trash2 className="w-4 h-4 ml-2" />
            </button>
            <button onClick={() => handleClearTable('suppliers', 'Fornecedores')} className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-md hover:bg-red-50 text-red-700 text-sm font-medium transition-colors">
              Fornecedores <Trash2 className="w-4 h-4 ml-2" />
            </button>
            <button onClick={() => handleClearTable('skus', 'Catálogo (SKUs)')} className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-md hover:bg-red-50 text-red-700 text-sm font-medium transition-colors">
              Catálogo <Trash2 className="w-4 h-4 ml-2" />
            </button>
            <button onClick={() => handleClearTable('inventory', 'Materiais (Estoque)')} className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-md hover:bg-red-50 text-red-700 text-sm font-medium transition-colors">
              Materiais Insumos <Trash2 className="w-4 h-4 ml-2" />
            </button>
            <button onClick={() => handleClearTable('finished_goods', 'Estoque Peças Prontas')} className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-md hover:bg-red-50 text-red-700 text-sm font-medium transition-colors">
              Peças Prontas <Trash2 className="w-4 h-4 ml-2" />
            </button>
            <button onClick={() => handleClearTable('orders', 'Pedidos e Vendas')} className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-md hover:bg-red-50 text-red-700 text-sm font-medium transition-colors">
              Pedidos e Vendas <Trash2 className="w-4 h-4 ml-2" />
            </button>
            <button onClick={() => handleClearTable('print_jobs', 'Tarefas de Impressão')} className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-md hover:bg-red-50 text-red-700 text-sm font-medium transition-colors">
              Tarefas Impressão <Trash2 className="w-4 h-4 ml-2" />
            </button>
            <button onClick={() => handleClearTable('transactions', 'Financeiro')} className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-md hover:bg-red-50 text-red-700 text-sm font-medium transition-colors">
              Financeiro <Trash2 className="w-4 h-4 ml-2" />
            </button>
          </div>

          <div className="pt-4 border-t border-red-200">
            <button onClick={handleHardReset} className="w-full flex items-center justify-center p-3 bg-red-600 text-white rounded-md hover:bg-red-700 font-bold transition-colors">
              <AlertTriangle className="w-5 h-5 mr-2" />
              ZERAR TUDO (Hard Reset)
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
