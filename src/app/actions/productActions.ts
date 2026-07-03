'use server';

import { query, pool } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { buildProductSkuBase } from '@/lib/products/sku';
import { logger } from '@/lib/logger';

async function generateUniqueProductSku(
  branchId: string,
  metalType: string,
  weight: number | string,
  unit: string,
): Promise<string> {
  const base = buildProductSkuBase(metalType, weight, unit);
  for (let attempt = 0; attempt < 20; attempt++) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const sku = `${base}-${suffix}`;
    const existing = await query(
      `SELECT 1 FROM products WHERE branch_id = $1 AND sku = $2 LIMIT 1`,
      [branchId, sku],
    );
    if (existing.rowCount === 0) return sku;
  }
  return `${base}-${Date.now().toString(36).slice(-5).toUpperCase()}`;
}

// --- Categories ---

export async function getCategoriesBySlug(slug: string) {
  try {
    const res = await query(`
      SELECT c.* 
      FROM product_categories c
      LEFT JOIN branches b ON c.branch_id = b.id
      WHERE b.slug = $1 OR c.branch_id IS NULL
      ORDER BY c.name ASC
    `, [slug]);
    return { success: true, categories: res.rows };
  } catch (err: any) {
    logger.error({ error: err, slug }, 'getCategories error');
    return { success: false, error: err.message };
  }
}

export async function saveCategory(slug: string, id: string | null, name: string) {
  try {
    const branchRes = await query(`SELECT id FROM branches WHERE slug = $1`, [slug]);
    if (branchRes.rowCount === 0) throw new Error('Branch not found');
    const branchId = branchRes.rows[0].id;

    if (id) {
      await query(`UPDATE product_categories SET name = $1 WHERE id = $2 AND branch_id = $3`, [name, id, branchId]);
    } else {
      const newId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await query(`INSERT INTO product_categories (id, branch_id, name) VALUES ($1, $2, $3)`, [newId, branchId, name]);
    }
    revalidatePath('/[slug]/products');
    return { success: true };
  } catch (err: any) {
    logger.error({ error: err, slug, id, name }, 'saveCategory error');
    return { success: false, error: err.message };
  }
}

export async function deleteCategory(id: string) {
  try {
    await query(`DELETE FROM product_categories WHERE id = $1`, [id]);
    revalidatePath('/[slug]/products');
    return { success: true };
  } catch (err: any) {
    logger.error({ error: err, id }, 'deleteCategory error');
    return { success: false, error: err.message };
  }
}

// --- Subcategories ---

export async function getSubcategoriesBySlug(slug: string) {
  try {
    const res = await query(`
      SELECT s.* 
      FROM product_subcategories s
      LEFT JOIN branches b ON s.branch_id = b.id
      WHERE b.slug = $1 OR s.branch_id IS NULL
      ORDER BY s.name ASC
    `, [slug]);
    return { success: true, subcategories: res.rows };
  } catch (err: any) {
    logger.error({ error: err, slug }, 'getSubcategories error');
    return { success: false, error: err.message };
  }
}

export async function saveSubcategory(slug: string, id: string | null, categoryId: string, name: string) {
  try {
    const branchRes = await query(`SELECT id FROM branches WHERE slug = $1`, [slug]);
    if (branchRes.rowCount === 0) throw new Error('Branch not found');
    const branchId = branchRes.rows[0].id;

    if (id) {
      await query(`UPDATE product_subcategories SET name = $1, category_id = $2 WHERE id = $3 AND branch_id = $4`, [name, categoryId, id, branchId]);
    } else {
      const newId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await query(`INSERT INTO product_subcategories (id, branch_id, category_id, name) VALUES ($1, $2, $3, $4)`, [newId, branchId, categoryId, name]);
    }
    revalidatePath('/[slug]/products');
    return { success: true };
  } catch (err: any) {
    logger.error({ error: err, slug, id, categoryId, name }, 'saveSubcategory error');
    return { success: false, error: err.message };
  }
}

export async function deleteSubcategory(id: string) {
  try {
    await query(`DELETE FROM product_subcategories WHERE id = $1`, [id]);
    revalidatePath('/[slug]/products');
    return { success: true };
  } catch (err: any) {
    logger.error({ error: err, id }, 'deleteSubcategory error');
    return { success: false, error: err.message };
  }
}

// --- Products ---

export async function getProductsBySlug(slug: string) {
  try {
    const res = await query(`
      SELECT p.*, c.name as category_name, s.name as subcategory_name
      FROM products p
      LEFT JOIN branches b ON p.branch_id = b.id
      LEFT JOIN product_categories c ON p.category_id = c.id
      LEFT JOIN product_subcategories s ON p.subcategory_id = s.id
      WHERE b.slug = $1 OR p.branch_id IS NULL
      ORDER BY p.created_at DESC
    `, [slug]);
    return { success: true, products: res.rows };
  } catch (err: any) {
    logger.error({ error: err, slug }, 'getProducts error');
    return { success: false, error: err.message };
  }
}

export async function saveProduct(slug: string, data: any) {
  try {
    const branchRes = await query(`SELECT id FROM branches WHERE slug = $1`, [slug]);
    if (branchRes.rowCount === 0) throw new Error('Branch not found');
    const branchId = branchRes.rows[0].id;

    const id = data.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const sku = data.id
      ? data.sku
      : await generateUniqueProductSku(branchId, data.metal_type, data.weight, data.unit);

    const q = `
      INSERT INTO products (
        id, branch_id, sku, name, category_id, subcategory_id, metal_type, purity, weight,
        unit, brand, origin, buy_premium, sell_premium, making_charge, vat_percent,
        inventory_type, redeemable, hedging_enabled, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      )
      ON CONFLICT (id) DO UPDATE SET
        sku = EXCLUDED.sku,
        name = EXCLUDED.name,
        category_id = EXCLUDED.category_id,
        subcategory_id = EXCLUDED.subcategory_id,
        metal_type = EXCLUDED.metal_type,
        purity = EXCLUDED.purity,
        weight = EXCLUDED.weight,
        unit = EXCLUDED.unit,
        brand = EXCLUDED.brand,
        origin = EXCLUDED.origin,
        buy_premium = EXCLUDED.buy_premium,
        sell_premium = EXCLUDED.sell_premium,
        making_charge = EXCLUDED.making_charge,
        vat_percent = EXCLUDED.vat_percent,
        inventory_type = EXCLUDED.inventory_type,
        redeemable = EXCLUDED.redeemable,
        hedging_enabled = EXCLUDED.hedging_enabled,
        status = EXCLUDED.status
    `;

    const values = [
      id, branchId, sku, data.name, data.category_id || null, data.subcategory_id || null,
      data.metal_type, data.purity || 0, data.weight || 0, data.unit, data.brand || '', data.origin || '',
      0, 0, 0, 0,
      data.inventory_type || 'Physical', false, false, data.status || 'Active',
    ];

    await query(q, values);
    revalidatePath('/[slug]/products');
    return { success: true, id };
  } catch (err: any) {
    logger.error({ error: err, slug, data }, 'saveProduct error');
    return { success: false, error: err.message };
  }
}

export async function deleteProduct(id: string) {
  try {
    await query(`DELETE FROM products WHERE id = $1`, [id]);
    revalidatePath('/[slug]/products');
    return { success: true };
  } catch (err: any) {
    logger.error({ error: err, id }, 'deleteProduct error');
    return { success: false, error: err.message };
  }
}
