'use client';

import { useEffect, useState } from 'react';
import { useDictionary } from '@/lib/i18n';
import { api, UserSettings } from '@/services/api';
import { Settings, Zap, Printer, AlertTriangle, Percent } from 'lucide-react';
import { toast } from 'sonner';

export default function ConfiguracoesPage() {
  const { dict } = useDictionary();
  const setDict = dict.settings;

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
    };

    try {
      const updated = await api.updateUserSettings(data);
      setSettings(updated);
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar as configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center h-full">Carregando configurações...</div>;
  }

  // Fallback defaults se não existir configuração salva
  const defaultValues = settings || {
    electricity_price_per_kwh: 0.85,
    printer_power_watts: 250,
    failure_rate_percentage: 5,
    marketplace_fee_percentage: 12
  };

  return (
    <div className="p-6 h-full flex flex-col max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{setDict.title}</h1>
          <p className="text-muted-foreground mt-1">{setDict.description}</p>
        </div>
      </div>

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

          <div className="pt-6 border-t flex justify-end">
            <button 
              type="submit"
              disabled={isSaving}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center"
            >
              {isSaving ? 'Salvando...' : dict.common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
