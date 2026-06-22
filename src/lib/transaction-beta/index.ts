/**
 * Transaction Beta module — public surface for daily ledger / Z-report workflow.
 *
 * Layers:
 * - businessTime / dailyClose — pure domain (dates, snapshots, KPI math)
 * - dailyCloseActions — server persistence
 * - useTransactionBetaPage — client orchestration
 * - transaction-beta/* components — presentation
 */

export type {
  TransactionBetaIntegrationEvent,
  TransactionBetaIntegrationPublisher,
  TransactionBetaPageState,
  TransactionBetaPermissions,
  TransactionBetaViewMode,
} from './types';

export { TRANSACTION_BETA_PAGE_TITLE, TRANSACTION_BETA_PAGE_SUBTITLE } from './constants';
export { publishTransactionBetaEvent, setTransactionBetaIntegrationPublisher } from './integrations';
