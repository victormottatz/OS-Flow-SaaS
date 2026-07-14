export interface StandardEvent<T = any> {
  id: string; // UUID of the event
  timestamp: string; // ISO 8601
  aggregateId: string; // Entity ID (e.g. OS ID)
  aggregateType: string; // Entity Type (e.g. "OrdemServico")
  actor: string; // User ID or "SYSTEM"
  payload: T; // The event payload
  version: number; // Schema version (default 1)
}
