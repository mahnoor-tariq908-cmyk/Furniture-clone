
import { Router } from "express";

import {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
} from "./product.controller.js";

import verifyAccessToken from "../../middleware/auth.middleware.js";
import verifyAdmin from "../../middleware/admin.middleware.js";
import upload from "../../middleware/upload.middleware.js";

const router = Router();

// Public routes
router.get("/", getAllProducts);
router.get("/:id", getProductById);

// Admin-only routes
router.post(
    "/",
    verifyAccessToken,
    verifyAdmin,
    upload.single("productImage"),
    createProduct
);

router.put(
    "/:id",
    verifyAccessToken,
    verifyAdmin,
    upload.single("productImage"),
    updateProduct
);

router.delete("/:id", verifyAccessToken, verifyAdmin, deleteProduct);

export default router;
