'use client';

import { useState } from 'react';
import { getDictionary } from '@/lib/i18n';
import { mockSKUs, SKU } from '@/services/db-mock';
import { calculatePrintCost, CostParameters } from '@/services/cost-calculator';
import { Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CatalogoPage() {
  const dict = getDictionary().catalogo;
  const [skus] = useState<SKU[]>(mockSKUs);

  // Parâmetros fixos para o MVP (no futuro virão da configuração do usuário)
  const defaultParams = {
    filamentPricePerKg: 120.00, // R$ 120 / kg
    printerPowerWatts: 250, // 250W
    electricityPricePerKwh: 0.85, // R$ 0.85 / kWh
    failureRatePercentage: 5, // 5% de falhas
    packagingCost: 2.50, // R$ 2.50 de caixa/plástico
    shippingCost: 0, // Assumindo que frete é pago pelo comprador ou embutido
    marketplaceFeePercentage: 12, // 12% do Mercado Livre
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{dict.title}</h1>
          <p className="text-muted-foreground mt-1">{dict.description}</p>
        </div>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium">{dict.table.name}</th>
                <th className="px-6 py-3 font-medium">{dict.table.material}</th>
                <th className="px-6 py-3 font-medium">{dict.table.specs}</th>
                <th className="px-6 py-3 font-medium">{dict.table.salePrice}</th>
                <th className="px-6 py-3 font-medium">{dict.table.netProfit}</th>
                <th className="px-6 py-3 font-medium text-right">{dict.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {skus.map((sku) => {
                // Prepara os parâmetros específicos do SKU
                const params: CostParameters = {
                  ...defaultParams,
                  filamentWeightGrams: sku.weightGrams,
                  printTimeHours: sku.printTimeHours,
                  salePrice: sku.salePrice,
                };
                
                // Calcula o custo e lucro real
                const costResult = calculatePrintCost(params);
                
                // Formatação
                const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
                const isProfitable = costResult.netProfit > 0;

                return (
                  <tr key={sku.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{sku.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">ID: {sku.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                        {sku.filamentType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div>{sku.weightGrams}g</div>
                      <div>{sku.printTimeHours}h</div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {formatBRL(sku.salePrice)}
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn("font-bold", isProfitable ? "text-green-600 dark:text-green-500" : "text-destructive")}>
                        {formatBRL(costResult.netProfit)}
                      </div>
                      <div className={cn("text-xs font-medium mt-0.5", isProfitable ? "text-green-600/80 dark:text-green-500/80" : "text-destructive/80")}>
                        {costResult.profitMarginPercentage.toFixed(1)}% {dict.table.margin.toLowerCase()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-muted-foreground hover:text-primary transition-colors p-2" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="text-muted-foreground hover:text-destructive transition-colors p-2" title="Remover">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
