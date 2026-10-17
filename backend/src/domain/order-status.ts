export const ORDER_STATUSES = [
  "pending",
  "preparing",
  "ready",
  "completed",
  "cancelled"
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function normalizeLegacyStatus(status: string): string {
  return status === "served" ? "completed" : status;
}

export function canTransitionOrderStatus(fromValue: string, to: OrderStatus): boolean {
  const from = normalizeLegacyStatus(fromValue);
  if (from === to) return true;
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    pending: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: ["completed", "cancelled"],
    completed: [],
    cancelled: []
  };
  return (transitions[from as OrderStatus] ?? []).includes(to);
}
