import { Router } from "express";

import {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
} from "./user.controller.js";

import verifyAccessToken from "../../middleware/auth.middleware.js";
import verifyAdmin from "../../middleware/admin.middleware.js";

const router = Router();

// Admin-only routes
router.get("/", verifyAccessToken, verifyAdmin, getAllUsers);
router.get("/:id", verifyAccessToken, verifyAdmin, getUserById);
router.put("/:id", verifyAccessToken, verifyAdmin, updateUser);
router.delete("/:id", verifyAccessToken, verifyAdmin, deleteUser);

export default router;