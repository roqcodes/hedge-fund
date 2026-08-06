import type { ICTransferSettings } from '@/types';

export const IC_TRANSFER_SETTINGS_ID = 'global';

export const DEFAULT_IC_TRANSFER_SETTINGS: ICTransferSettings = {
  salesEnabled: true,
  autoRateResetEnabled: false,
};

export function mapICTransferSettingsRow(
  row: {
    sales_enabled?: boolean | null;
    auto_rate_reset_enabled?: boolean | null;
    updated_at?: string | Date | null;
    updated_by?: string | null;
  } | null | undefined,
): ICTransferSettings {
  if (!row) return { ...DEFAULT_IC_TRANSFER_SETTINGS };
  return {
    salesEnabled: row.sales_enabled !== false,
    autoRateResetEnabled: row.auto_rate_reset_enabled === true,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    updatedBy: row.updated_by ?? undefined,
  };
}

export function canManageICTransferGlobalSettings(
  user: { role?: string } | null | undefined,
): boolean {
  return user?.role === 'admin';
}
