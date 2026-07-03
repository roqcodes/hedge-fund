/** Short code for weight unit in SKU segments. */
function unitCode(unit: string): string {
  switch (unit) {
    case 'Kg':
      return 'KG';
    case 'Oz':
      return 'OZ';
    case 'Tola':
      return 'TL';
    default:
      return 'G';
  }
}

/** Builds a human-readable SKU segment from product attributes. */
export function buildProductSkuBase(metalType: string, weight: number | string, unit: string): string {
  const metal = (metalType || 'Gold').slice(0, 3).toUpperCase();
  const w = Number(weight) || 0;
  const wStr = Number.isInteger(w) ? String(w) : w.toFixed(3).replace(/\.?0+$/, '');
  return `${metal}-${wStr}${unitCode(unit)}`;
}

/** Client preview SKU — final suffix assigned on save for uniqueness. */
export function previewProductSku(metalType: string, weight: number | string, unit: string): string {
  return `${buildProductSkuBase(metalType, weight, unit)}-AUTO`;
}
