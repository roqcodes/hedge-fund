import sys

types = """

// ═══════════════════════════════════════════════════════════
// IC Transfer Module
// ═══════════════════════════════════════════════════════════

export interface ICRegion {
  id: string;
  name: string;
  country: string;
  createdAt?: string;
}

export interface ICSupplier {
  id: string;
  name: string;
  phone?: string;
  commission?: number;
  regionId?: string;
  email?: string;
  address?: string;
  createdAt?: string;
}

export interface ICWarehouse {
  id: string;
  name: string;
  phone?: string;
  commission?: number;
  regionId?: string;
  email?: string;
  address?: string;
  createdAt?: string;
}

export interface ICRates {
  id: string;
  buyRate: number;
  saleRate: number;
  sarConversion: number;
  inrConversion: number;
  updatedAt?: string;
}

export interface ICPurchase {
  id: string;
  supplierId?: string;
  locationId?: string;
  warehouseId?: string;
  unitRate: number;
  units: number;
  paymentMethod?: string;
  notes?: string;
  inrTotal?: number;
  aedTotal?: number;
  createdAt?: string;
}

export interface ICSale {
  id: string;
  customerName: string;
  locationId?: string;
  units: number;
  unitRate: number;
  address?: string;
  paymentMode?: string;
  inrAmount?: number;
  aedAmount?: number;
  enteredBy?: string;
  enteredByName?: string;
  enteredByUserId?: string;
  createdAt?: string;
}

export interface ICWarehouseTransaction {
  id: string;
  warehouseId: string;
  transactionType: string;
  units: number;
  referenceType?: string;
  referenceId?: string;
  createdAt?: string;
}
"""

with open('src/types/index.ts', 'a', encoding='utf-8') as f:
    f.write(types)

print("Appended IC Transfer types")
