/**
 * Future hook point for webhooks, ERP sync, audit pipelines.
 * Wire this in dailyCloseActions / dbActions when integrations ship.
 */
import type { TransactionBetaIntegrationEvent, TransactionBetaIntegrationPublisher } from './types';

export const noopIntegrationPublisher: TransactionBetaIntegrationPublisher = () => {};

let publisher: TransactionBetaIntegrationPublisher = noopIntegrationPublisher;

export function setTransactionBetaIntegrationPublisher(next: TransactionBetaIntegrationPublisher) {
  publisher = next;
}

export async function publishTransactionBetaEvent(event: TransactionBetaIntegrationEvent) {
  await publisher(event);
}
