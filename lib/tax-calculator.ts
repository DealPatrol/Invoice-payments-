// Advanced Tax Calculator

export interface TaxRateData {
  country: string;
  standardRate: number;
  reducedRates?: { [key: string]: number };
  description: string;
}

// Comprehensive global tax rates by country
export const GLOBAL_TAX_RATES: Record<string, TaxRateData> = {
  'United States': {
    country: 'United States',
    standardRate: 0.07,
    reducedRates: {
      'New York': 0.08,
      'California': 0.0725,
      'Texas': 0.0625,
      'Florida': 0.06,
    },
    description: 'Sales Tax varies by state',
  },
  'United Kingdom': {
    country: 'United Kingdom',
    standardRate: 0.2,
    reducedRates: { 'Reduced Rate': 0.05, 'Zero Rate': 0 },
    description: 'VAT - Standard rate 20%',
  },
  Germany: {
    country: 'Germany',
    standardRate: 0.19,
    reducedRates: { 'Reduced Rate': 0.07 },
    description: 'MwSt - Standard rate 19%',
  },
  France: {
    country: 'France',
    standardRate: 0.2,
    reducedRates: { 'Reduced Rate': 0.055, 'Super Reduced': 0.021 },
    description: 'TVA - Standard rate 20%',
  },
  Canada: {
    country: 'Canada',
    standardRate: 0.05,
    reducedRates: { 'GST + PST': 0.13, 'HST': 0.15 },
    description: 'GST/PST/HST varies by province',
  },
  Australia: {
    country: 'Australia',
    standardRate: 0.1,
    description: 'GST - 10% standard rate',
  },
  Japan: {
    country: 'Japan',
    standardRate: 0.1,
    reducedRates: { 'Reduced Rate': 0.08 },
    description: 'Consumption Tax',
  },
  Brazil: {
    country: 'Brazil',
    standardRate: 0.15,
    description: 'ICMS - Standard rate 15%',
  },
  India: {
    country: 'India',
    standardRate: 0.18,
    reducedRates: { '5% Rate': 0.05, '12% Rate': 0.12 },
    description: 'GST - Standard rate 18%',
  },
  Mexico: {
    country: 'Mexico',
    standardRate: 0.16,
    description: 'IVA - 16%',
  },
};

export interface TaxBreakdown {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  effectiveRate: number;
}

/**
 * Calculate tax on an invoice amount
 */
export function calculateTax(subtotal: number, taxRate: number): TaxBreakdown {
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;
  const effectiveRate = (taxAmount / total) * 100;

  return {
    subtotal,
    taxRate,
    taxAmount,
    total,
    effectiveRate,
  };
}

/**
 * Get recommended tax rate for a country
 */
export function getTaxRateForCountry(country: string): number {
  return GLOBAL_TAX_RATES[country]?.standardRate || 0.1;
}

/**
 * Get all available tax options for a country
 */
export function getTaxOptionsForCountry(country: string): { label: string; rate: number }[] {
  const countryData = GLOBAL_TAX_RATES[country];
  if (!countryData) return [{ label: 'Standard', rate: 0.1 }];

  const options: { label: string; rate: number }[] = [
    {
      label: `Standard (${(countryData.standardRate * 100).toFixed(1)}%)`,
      rate: countryData.standardRate,
    },
  ];

  if (countryData.reducedRates) {
    Object.entries(countryData.reducedRates).forEach(([label, rate]) => {
      options.push({
        label: `${label} (${(rate * 100).toFixed(1)}%)`,
        rate,
      });
    });
  }

  return options;
}

/**
 * Calculate invoice total including optional fees and discounts
 */
export function calculateInvoiceTotal(
  subtotal: number,
  taxRate: number,
  options?: {
    discount?: number; // percentage (0-100)
    discountType?: 'percentage' | 'fixed'; // default: percentage
    fee?: number; // fixed amount or percentage
    feeType?: 'percentage' | 'fixed'; // default: fixed
  }
): {
  subtotal: number;
  discount: number;
  subtotalAfterDiscount: number;
  tax: number;
  fee: number;
  total: number;
} {
  let workingSubtotal = subtotal;
  let discount = 0;
  let fee = 0;

  // Apply discount
  if (options?.discount) {
    if (options.discountType === 'percentage') {
      discount = workingSubtotal * (options.discount / 100);
    } else {
      discount = options.discount;
    }
    workingSubtotal -= discount;
  }

  // Calculate tax on discounted amount
  const tax = workingSubtotal * taxRate;

  // Apply fee
  if (options?.fee) {
    if (options.feeType === 'percentage') {
      fee = (workingSubtotal + tax) * (options.fee / 100);
    } else {
      fee = options.fee;
    }
  }

  const total = workingSubtotal + tax + fee;

  return {
    subtotal,
    discount,
    subtotalAfterDiscount: workingSubtotal,
    tax,
    fee,
    total,
  };
}

/**
 * Generate tax summary for display
 */
export function generateTaxSummary(country: string, taxRate: number): string {
  const data = GLOBAL_TAX_RATES[country];
  if (!data) return `Tax rate: ${(taxRate * 100).toFixed(1)}%`;

  return `${data.description} - Applied rate: ${(taxRate * 100).toFixed(1)}%`;
}

/**
 * Check if tax rate is valid for a country
 */
export function isTaxRateValidForCountry(country: string, taxRate: number): boolean {
  const countryData = GLOBAL_TAX_RATES[country];
  if (!countryData) return taxRate >= 0 && taxRate <= 1;

  const validRates = [countryData.standardRate];
  if (countryData.reducedRates) {
    validRates.push(...Object.values(countryData.reducedRates));
  }

  return validRates.some((rate) => Math.abs(rate - taxRate) < 0.0001);
}
