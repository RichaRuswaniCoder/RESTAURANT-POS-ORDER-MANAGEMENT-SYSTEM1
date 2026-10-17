import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import { MenuItemModel } from "../models/menu-item.js";

const demoItems = [
  { name: "Margherita Pizza", description: "Classic tomato, mozzarella, and basil", category: "Pizza", price: 249, isAvailable: true },
  { name: "Farmhouse Pizza", description: "Bell peppers, onion, tomato, and cheese", category: "Pizza", price: 299, isAvailable: true },
  { name: "Veg Burger", description: "Vegetable patty with lettuce and sauce", category: "Burgers", price: 149, isAvailable: true },
  { name: "Masala Fries", description: "Crispy fries with house seasoning", category: "Sides", price: 99, isAvailable: true },
  { name: "Cold Coffee", description: "Chilled coffee with milk", category: "Drinks", price: 119, isAvailable: true }
];

async function seedDemo(): Promise<void> {
  await connectDatabase();
  let created = 0;
  for (const item of demoItems) {
    const existing = await MenuItemModel.findOne({ name: item.name, category: item.category });
    if (!existing) {
      await MenuItemModel.create(item);
      created += 1;
    }
  }
  console.log(`Demo menu seed complete. Added ${created} item(s); existing items were kept.`);
}

void seedDemo()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Demo seed failed.");
    process.exitCode = 1;
  })
  .finally(async () => { await mongoose.disconnect(); });
