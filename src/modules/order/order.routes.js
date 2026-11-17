
import { Router } from "express";
import verifyAccessToken from "../../middleware/auth.middleware.js";
import verifyAdmin from "../../middleware/admin.middleware.js";
import {
    createOrder,
    getMyOrders,
    getAllOrders,
    updateOrderStatus,
} from "./order.controller.js";

const router = Router();

router.use(verifyAccessToken);

router.post("/", createOrder);
router.get("/my-orders", getMyOrders);

router.get("/", verifyAdmin, getAllOrders);
router.put("/:id/status", verifyAdmin, updateOrderStatus);

export default router;
