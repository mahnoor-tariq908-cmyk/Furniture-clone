
import mongoose from "mongoose";
import Category from "../../models/Category.model.js";
import Product from "../../models/Product.model.js";

// CREATE CATEGORY
export const createCategory = async (req, res) => {
  try {
    const { categoryName, categoryDescription } = req.body;

    if (
      typeof categoryName !== "string" ||
      !categoryName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const name = categoryName.trim();

    const existing = await Category.findOne({
      categoryName: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    const category = await Category.create({
      categoryName: name,
      categoryDescription:
        typeof categoryDescription === "string"
          ? categoryDescription.trim()
          : "",
      categoryImage: req.file
        ? `/uploads/categories/${req.file.filename}`
        : "",
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("Create category error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

// GET ALL ACTIVE CATEGORIES
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      categoryIsActive: true,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

// GET SINGLE ACTIVE CATEGORY
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const category = await Category.findOne({
      _id: id,
      categoryIsActive: true,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Get category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch category",
    });
  }
};

// UPDATE CATEGORY
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const updates = {};
    const allowedFields = [
      "categoryName",
      "categoryDescription",
      "categoryIsActive",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (req.file) {
      updates.categoryImage =
        `/uploads/categories/${req.file.filename}`;
    }

    if (updates.categoryName !== undefined) {
      if (
        typeof updates.categoryName !== "string" ||
        !updates.categoryName.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Category name cannot be empty",
        });
      }

      updates.categoryName = updates.categoryName.trim();

      const escapedName = updates.categoryName.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const duplicate = await Category.findOne({
        categoryName: {
          $regex: `^${escapedName}$`,
          $options: "i",
        },
        _id: { $ne: id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Category name already exists",
        });
      }
    }

    if (updates.categoryDescription !== undefined) {
      if (typeof updates.categoryDescription !== "string") {
        return res.status(400).json({
          success: false,
          message: "Category description must be text",
        });
      }

      updates.categoryDescription =
        updates.categoryDescription.trim();
    }

    if (updates.categoryIsActive !== undefined) {
      if (updates.categoryIsActive === "true") {
        updates.categoryIsActive = true;
      } else if (updates.categoryIsActive === "false") {
        updates.categoryIsActive = false;
      } else if (typeof updates.categoryIsActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "categoryIsActive must be true or false",
        });
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided",
      });
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("Update category error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category name already exists",
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update category",
    });
  }
};

// SOFT DELETE CATEGORY
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const linkedProduct = await Product.exists({
      productCategory: id,
    });

    if (linkedProduct) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete category while products are linked to it",
      });
    }

    category.categoryIsActive = false;
    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category deactivated successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to deactivate category",
    });
  }
};
