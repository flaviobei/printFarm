'use client';

import { useEffect, useState } from 'react';
import { useDictionary } from '@/lib/i18n';
import { api, SaaSPlan } from '@/services/api';
import { Check, Info, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function AssinaturaPage() {
  const { dict, locale } = useDictionary();
  const billDict = dict.billing;

  const [plans, setPlans] = useState<SaaSPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const fetchedPlans = await api.getAvailablePlans();
      setPlans(fetchedPlans);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleCheckout = (planId: string) => {
    setIsProcessing(planId);
    
    // Simula o redirecionamento para o Stripe / Processamento
    const promise = new Promise((resolve) => setTimeout(resolve, 2500));
    
    toast.promise(promise, {
      loading: 'Redirecionando para checkout seguro (Stripe)...',
      success: () => {
        setIsProcessing(null);
        return 'Mock: Redirecionamento completo! (Em produção, o usuário sairia da tela)';
      },
      error: () => {
        setIsProcessing(null);
        return 'Erro ao redirecionar.';
      },
    });
  };

  const handleContact = () => {
    window.location.href = "mailto:contato@printfarm.com?subject=Plano Enterprise";
  };

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center h-full">Carregando planos...</div>;
  }

  // Identifica o plano atual apenas por Mock (vamos fingir que o free é o atual)
  const currentPlanId = 'plan_free';

  return (
    <div className="p-8 h-full flex flex-col max-w-7xl mx-auto overflow-y-auto">
      <div className="text-center mb-12 mt-4">
        <h1 className="text-4xl font-extrabold tracking-tight mb-3">{billDict.title}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{billDict.description}</p>
        <div className="mt-4 inline-flex items-center space-x-2 bg-muted px-4 py-2 rounded-full text-sm font-medium">
          <span className="text-muted-foreground">{billDict.currentPlan}</span>
          <span className="text-primary font-bold">{(billDict.plans as any)[plans.find(p => p.id === currentPlanId)?.key || 'free']}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const price = locale === 'pt' ? plan.price_brl : plan.price_usd;
          const currencyStr = locale === 'pt' ? 'R$' : 'US$';
          
          return (
            <div 
              key={plan.id}
              className={cn(
                "relative flex flex-col p-6 rounded-2xl border bg-card text-card-foreground shadow-sm transition-all",
                plan.key === 'pro' && "border-primary shadow-md ring-1 ring-primary",
                isCurrent && "bg-muted/30"
              )}
            >
              {plan.key === 'pro' && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Mais Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold mb-2">{(billDict.plans as any)[plan.key]}</h3>
                <div className="flex items-baseline space-x-1">
                  {plan.is_contact ? (
                    <span className="text-3xl font-extrabold">Custom</span>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-muted-foreground">{currencyStr}</span>
                      <span className="text-4xl font-extrabold">{price.toFixed(2)}</span>
                      <span className="text-muted-foreground">{billDict.month}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-4 mb-8">
                {plan.features.map((featKey) => (
                  <div key={featKey} className="flex items-start space-x-3">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{(billDict.features as any)[featKey]}</span>
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                {plan.is_contact ? (
                  <button 
                    onClick={handleContact}
                    className="w-full flex items-center justify-center space-x-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-3 rounded-lg font-semibold transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{billDict.contactUs}</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => handleCheckout(plan.id)}
                    disabled={isCurrent || isProcessing !== null}
                    className={cn(
                      "w-full px-4 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50",
                      isCurrent ? "bg-muted text-muted-foreground cursor-not-allowed" : 
                      plan.key === 'pro' ? "bg-primary text-primary-foreground hover:bg-primary/90" : 
                      "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    {isProcessing === plan.id ? 'Processando...' : 
                     isCurrent ? 'Plano Atual' : 
                     plan.has_trial ? billDict.startTrial : billDict.upgrade}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
