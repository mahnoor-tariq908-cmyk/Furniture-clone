
import { Router } from "express";

import {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
} from "./category.controller.js";

import verifyAccessToken from "../../middleware/auth.middleware.js";
import verifyAdmin from "../../middleware/admin.middleware.js";
import upload from "../../middleware/upload.middleware.js";

const router = Router();

// Public routes
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);

// Admin-only routes with image upload
router.post(
    "/",
    verifyAccessToken,
    verifyAdmin,
    upload.single("categoryImage"),
    createCategory
);

router.put(
    "/:id",
    verifyAccessToken,
    verifyAdmin,
    upload.single("categoryImage"),
    updateCategory
);

router.delete("/:id", verifyAccessToken, verifyAdmin, deleteCategory);

export default router;
