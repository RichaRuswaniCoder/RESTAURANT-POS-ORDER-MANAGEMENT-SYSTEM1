import { Schema, model } from "mongoose";

const menuItemSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    imageUrl: {
      type: String,
      trim: true,
      default: ""
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export const MenuItemModel = model("MenuItem", menuItemSchema);