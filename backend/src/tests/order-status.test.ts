import test from "node:test";
import assert from "node:assert/strict";
import { canTransitionOrderStatus, normalizeLegacyStatus } from "../domain/order-status.js";

test("allows the expected order workflow", () => {
  assert.equal(canTransitionOrderStatus("pending", "preparing"), true);
  assert.equal(canTransitionOrderStatus("preparing", "ready"), true);
  assert.equal(canTransitionOrderStatus("ready", "completed"), true);
  assert.equal(canTransitionOrderStatus("pending", "completed"), false);
});

test("blocks transitions from terminal states and maps legacy served orders", () => {
  assert.equal(canTransitionOrderStatus("completed", "preparing"), false);
  assert.equal(canTransitionOrderStatus("cancelled", "preparing"), false);
  assert.equal(normalizeLegacyStatus("served"), "completed");
});
