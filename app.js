
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Route imports
import categoryRoutes from "./src/modules/category/category.routes.js";
import productRoutes from "./src/modules/product/product.routes.js";
import userRoutes from "./src/modules/user/user.routes.js";
import authRoutes from "./src/modules/auth/auth.routes.js";
import orderRoutes from "./src/modules/order/order.routes.js";
import cartRoutes from "./src/modules/cart/cart.routes.js";
import addressRoutes from "./src/modules/address/address.routes.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded product and category images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Home route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Furniture Backend is Running",
  });
});

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/address", addressRoutes);
app.use("/api/v1/order", orderRoutes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err.message);

  res.status(err.status || 500).json({
    success: false,
    message:
      err.status && err.status < 500
        ? err.message
        : "Internal Server Error",
  });
});

export default app;
