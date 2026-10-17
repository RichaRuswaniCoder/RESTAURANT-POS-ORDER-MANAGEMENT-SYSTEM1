import test from "node:test";
import assert from "node:assert/strict";
import { calculateBill } from "../domain/billing.js";

test("calculates subtotal, discount, tax, and total on the server", () => {
  const bill = calculateBill([
    { quantity: 2, unitPrice: 100 },
    { quantity: 1, unitPrice: 50 }
  ], 10, 5);
  assert.deepEqual(bill, {
    subtotal: 250,
    discountPercent: 10,
    discountAmount: 25,
    taxRate: 5,
    taxAmount: 11.25,
    totalAmount: 236.25
  });
});

test("rejects an empty bill and invalid quantity", () => {
  assert.throws(() => calculateBill([]), /at least one item/i);
  assert.throws(() => calculateBill([{ quantity: 0, unitPrice: 12 }]), /quantities/i);
});
