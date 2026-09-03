'use client';

import { useState } from 'react';
import { getDictionary } from '@/lib/i18n';
import { mockInventory } from '@/services/db-mock';
import { AlertTriangle, CheckCircle, Edit2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EstoquePage() {
  const dict = getDictionary().estoque;
  const [inventory] = useState(mockInventory);

  const getStatus = (grams: number) => {
    if (grams <= 150) return { label: dict.status.critical, color: 'text-destructive', bg: 'bg-destructive/10', icon: AlertTriangle };
    if (grams <= 300) return { label: dict.status.low, color: 'text-amber-500', bg: 'bg-amber-500/10', icon: AlertTriangle };
    return { label: dict.status.ok, color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle };
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{dict.title}</h1>
          <p className="text-muted-foreground mt-1">{dict.description}</p>
        </div>
        <button className="flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4 mr-2" />
          Novo Rolo
        </button>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium">{dict.table.type}</th>
                <th className="px-6 py-3 font-medium">{dict.table.color}</th>
                <th className="px-6 py-3 font-medium">{dict.table.remaining}</th>
                <th className="px-6 py-3 font-medium">{dict.table.status}</th>
                <th className="px-6 py-3 font-medium text-right">{dict.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inventory.map((item) => {
                const status = getStatus(item.remainingGrams);
                // Exibe uma barra de progresso simples assumindo rolos padrão de 1000g
                const percentage = Math.min(Math.max((item.remainingGrams / 1000) * 100, 0), 100);

                return (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{item.type}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">ID: {item.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {/* Simula a cor, idealmente teríamos o HEX real no BD */}
                        <div 
                          className="w-4 h-4 rounded-full border shadow-sm"
                          style={{ backgroundColor: item.color === 'Preto' ? '#111' : '#DAA520' }}
                        />
                        <span>{item.color}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium mb-1">{item.remainingGrams}g</div>
                      <div className="w-full bg-secondary rounded-full h-1.5 max-w-[120px]">
                        <div 
                          className={cn("h-1.5 rounded-full", status.color.replace('text-', 'bg-'))}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold", status.bg, status.color)}>
                        <status.icon className="w-3 h-3 mr-1" />
                        {status.label}
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
