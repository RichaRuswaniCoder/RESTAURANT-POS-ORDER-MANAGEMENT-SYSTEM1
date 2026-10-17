
import type { RequestHandler } from "express";
import { isValidObjectId } from "mongoose";
import { MenuItemModel } from "../models/menu-item.js";

// GET: Retrieve all menu items
export const getMenuItems: RequestHandler = async (_req, res, next) => {
  try {
    const items = await MenuItemModel.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    next(error);
  }
};

// POST: Create a new menu item
export const createMenuItem: RequestHandler = async (req, res, next) => {
  try {
    const {
      name,
      description,
      category,
      price,
      imageUrl,
      isAvailable
    } = req.body ?? {};

    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      typeof category !== "string" ||
      !category.trim() ||
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      res.status(400).json({
        success: false,
        message: "Valid name, category, and non-negative price are required."
      });
      return;
    }

    if (
      (description !== undefined && typeof description !== "string") ||
      (imageUrl !== undefined && typeof imageUrl !== "string") ||
      (isAvailable !== undefined && typeof isAvailable !== "boolean")
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid description, image URL, or availability value."
      });
      return;
    }

    const item = await MenuItemModel.create({
      name: name.trim(),
      description,
      category: category.trim(),
      price,
      imageUrl,
      isAvailable
    });

    res.status(201).json({
      success: true,
      message: "Menu item created successfully",
      data: item
    });
  } catch (error) {
    next(error);
  }
};

// PUT: Update an existing menu item
export const updateMenuItem: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params.id;
    const {
      name,
      description,
      category,
      price,
      imageUrl,
      isAvailable
    } = req.body ?? {};

    if (!isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid menu item ID"
      });
      return;
    }

    const updates: {
      name?: string;
      description?: string;
      category?: string;
      price?: number;
      imageUrl?: string;
      isAvailable?: boolean;
    } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2) {
        res.status(400).json({
          success: false,
          message: "Name must contain at least 2 characters"
        });
        return;
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      if (typeof description !== "string") {
        res.status(400).json({
          success: false,
          message: "Description must be a string"
        });
        return;
      }
      updates.description = description;
    }

    if (category !== undefined) {
      if (typeof category !== "string" || !category.trim()) {
        res.status(400).json({
          success: false,
          message: "Category is required"
        });
        return;
      }
      updates.category = category.trim();
    }

    if (price !== undefined) {
      if (
        typeof price !== "number" ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        res.status(400).json({
          success: false,
          message: "Price must be a non-negative number"
        });
        return;
      }
      updates.price = price;
    }

    if (imageUrl !== undefined) {
      if (typeof imageUrl !== "string") {
        res.status(400).json({
          success: false,
          message: "Image URL must be a string"
        });
        return;
      }
      updates.imageUrl = imageUrl;
    }

    if (isAvailable !== undefined) {
      if (typeof isAvailable !== "boolean") {
        res.status(400).json({
          success: false,
          message: "Availability must be true or false"
        });
        return;
      }
      updates.isAvailable = isAvailable;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        message: "Provide at least one field to update"
      });
      return;
    }

    const item = await MenuItemModel.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    if (!item) {
      res.status(404).json({
        success: false,
        message: "Menu item not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Menu item updated successfully",
      data: item
    });
  } catch (error) {
    next(error);
  }
};

// DELETE: Remove a menu item
export const deleteMenuItem: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid menu item ID"
      });
      return;
    }

    const item = await MenuItemModel.findByIdAndDelete(id);

    if (!item) {
      res.status(404).json({
        success: false,
        message: "Menu item not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Menu item deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};
