
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
      minlength: [2, "Category name must be at least 2 characters"],
    },

    categoryDescription: {
      type: String,
      default: "",
      trim: true,
    },

    categoryImage: {
      type: String,
      default: "",
      trim: true,
    },

    categoryIsActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Category = mongoose.model("Category", categorySchema);

export default Category;
