import { EventEmitter } from "events";

class EventBus extends EventEmitter {}

export const eventBus = new EventBus();

// Eventos do Sistema
export const Events = {
  OS_CREATED: "os.created",
  OS_STATUS_CHANGED: "os.status.changed",
  OS_FINALIZED: "os.finalized",
  CLIENT_CREATED: "client.created",
  CLIENT_UPDATED: "client.updated",
  PART_STOCK_LOW: "part.stock.low",
  PART_STOCK_CHANGED: "part.stock.changed",
};
