import { EventEmitter } from "events";

class EventBus extends EventEmitter {}

export const eventBus = new EventBus();

// Eventos do Sistema
export const Events = {
  OS_CREATED: "os.created",
  OS_STATUS_CHANGED: "os.status.changed",
  OS_FINALIZED: "os.finalized",
  CLIENT_CREATED: "client.created",
  PART_STOCK_LOW: "part.stock.low",
};
