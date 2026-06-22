'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getCurrentUserAction } from '@/app/actions/auth';
import { HIDEABLE_BRANCH_PAGE_IDS } from '@/lib/branchPages';

export async function updateBranchSettingsAction(
  branchId: string, 
  name: string, 
  logoUrl: string | null,
  identityDetails: {
    address: string;
    city: string;
    country: string;
    trn: string;
    phone: string;
    email: string;
    website: string;
  }
) {
  try {
    if (logoUrl) {
      await query(
        `UPDATE branches SET name = $1, logo_url = $2, address = $3, city = $4, country = $5, trn = $6, phone = $7, email = $8, website = $9 WHERE id = $10`, 
        [name, logoUrl, identityDetails.address, identityDetails.city, identityDetails.country, identityDetails.trn, identityDetails.phone, identityDetails.email, identityDetails.website, branchId]
      );
    } else {
      await query(
        `UPDATE branches SET name = $1, address = $2, city = $3, country = $4, trn = $5, phone = $6, email = $7, website = $8 WHERE id = $9`, 
        [name, identityDetails.address, identityDetails.city, identityDetails.country, identityDetails.trn, identityDetails.phone, identityDetails.email, identityDetails.website, branchId]
      );
    }

    // Revalidate settings and global layout
    revalidatePath('/', 'layout');

    return { success: true };
  } catch (error: any) {
    console.error('Failed to update branch settings:', error);
    return { success: false, error: error.message };
  }
}

export async function updateBranchPageSettingsAction(
  branchId: string,
  hiddenPages: string[],
) {
  try {
    const userRes = await getCurrentUserAction();
    if (!userRes.success || !userRes.data || userRes.data.role !== 'admin') {
      return { success: false, error: 'Only superadmin can manage branch page access.' };
    }

    const sanitized = hiddenPages.filter(id =>
      (HIDEABLE_BRANCH_PAGE_IDS as readonly string[]).includes(id),
    );
    await query(
      `UPDATE branches SET hidden_pages = $1::text[] WHERE id = $2`,
      [sanitized, branchId],
    );

    revalidatePath('/', 'layout');
    return { success: true, hiddenPages: sanitized };
  } catch (error: unknown) {
    console.error('Failed to update branch page settings:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Update failed' };
  }
}
