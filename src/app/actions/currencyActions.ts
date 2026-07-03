'use server';

import { DEFAULT_RATES } from '@/lib/currency';
import { logger } from '@/lib/logger';

const RATES_URL = 'https://open.er-api.com/v6/latest/AED';

export async function fetchCurrencyRatesAction(): Promise<{
  success: boolean;
  rates: Record<string, number>;
  fetchedAt: string;
}> {
  try {
    const res = await fetch(RATES_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (data.result !== 'success' || !data.rates) throw new Error('Invalid API response');
    return {
      success: true,
      rates: { AED: 1, ...data.rates },
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error({ error }, 'fetchCurrencyRatesAction failed');
    return {
      success: false,
      rates: { ...DEFAULT_RATES },
      fetchedAt: new Date().toISOString(),
    };
  }
}
