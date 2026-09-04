'use client';

import { getDictionary } from '@/lib/i18n';
import { mockOrders, mockSKUs } from '@/services/db-mock';
import { calculatePrintCost } from '@/services/cost-calculator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { DollarSign, TrendingUp, Package, Printer } from 'lucide-react';

export default function Home() {
  const dict = getDictionary().home;

  // Parâmetros fixos para o MVP
  const defaultParams = {
    filamentPricePerKg: 120.00,
    printerPowerWatts: 250,
    electricityPricePerKwh: 0.85,
    failureRatePercentage: 5,
    packagingCost: 2.50,
    shippingCost: 0,
    marketplaceFeePercentage: 12,
  };

  // KPIs Calculation
  let totalRevenue = 0;
  let totalProfit = 0;
  const pendingOrders = mockOrders.filter(o => o.status === 'pending' || o.status === 'printing').length;
  const activePrinters = 2; // Simulação fixa

  // Preparando os dados para o Gráfico
  const chartDataMap: Record<string, { name: string, revenue: number, profit: number }> = {};

  mockOrders.forEach(order => {
    const sku = mockSKUs.find(s => s.id === order.skuId);
    if (sku) {
      const params = {
        ...defaultParams,
        filamentWeightGrams: sku.weightGrams,
        printTimeHours: sku.printTimeHours,
        salePrice: sku.salePrice,
      };
      const result = calculatePrintCost(params);
      
      totalRevenue += sku.salePrice;
      totalProfit += result.netProfit;

      if (!chartDataMap[sku.id]) {
        chartDataMap[sku.id] = { name: sku.name, revenue: 0, profit: 0 };
      }
      chartDataMap[sku.id].revenue += sku.salePrice;
      chartDataMap[sku.id].profit += result.netProfit;
    }
  });

  const chartData = Object.values(chartDataMap);

  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="p-8 flex flex-col gap-8 h-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{dict.title}</h1>
        <p className="text-muted-foreground mt-1">{dict.description}</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{dict.kpis.revenue}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBRL(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">+20.1% em relação ao mês passado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{dict.kpis.profit}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-500">{formatBRL(totalProfit)}</div>
            <p className="text-xs text-muted-foreground">Lucro real descontando custos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{dict.kpis.pendingOrders}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Requerem produção imediata</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{dict.kpis.activePrinters}</CardTitle>
            <Printer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePrinters}</div>
            <p className="text-xs text-muted-foreground">1 parada para manutenção</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <Card className="flex-1 w-full overflow-hidden">
        <CardHeader>
          <CardTitle>{dict.charts.chartTitle}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div style={{ minWidth: 600 }}>
            <BarChart width={800} height={350} data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value}`} />
              <Tooltip 
                formatter={(value: number) => formatBRL(value)}
                cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
              />
              <Legend />
              <Bar dataKey="revenue" name={dict.charts.revenueLabel} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name={dict.charts.profitLabel} fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
