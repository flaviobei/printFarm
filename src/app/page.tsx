'use client';

import { useEffect, useState } from 'react';
import { useDictionary } from '@/lib/i18n';
import { api, Order, SKU, UserSettings } from '@/services/api';
import { calculatePrintCost, CostParameters } from '@/services/cost-calculator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { DollarSign, TrendingUp, Package, Printer, Database } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function Home() {
  const { dict: fullDict } = useDictionary();
  const dict = fullDict.home;
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const [fetchedOrders, fetchedSkus, fetchedSettings] = await Promise.all([
        api.getOrders(),
        api.getSKUs(),
        api.getUserSettings()
      ]);
      setOrders(fetchedOrders);
      setSkus(fetchedSkus);
      setSettings(fetchedSettings);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await api.seedDatabase(data.user.id);
      window.location.reload(); // Recarrega para buscar os novos dados
    }
    setIsSeeding(false);
  };

  // Se o BD estiver vazio, mostra a opção de Seed
  if (!isLoading && orders.length === 0 && skus.length === 0) {
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center text-center">
        <Database className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Banco de Dados Vazio</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          Parece que você acabou de configurar o Supabase. Deseja injetar os dados de demonstração (Dragão, Vaso, Pedidos e Estoque) para ver o sistema funcionando?
        </p>
        <button 
          onClick={handleSeedDatabase}
          disabled={isSeeding}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSeeding ? 'Injetando Dados...' : 'Popular Banco de Dados'}
        </button>
      </div>
    );
  }

  // Fallback seguro caso user_settings ainda não exista no DB
  const safeSettings = settings || {
    electricity_price_per_kwh: 0.85,
    printer_power_watts: 250,
    failure_rate_percentage: 5,
    marketplace_fee_percentage: 12
  };

  // KPIs Calculation
  let totalRevenue = 0;
  let totalProfit = 0;
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'printing').length;
  const activePrinters = 2; // Simulação fixa

  // Preparando os dados para o Gráfico
  const chartDataMap: Record<string, { name: string, revenue: number, profit: number }> = {};

  orders.forEach(order => {
    const sku = skus.find(s => s.id === order.sku_id);
    if (sku) {
      const params: CostParameters = {
        filamentPricePerKg: 120.00, // Custo do rolo será dinâmico depois
        printerPowerWatts: Number(safeSettings.printer_power_watts),
        electricityPricePerKwh: Number(safeSettings.electricity_price_per_kwh),
        failureRatePercentage: Number(safeSettings.failure_rate_percentage),
        packagingCost: 2.50,
        shippingCost: 0,
        marketplaceFeePercentage: Number(safeSettings.marketplace_fee_percentage),
        filamentWeightGrams: Number(sku.weight_grams),
        printTimeHours: Number(sku.print_time_hours),
        salePrice: Number(sku.sale_price),
      };
      const result = calculatePrintCost(params);
      
      totalRevenue += Number(sku.sale_price);
      totalProfit += result.netProfit;

      if (!chartDataMap[sku.id]) {
        chartDataMap[sku.id] = { name: sku.name, revenue: 0, profit: 0 };
      }
      chartDataMap[sku.id].revenue += Number(sku.sale_price);
      chartDataMap[sku.id].profit += result.netProfit;
    }
  });

  const chartData = Object.values(chartDataMap);

  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center h-full">Carregando dados...</div>;
  }

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
                formatter={(value: any) => formatBRL(Number(value))}
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
