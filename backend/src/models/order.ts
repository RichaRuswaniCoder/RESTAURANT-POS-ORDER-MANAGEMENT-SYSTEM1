

import { Schema, model } from "mongoose";

const orderItemSchema = new Schema(
  {
    menuItem: {
      type: Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      sparse: true
    },
    orderType: {
      type: String,
      enum: ["dine-in", "takeaway"],
      default: "takeaway",
      required: true
    },
    customerName: {
      type: String,
      trim: true,
      default: "Walk-in Customer"
    },
    tableNumber: {
      type: String,
      trim: true,
      default: ""
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items: unknown[]) => items.length > 0,
        message: "An order must contain at least one item."
      }
    },

    // Billing information
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    discountAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    discountPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    taxRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    taxAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },

    // Order and payment status
    status: {
      type: String,
      enum: ["pending", "preparing", "ready", "completed", "served", "cancelled"],
      default: "pending"
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid"
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "upi"]
    },
    paidAt: {
      type: Date
    }
  },
  { timestamps: true }
);

export const OrderModel = model("Order", orderSchema);
