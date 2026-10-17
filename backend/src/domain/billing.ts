export type BillItem = { quantity: number; unitPrice: number };
export type Bill = {
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
};

const money = (amount: number): number =>
  Math.round((amount + Number.EPSILON) * 100) / 100;

/** Server-side source of truth for every order total. */
export function calculateBill(
  items: BillItem[],
  discountPercent = 0,
  taxRate = 0
): Bill {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("An order must contain at least one item.");
  }
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    throw new Error("Discount percentage must be between 0 and 100.");
  }
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
    throw new Error("Tax rate must be between 0 and 100.");
  }
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 ||
        !Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      throw new Error("Bill items require positive integer quantities and non-negative prices.");
    }
  }

  const subtotal = money(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
  const discountAmount = money(subtotal * discountPercent / 100);
  const taxableAmount = money(subtotal - discountAmount);
  const taxAmount = money(taxableAmount * taxRate / 100);
  return {
    subtotal,
    discountPercent,
    discountAmount,
    taxRate,
    taxAmount,
    totalAmount: money(taxableAmount + taxAmount)
  };
}
