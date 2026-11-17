
import { Router } from "express";

import {
  registerUser,
  loginUser,
  verifyEmail,
} from "./auth.controller.js";

const router = Router();

// Register a new user and send verification email
router.post("/register", registerUser);

// Verify email using the token received in the email
router.get("/verify-email", verifyEmail);

// Login only after email verification
router.post("/login", loginUser);

export default router;