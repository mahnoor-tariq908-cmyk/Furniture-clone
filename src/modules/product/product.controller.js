
import mongoose from "mongoose";
import Product from "../../models/Product.model.js";
import Category from "../../models/Category.model.js";

const allowedFields = [
  "productName",
  "productDescription",
  "productPrice",
  "productStock",
  "productCategory",
  "productBrand",
  "productMaterial",
  "productDimensions",
  "productColors",
  "productWarranty",
  "productIsActive",
];

const parseValue = (value) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();

  if (trimmed === "true") return true;
  if (trimmed === "false") return false;

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
};

const validateColors = (value) => {
  const colors = parseValue(value);

  if (colors === undefined || colors === "") {
    return { valid: true, value: [] };
  }

  if (typeof colors === "string") {
    return {
      valid: true,
      value: colors.split(",").map((color) => color.trim()).filter(Boolean),
    };
  }

  if (
    !Array.isArray(colors) ||
    !colors.every((color) => typeof color === "string")
  ) {
    return { valid: false };
  }

  return {
    valid: true,
    value: colors.map((color) => color.trim()).filter(Boolean),
  };
};

const isValidNonNegativeNumber = (value) =>
  value !== "" &&
  value !== null &&
  value !== undefined &&
  Number.isFinite(Number(value)) &&
  Number(value) >= 0;

const imagePath = (file) =>
  file ? `/uploads/products/${file.filename}` : undefined;

// CREATE PRODUCT (Admin route should protect this controller)
export const createProduct = async (req, res) => {
  try {
    const {
      productName,
      productDescription,
      productPrice,
      productStock,
      productCategory,
      productBrand,
      productMaterial,
      productDimensions,
      productColors,
      productWarranty,
      productIsActive,
    } = req.body;

    if (typeof productName !== "string" || !productName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Product image is required",
      });
    }

    if (!isValidNonNegativeNumber(productPrice)) {
      return res.status(400).json({
        success: false,
        message: "Valid product price is required",
      });
    }

    if (
      productStock !== undefined &&
      productStock !== "" &&
      (!Number.isInteger(Number(productStock)) ||
        Number(productStock) < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Stock must be a non-negative integer",
      });
    }

    if (!mongoose.isValidObjectId(productCategory)) {
      return res.status(400).json({
        success: false,
        message: "Valid category ID is required",
      });
    }

    const category = await Category.findOne({
      _id: productCategory,
      categoryIsActive: true,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Active category not found",
      });
    }

    const parsedColors = validateColors(productColors);

    if (!parsedColors.valid) {
      return res.status(400).json({
        success: false,
        message: "Product colors must be an array or comma-separated text",
      });
    }

    const activeValue = parseValue(productIsActive);

    if (
      activeValue !== undefined &&
      typeof activeValue !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "productIsActive must be true or false",
      });
    }

    const product = await Product.create({
      productName: productName.trim(),
      productDescription,
      productPrice: Number(productPrice),
      productStock:
        productStock === undefined || productStock === ""
          ? 0
          : Number(productStock),
      productImage: imagePath(req.file),
      productCategory,
      productBrand,
      productMaterial,
      productDimensions,
      productColors: parsedColors.value,
      productWarranty,
      ...(activeValue !== undefined && {
        productIsActive: activeValue,
      }),
    });

    const savedProduct = await Product.findById(product._id)
      .populate("productCategory", "categoryName");

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: savedProduct,
    });
  } catch (error) {
    console.error("Create product error:", error);

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create product",
    });
  }
};

// GET ALL ACTIVE PRODUCTS
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({ productIsActive: true })
      .populate("productCategory", "categoryName")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};

// GET SINGLE ACTIVE PRODUCT
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findOne({
      _id: id,
      productIsActive: true,
    }).populate("productCategory", "categoryName");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Get product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
};

// UPDATE PRODUCT
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const existingProduct = await Product.findById(id);

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = parseValue(req.body[field]);
      }
    }

    if (req.file) {
      updates.productImage = imagePath(req.file);
    }

    if (updates.productName !== undefined) {
      if (
        typeof updates.productName !== "string" ||
        !updates.productName.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Product name cannot be empty",
        });
      }

      updates.productName = updates.productName.trim();
    }

    if (updates.productPrice !== undefined) {
      if (!isValidNonNegativeNumber(updates.productPrice)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product price",
        });
      }

      updates.productPrice = Number(updates.productPrice);
    }

    if (updates.productStock !== undefined) {
      if (
        updates.productStock === "" ||
        !Number.isInteger(Number(updates.productStock)) ||
        Number(updates.productStock) < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid product stock",
        });
      }

      updates.productStock = Number(updates.productStock);
    }

    if (updates.productCategory !== undefined) {
      if (!mongoose.isValidObjectId(updates.productCategory)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }

      const category = await Category.findOne({
        _id: updates.productCategory,
        categoryIsActive: true,
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Active category not found",
        });
      }
    }

    if (updates.productColors !== undefined) {
      const parsedColors = validateColors(updates.productColors);

      if (!parsedColors.valid) {
        return res.status(400).json({
          success: false,
          message: "Invalid product colors",
        });
      }

      updates.productColors = parsedColors.value;
    }

    if (
      updates.productIsActive !== undefined &&
      typeof updates.productIsActive !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "productIsActive must be true or false",
      });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided",
      });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate("productCategory", "categoryName");

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update product error:", error);

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update product",
    });
  }
};

// SOFT DELETE PRODUCT
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: { productIsActive: false } },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deactivated successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to deactivate product",
    });
  }
};
