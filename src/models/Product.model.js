
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },

    productDescription: {
      type: String,
      default: "",
      trim: true,
    },

    productPrice: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Product price cannot be negative"],
    },

    productStock: {
      type: Number,
      required: [true, "Product stock is required"],
      default: 0,
      min: [0, "Product stock cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Product stock must be a whole number",
      },
    },

    productImage: {
      type: String,
      default: "",
      trim: true,
    },

    productCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Product category is required"],
    },

    productBrand: {
      type: String,
      default: "",
      trim: true,
    },

    productMaterial: {
      type: String,
      default: "",
      trim: true,
    },

    productDimensions: {
      type: String,
      default: "",
      trim: true,
    },

    productColors: {
      type: [String],
      default: [],
      set: (colors) =>
        Array.isArray(colors)
          ? colors.map((color) => String(color).trim()).filter(Boolean)
          : colors,
    },

    productWarranty: {
      type: String,
      default: "",
      trim: true,
    },

    productIsActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
