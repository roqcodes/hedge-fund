export type MetalType = 'Gold' | 'Silver' | 'Platinum';
export type UnitType = 'Gram' | 'Kg' | 'Oz' | 'Tola' | 'PCS';
export type InventoryType = 'Physical' | 'Digital';
export type StatusType = 'Active' | 'Inactive';

export interface ProductMaster {
  productCode: string;       // SKU
  productName: string;
  category: string;
  subCategory?: string;
  metalType: MetalType;
  purity: number;            // e.g. 999.9, 916
  weight: number;            // Standard weight
  unit: UnitType;            // Gram, Kg, Oz, Tola
  brandRefinery?: string;
  countryOfOrigin?: string;
  buyPremium: number;        // USD per Oz
  sellPremium: number;       // USD per Oz
  makingCharge: number;      // Fixed USD making charge
  vatPercentage: number;     // e.g. 5 for 5%
  inventoryType: InventoryType;
  redeemable: boolean;
  hedgingEnabled: boolean;
  status: StatusType;
}

export const MOCK_PRODUCT_MASTER: ProductMaster[] = [
  {
    productCode: 'TT-BAR-9999',
    productName: 'TT Gold Bar (10 Tola)',
    category: 'TT Bar',
    metalType: 'Gold',
    purity: 999.9,
    weight: 116.64,
    unit: 'Gram',
    buyPremium: 8,
    sellPremium: 10,
    makingCharge: 0,
    vatPercentage: 0,
    inventoryType: 'Physical',
    redeemable: true,
    hedgingEnabled: true,
    status: 'Active',
  },
  {
    productCode: '1KG-BAR-9999',
    productName: '1 Kg Gold Bar',
    category: 'Gold Bar',
    metalType: 'Gold',
    purity: 999.9,
    weight: 1000,
    unit: 'Gram',
    buyPremium: 8,
    sellPremium: 10,
    makingCharge: 0,
    vatPercentage: 0,
    inventoryType: 'Physical',
    redeemable: true,
    hedgingEnabled: true,
    status: 'Active',
  },
  {
    productCode: '1OZ-COIN-9999',
    productName: '1 oz Gold Coin',
    category: 'Gold Coin',
    metalType: 'Gold',
    purity: 999.9,
    weight: 31.1034768,
    unit: 'Gram',
    buyPremium: 15,
    sellPremium: 20,
    makingCharge: 50,
    vatPercentage: 0,
    inventoryType: 'Physical',
    redeemable: true,
    hedgingEnabled: false,
    status: 'Active',
  },
  {
    productCode: 'SOV-COIN-916',
    productName: '8g Gold Coin (Sovereign)',
    category: 'Gold Coin',
    metalType: 'Gold',
    purity: 916,
    weight: 8,
    unit: 'Gram',
    buyPremium: 10,
    sellPremium: 15,
    makingCharge: 20,
    vatPercentage: 5,
    inventoryType: 'Physical',
    redeemable: true,
    hedgingEnabled: false,
    status: 'Active',
  },
  {
    productCode: 'CHAIN-916-20G',
    productName: '20g Gold Chain',
    category: 'Gold Chain',
    metalType: 'Gold',
    purity: 916,
    weight: 20,
    unit: 'Gram',
    buyPremium: 0,
    sellPremium: 10,
    makingCharge: 100,
    vatPercentage: 5,
    inventoryType: 'Physical',
    redeemable: false,
    hedgingEnabled: false,
    status: 'Active',
  }
];

export const TROY_OUNCE_GRAMS = 31.1034768;

/**
 * calculatePricePerGram
 * If Spot Gold Price = USD 4,500 per Troy Ounce and Premium = USD 10 per Ounce
 * 4510 / 31.1034768 = 145.0001 USD/gram
 */
export function calculatePricePerGram(spotPriceOz: number, premiumOz: number): number {
  return (spotPriceOz + premiumOz) / TROY_OUNCE_GRAMS;
}

/**
 * calculatePurityPrice
 * 999.9 Gold = 145.00 * 0.9999
 * 916 Gold = 145.00 * 0.916
 */
export function calculatePurityPrice(pricePerGram: number, purity: number): number {
  // Assuming purity is given as 999.9 or 916, we convert it to a decimal (0.9999 / 0.916)
  const purityDecimal = purity > 1 ? purity / 1000 : purity;
  return pricePerGram * purityDecimal;
}

/**
 * calculateProductPrice
 * Product Price = ((Spot Price + Premium) / 31.1034768) * Purity * Weight + Making Charge + VAT
 */
export function calculateProductPrice(
  spotPriceOz: number,
  premiumOz: number,
  purity: number,
  weightGrams: number,
  makingCharge: number = 0,
  vatPercentage: number = 0
): {
  pricePerGram: number;
  purityPrice: number;
  metalValue: number;
  vatAmount: number;
  totalValue: number;
} {
  const pricePerGram = calculatePricePerGram(spotPriceOz, premiumOz);
  const purityPrice = calculatePurityPrice(pricePerGram, purity);
  const metalValue = purityPrice * weightGrams;
  
  const subTotal = metalValue + makingCharge;
  const vatAmount = subTotal * (vatPercentage / 100);
  const totalValue = subTotal + vatAmount;

  return {
    pricePerGram,
    purityPrice,
    metalValue,
    vatAmount,
    totalValue
  };
}
