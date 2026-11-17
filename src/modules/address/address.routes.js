
import { Router } from "express";
import verifyAccessToken from "../../middleware/auth.middleware.js";

import {
    createAddress,
    getMyAddresses,
    updateAddress,
    deleteAddress,
} from "./address.controller.js";

const router = Router();

router.use(verifyAccessToken);

router.post("/", createAddress);
router.get("/", getMyAddresses);
router.put("/:id", updateAddress);
router.delete("/:id", deleteAddress);

export default router;
