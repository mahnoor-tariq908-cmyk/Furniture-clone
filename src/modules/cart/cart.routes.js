
import { Router } from "express";
import verifyAccessToken from "../../middleware/auth.middleware.js";
import {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
} from "./cart.controller.js";

const router = Router();

router.use(verifyAccessToken);

router.get("/", getCart);
router.post("/items", addToCart);
router.put("/items/:productId", updateCartItem);
router.delete("/items/:productId", removeCartItem);
router.delete("/", clearCart);

export default router;
