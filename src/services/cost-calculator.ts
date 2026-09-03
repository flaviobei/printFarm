export interface CostParameters {
  filamentWeightGrams: number;
  filamentPricePerKg: number;
  printTimeHours: number;
  printerPowerWatts: number;
  electricityPricePerKwh: number;
  failureRatePercentage: number;
  packagingCost: number;
  shippingCost: number;
  marketplaceFeePercentage: number;
  salePrice: number;
}

export interface CostCalculationResult {
  filamentCost: number;
  electricityCost: number;
  failureCost: number;
  productionCost: number;
  marketplaceFee: number;
  totalCost: number;
  netProfit: number;
  profitMarginPercentage: number;
}

/**
 * Calcula os custos detalhados e a margem real de uma impressão 3D.
 */
export function calculatePrintCost(params: CostParameters): CostCalculationResult {
  // Custo do material (ex: 1kg = 1000g)
  const filamentCost = (params.filamentWeightGrams / 1000) * params.filamentPricePerKg;
  
  // Custo de energia (Watts -> kWh * tempo * tarifa)
  const electricityCost = (params.printerPowerWatts / 1000) * params.printTimeHours * params.electricityPricePerKwh;
  
  // Custo base de produção
  const baseCost = filamentCost + electricityCost;
  
  // Amortização de falhas (se falha 10% das vezes, adicionamos 10% ao custo material/energia)
  const failureCost = baseCost * (params.failureRatePercentage / 100);
  
  // Custo total de produção (antes das taxas logísticas e do marketplace)
  const productionCost = baseCost + failureCost + params.packagingCost;
  
  // Taxa do marketplace baseada no preço de venda
  const marketplaceFee = params.salePrice * (params.marketplaceFeePercentage / 100);
  
  // Custo total contabilizando todas as variáveis
  const totalCost = productionCost + marketplaceFee + params.shippingCost;
  
  // Lucro Líquido Real
  const netProfit = params.salePrice - totalCost;
  
  // Margem de lucro (%)
  const profitMarginPercentage = (netProfit / params.salePrice) * 100;
  
  return {
    filamentCost,
    electricityCost,
    failureCost,
    productionCost,
    marketplaceFee,
    totalCost,
    netProfit,
    profitMarginPercentage
  };
}
