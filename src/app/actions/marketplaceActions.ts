'use server';

import { query, pool } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function saveTaxInvoice(data: any, slug: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch branch_id from slug
    const branchRes = await client.query('SELECT id FROM branches WHERE slug = $1', [slug]);
    if (branchRes.rowCount === 0) throw new Error('Branch not found');
    const branchId = branchRes.rows[0].id;

    // Generate ID if not provided
    const invoiceId = data.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const invoiceQuery = `
      INSERT INTO tax_invoices (
        id, branch_id, doc_no, doc_date, ref_no, ref_date, order_type, fixing_type,
        department, vat_type, currency, sales_man, customer_details, terms, due_date,
        decl_no, remarks, gross_wt, pure_wt, add_chrg, mkg_chrg, gold_value, gross_amt,
        discount_percent, discount_amt, net_amt_dc, net_amt_bc, tax_amt,
        cash_pay, bank_pay, cc_pay, party_pay
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32
      )
      ON CONFLICT (id) DO UPDATE SET
        doc_no = EXCLUDED.doc_no,
        doc_date = EXCLUDED.doc_date,
        ref_no = EXCLUDED.ref_no,
        ref_date = EXCLUDED.ref_date,
        order_type = EXCLUDED.order_type,
        fixing_type = EXCLUDED.fixing_type,
        department = EXCLUDED.department,
        vat_type = EXCLUDED.vat_type,
        currency = EXCLUDED.currency,
        sales_man = EXCLUDED.sales_man,
        customer_details = EXCLUDED.customer_details,
        terms = EXCLUDED.terms,
        due_date = EXCLUDED.due_date,
        decl_no = EXCLUDED.decl_no,
        remarks = EXCLUDED.remarks,
        gross_wt = EXCLUDED.gross_wt,
        pure_wt = EXCLUDED.pure_wt,
        add_chrg = EXCLUDED.add_chrg,
        mkg_chrg = EXCLUDED.mkg_chrg,
        gold_value = EXCLUDED.gold_value,
        gross_amt = EXCLUDED.gross_amt,
        discount_percent = EXCLUDED.discount_percent,
        discount_amt = EXCLUDED.discount_amt,
        net_amt_dc = EXCLUDED.net_amt_dc,
        net_amt_bc = EXCLUDED.net_amt_bc,
        tax_amt = EXCLUDED.tax_amt,
        cash_pay = EXCLUDED.cash_pay,
        bank_pay = EXCLUDED.bank_pay,
        cc_pay = EXCLUDED.cc_pay,
        party_pay = EXCLUDED.party_pay
    `;

    const invoiceValues = [
      invoiceId, branchId, data.doc_no, data.doc_date, data.ref_no, data.ref_date,
      data.order_type, data.fixing_type, data.department, data.vat_type, data.currency,
      data.sales_man, data.customer_details, data.terms, data.due_date, data.decl_no,
      data.remarks, data.gross_wt, data.pure_wt, data.add_chrg, data.mkg_chrg,
      data.gold_value, data.gross_amt, data.discount_percent, data.discount_amt,
      data.net_amt_dc, data.net_amt_bc, data.tax_amt, data.cash_pay, data.bank_pay,
      data.cc_pay, data.party_pay
    ];

    await client.query(invoiceQuery, invoiceValues);

    // Delete existing items if updating
    await client.query('DELETE FROM tax_invoice_items WHERE invoice_id = $1', [invoiceId]);

    // Insert items
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        const itemId = item.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await client.query(`
          INSERT INTO tax_invoice_items (
            id, invoice_id, product_code, mtl_type, pieces, purity, gross_qty,
            pure_qty, mkg_rate, mkg_amt, mtl_amt, amount, tax_amt, net_amt
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
          )
        `, [
          itemId, invoiceId, item.productCode, item.mtlType, item.pieces, item.purity,
          item.grossQty, item.pureQty, item.mkgRate, item.mkgAmt, item.mtlAmt,
          item.amount, item.taxAmt, item.netAmt
        ]);
      }
    }

    await client.query('COMMIT');
    revalidatePath('/[slug]/marketplace');
    return { success: true, id: invoiceId };
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('saveTaxInvoice error:', err);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

export async function getTaxInvoicesBySlug(slug: string) {
  try {
    const res = await query(`
      SELECT i.* 
      FROM tax_invoices i
      JOIN branches b ON i.branch_id = b.id
      WHERE b.slug = $1 
      ORDER BY i.created_at DESC
    `, [slug]);
    
    // For each invoice, fetch items
    const invoices = [];
    for (const inv of res.rows) {
      const itemsRes = await query(`SELECT * FROM tax_invoice_items WHERE invoice_id = $1`, [inv.id]);
      invoices.push({ ...inv, items: itemsRes.rows });
    }
    
    return { success: true, invoices };
  } catch (err: any) {
    console.error('getTaxInvoicesBySlug error:', err);
    return { success: false, error: err.message };
  }
}

export async function getTaxInvoiceDetails(invoiceId: string) {
  try {
    const invoiceRes = await query(`SELECT * FROM tax_invoices WHERE id = $1`, [invoiceId]);
    if (invoiceRes.rowCount === 0) return { success: false, error: 'Not found' };

    const itemsRes = await query(`SELECT * FROM tax_invoice_items WHERE invoice_id = $1`, [invoiceId]);
    
    return { 
      success: true, 
      invoice: invoiceRes.rows[0], 
      items: itemsRes.rows 
    };
  } catch (err: any) {
    console.error('getTaxInvoiceDetails error:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteTaxInvoice(invoiceId: string) {
  try {
    await query(`DELETE FROM tax_invoices WHERE id = $1`, [invoiceId]);
    revalidatePath('/[slug]/marketplace');
    return { success: true };
  } catch (err: any) {
    console.error('deleteTaxInvoice error:', err);
    return { success: false, error: err.message };
  }
}
