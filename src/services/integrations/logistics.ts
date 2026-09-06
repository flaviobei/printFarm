export interface ShippingQuote {
  serviceId: string;
  serviceName: string;
  price: number;
  deliveryDays: number;
}

export interface ILogisticsAdapter {
  id: string;
  name: string;
  calculateShipping(weight_grams: number, length_cm: number, width_cm: number, height_cm: number, destinationZip?: string): Promise<ShippingQuote[]>;
  generateLabel(orderId: string): Promise<{ trackingCode: string, labelUrl: string }>;
}

export class MockCorreiosAdapter implements ILogisticsAdapter {
  id = 'correios';
  name = 'Correios';

  async calculateShipping(weight_grams: number, length_cm: number, width_cm: number, height_cm: number, destinationZip?: string): Promise<ShippingQuote[]> {
    // Calculo basico de peso cubico (C x L x A / 6000) - padrao aereo BR, mas vamos usar para simulação
    const volumetricWeight = (length_cm * width_cm * height_cm) / 6000;
    const baseWeightKg = Math.max(weight_grams / 1000, volumetricWeight);
    
    const pacPrice = 15.0 + (baseWeightKg * 2.5);
    const sedexPrice = 25.0 + (baseWeightKg * 4.0);

    return [
      { serviceId: 'correios_pac', serviceName: 'Correios PAC', price: Number(pacPrice.toFixed(2)), deliveryDays: 7 },
      { serviceId: 'correios_sedex', serviceName: 'Correios SEDEX', price: Number(sedexPrice.toFixed(2)), deliveryDays: 2 }
    ];
  }

  async generateLabel(orderId: string): Promise<{ trackingCode: string; labelUrl: string; }> {
    return {
      trackingCode: `BR${Math.floor(Math.random() * 1000000000)}BR`,
      labelUrl: `https://mock.correios.com.br/label/${orderId}.pdf`
    };
  }
}

export class MockJadlogAdapter implements ILogisticsAdapter {
  id = 'jadlog';
  name = 'Jadlog';

  async calculateShipping(weight_grams: number, length_cm: number, width_cm: number, height_cm: number, destinationZip?: string): Promise<ShippingQuote[]> {
    const volumetricWeight = (length_cm * width_cm * height_cm) / 6000;
    const baseWeightKg = Math.max(weight_grams / 1000, volumetricWeight);
    
    const packagePrice = 18.0 + (baseWeightKg * 3.0);

    return [
      { serviceId: 'jadlog_package', serviceName: 'Jadlog Package', price: Number(packagePrice.toFixed(2)), deliveryDays: 4 },
    ];
  }

  async generateLabel(orderId: string): Promise<{ trackingCode: string; labelUrl: string; }> {
    return {
      trackingCode: `JL${Math.floor(Math.random() * 1000000000)}`,
      labelUrl: `https://mock.jadlog.com.br/label/${orderId}.pdf`
    };
  }
}

export function getActiveLogisticsAdapters(activeIds: string[] = []): ILogisticsAdapter[] {
  const all = [new MockCorreiosAdapter(), new MockJadlogAdapter()];
  if (!activeIds.length) return all; // se nada configurado, retorna todos para teste
  return all.filter(a => activeIds.includes(a.id));
}
