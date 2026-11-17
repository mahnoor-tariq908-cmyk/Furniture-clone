
import mongoose from "mongoose";
import Cart from "../../models/Cart.model.js";
import Address from "../../models/Address.model.js";
import Product from "../../models/Product.model.js";
import Order from "../../models/Order.model.js";

// CREATE ORDER
export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { addressId } = req.body;

    if (!mongoose.isValidObjectId(addressId)) {
      return res.status(400).json({
        success: false,
        message: "Valid addressId is required",
      });
    }

    let createdOrder;

    await session.withTransaction(async () => {
      const address = await Address.findOne({
        _id: addressId,
        user: req.user._id,
      }).session(session);

      if (!address) {
        const error = new Error("Shipping address not found");
        error.statusCode = 404;
        throw error;
      }

      const cart = await Cart.findOne({
        user: req.user._id,
      }).session(session);

      if (!cart || cart.items.length === 0) {
        const error = new Error("Your cart is empty");
        error.statusCode = 400;
        throw error;
      }

      const orderItems = [];
      let totalAmount = 0;

      for (const item of cart.items) {
        const product = await Product.findOneAndUpdate(
          {
            _id: item.product,
            productIsActive: true,
            productStock: { $gte: item.quantity },
          },
          {
            $inc: { productStock: -item.quantity },
          },
          {
            new: true,
            session,
          }
        );

        if (!product) {
          const error = new Error(
            "A product is unavailable or has insufficient stock"
          );
          error.statusCode = 400;
          throw error;
        }

        const price = product.productPrice;
        totalAmount += price * item.quantity;

        orderItems.push({
          product: product._id,
          productName: product.productName,
          quantity: item.quantity,
          price,
        });
      }

      const [order] = await Order.create(
        [
          {
            user: req.user._id,
            orderItems,
            shippingAddress: address._id,
            totalAmount,
            paymentMethod: "COD",
          },
        ],
        { session }
      );

      cart.items = [];
      cart.totalAmount = 0;
      await cart.save({ session });

      createdOrder = order;
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: createdOrder,
    });
  } catch (error) {
    console.error("Create order error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.statusCode
          ? error.message
          : "Failed to place order",
    });
  } finally {
    await session.endSession();
  }
};

// GET LOGGED-IN USER'S ORDERS
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user._id,
    })
      .populate("shippingAddress")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("Get my orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your orders",
    });
  }
};

// GET ALL ORDERS (ADMIN)
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("shippingAddress")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("Get all orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

// UPDATE ORDER STATUS (ADMIN)
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    const allowedStatuses = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    if (!allowedStatuses.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { $set: { orderStatus } },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    });
  } catch (error) {
    console.error("Update order status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update order status",
    });
  }
};
