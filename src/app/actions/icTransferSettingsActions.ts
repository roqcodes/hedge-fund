'use server';

import { query } from '@/lib/db';
import { getCurrentUserAction } from '@/app/actions/auth';
import type { DbActionResult } from '@/app/actions/dbActions';
import type { ICTransferSettings } from '@/types';
import {
  IC_TRANSFER_SETTINGS_ID,
  mapICTransferSettingsRow,
  canManageICTransferGlobalSettings,
} from '@/lib/icTransfer/settings';
import { logger } from '@/lib/logger';
import { SQL_ENSURE_IC_TRANSFER_SETTINGS } from '@/lib/sql/icTransferSettingsSql';

export async function fetchICTransferSettingsAction(): Promise<DbActionResult<ICTransferSettings>> {
  try {
    await query(SQL_ENSURE_IC_TRANSFER_SETTINGS);
    const res = await query(
      `SELECT sales_enabled, auto_rate_reset_enabled, updated_at, updated_by
       FROM ic_transfer_settings WHERE id = $1 LIMIT 1`,
      [IC_TRANSFER_SETTINGS_ID],
    );
    return { success: true, data: mapICTransferSettingsRow(res.rows[0]) };
  } catch (error: unknown) {
    logger.error({ error }, 'Error in fetchICTransferSettingsAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

async function assertAdminForSettings(): Promise<DbActionResult<void>> {
  const userRes = await getCurrentUserAction();
  const user = userRes.success ? userRes.data : null;
  if (!canManageICTransferGlobalSettings(user)) {
    return { success: false, error: 'Only HQ admins can change IC Transfer settings' };
  }
  return { success: true, data: undefined };
}

export async function updateICTransferSalesEnabledAction(
  salesEnabled: boolean,
): Promise<DbActionResult<ICTransferSettings>> {
  try {
    const guard = await assertAdminForSettings();
    if (!guard.success) {
      return { success: false, error: guard.error };
    }

    const userRes = await getCurrentUserAction();
    const updatedBy = userRes.success ? userRes.data?.email ?? userRes.data?.name ?? 'admin' : 'admin';

    await query(SQL_ENSURE_IC_TRANSFER_SETTINGS);
    const res = await query(
      `UPDATE ic_transfer_settings
       SET sales_enabled = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
       WHERE id = $3
       RETURNING sales_enabled, auto_rate_reset_enabled, updated_at, updated_by`,
      [salesEnabled, updatedBy, IC_TRANSFER_SETTINGS_ID],
    );
    return { success: true, data: mapICTransferSettingsRow(res.rows[0]) };
  } catch (error: unknown) {
    logger.error({ error, salesEnabled }, 'Error in updateICTransferSalesEnabledAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function updateICTransferAutoRateResetAction(
  autoRateResetEnabled: boolean,
): Promise<DbActionResult<ICTransferSettings>> {
  try {
    const guard = await assertAdminForSettings();
    if (!guard.success) {
      return { success: false, error: guard.error };
    }

    const userRes = await getCurrentUserAction();
    const updatedBy = userRes.success ? userRes.data?.email ?? userRes.data?.name ?? 'admin' : 'admin';

    await query(SQL_ENSURE_IC_TRANSFER_SETTINGS);
    const res = await query(
      `UPDATE ic_transfer_settings
       SET auto_rate_reset_enabled = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
       WHERE id = $3
       RETURNING sales_enabled, auto_rate_reset_enabled, updated_at, updated_by`,
      [autoRateResetEnabled, updatedBy, IC_TRANSFER_SETTINGS_ID],
    );
    return { success: true, data: mapICTransferSettingsRow(res.rows[0]) };
  } catch (error: unknown) {
    logger.error({ error, autoRateResetEnabled }, 'Error in updateICTransferAutoRateResetAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

export async function assertICTransferSalesEnabledAction(): Promise<DbActionResult<void>> {
  try {
    await query(SQL_ENSURE_IC_TRANSFER_SETTINGS);
    const res = await query(
      `SELECT sales_enabled FROM ic_transfer_settings WHERE id = $1 LIMIT 1`,
      [IC_TRANSFER_SETTINGS_ID],
    );
    const settings = mapICTransferSettingsRow(res.rows[0]);
    if (!settings.salesEnabled) {
      return { success: false, error: 'Sales are temporarily paused. New orders cannot be created right now.' };
    }
    return { success: true, data: undefined };
  } catch (error: unknown) {
    logger.error({ error }, 'Error in assertICTransferSalesEnabledAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}

/**
 * Daily 5:00 PM Dubai (GST, UTC+4) → 13:00 UTC.
 * Invoked by the cron route — not for direct client use.
 */
export async function autoResetICRatesCronAction(): Promise<DbActionResult<{ resetCount: number }>> {
  try {
    await query(SQL_ENSURE_IC_TRANSFER_SETTINGS);
    const settingsRes = await query(
      `SELECT auto_rate_reset_enabled FROM ic_transfer_settings WHERE id = $1 LIMIT 1`,
      [IC_TRANSFER_SETTINGS_ID],
    );
    const settings = mapICTransferSettingsRow(settingsRes.rows[0]);
    if (!settings.autoRateResetEnabled) {
      return { success: true, data: { resetCount: 0 } };
    }

    const res = await query(
      `UPDATE ic_rate_groups
       SET sale_rate = 0, pricing_config = NULL, updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
    );
    return { success: true, data: { resetCount: res.rowCount ?? 0 } };
  } catch (error: unknown) {
    logger.error({ error }, 'Error in autoResetICRatesCronAction');
    return { success: false, error: error instanceof Error ? error.message : 'Database error' };
  }
}
