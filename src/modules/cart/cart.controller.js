
import mongoose from "mongoose";
import Cart from "../../models/Cart.model.js";
import Product from "../../models/Product.model.js";

// Convert quantity from form/JSON input into a valid number
const parseQuantity = (value) => {
  const quantity = Number(value);

  if (
    value === undefined ||
    value === null ||
    value === "" ||
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    return null;
  }

  return quantity;
};

// Recalculate total using saved cart item prices
const calculateTotal = (cart) => {
  cart.totalAmount = cart.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
};

// Return cart with product details populated
const getPopulatedCart = async (cartId) => {
  return Cart.findById(cartId).populate(
    "items.product",
    "productName productImage productPrice productStock productIsActive"
  );
};

// GET USER CART
export const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({
      user: req.user._id,
    });

    if (!cart) {
      cart = await Cart.create({
        user: req.user._id,
        items: [],
        totalAmount: 0,
      });
    }

    const populatedCart = await getPopulatedCart(cart._id);

    return res.status(200).json({
      success: true,
      data: populatedCart,
    });
  } catch (error) {
    console.error("Get cart error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch cart",
    });
  }
};

// ADD PRODUCT TO CART
export const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const quantity = parseQuantity(req.body.quantity ?? 1);

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    if (quantity === null) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive whole number",
      });
    }

    const product = await Product.findOne({
      _id: productId,
      productIsActive: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or unavailable",
      });
    }

    if (product.productStock < quantity) {
      return res.status(400).json({
        success: false,
        message: "Not enough stock available",
      });
    }

    let cart = await Cart.findOne({
      user: req.user._id,
    });

    if (!cart) {
      cart = new Cart({
        user: req.user._id,
        items: [],
        totalAmount: 0,
      });
    }

    const item = cart.items.find(
      (entry) => entry.product.toString() === productId
    );

    const newQuantity = item
      ? item.quantity + quantity
      : quantity;

    if (newQuantity > product.productStock) {
      return res.status(400).json({
        success: false,
        message: "Not enough stock available",
      });
    }

    if (item) {
      item.quantity = newQuantity;
      item.price = product.productPrice;
    } else {
      cart.items.push({
        product: product._id,
        quantity,
        price: product.productPrice,
      });
    }

    calculateTotal(cart);
    await cart.save();

    const populatedCart = await getPopulatedCart(cart._id);

    return res.status(200).json({
      success: true,
      message: "Product added to cart successfully",
      data: populatedCart,
    });
  } catch (error) {
    console.error("Add to cart error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add product to cart",
    });
  }
};

// UPDATE CART ITEM QUANTITY
export const updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const quantity = parseQuantity(req.body.quantity);

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    if (quantity === null) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive whole number",
      });
    }

    const cart = await Cart.findOne({
      user: req.user._id,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const item = cart.items.find(
      (entry) => entry.product.toString() === productId
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    const product = await Product.findOne({
      _id: productId,
      productIsActive: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product is unavailable",
      });
    }

    if (quantity > product.productStock) {
      return res.status(400).json({
        success: false,
        message: "Not enough stock available",
      });
    }

    item.quantity = quantity;
    item.price = product.productPrice;

    calculateTotal(cart);
    await cart.save();

    const populatedCart = await getPopulatedCart(cart._id);

    return res.status(200).json({
      success: true,
      message: "Cart updated successfully",
      data: populatedCart,
    });
  } catch (error) {
    console.error("Update cart error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update cart",
    });
  }
};

// REMOVE PRODUCT FROM CART
export const removeCartItem = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const cart = await Cart.findOne({
      user: req.user._id,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const initialLength = cart.items.length;

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    if (cart.items.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    calculateTotal(cart);
    await cart.save();

    const populatedCart = await getPopulatedCart(cart._id);

    return res.status(200).json({
      success: true,
      message: "Product removed from cart",
      data: populatedCart,
    });
  } catch (error) {
    console.error("Remove cart item error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove product from cart",
    });
  }
};

// CLEAR ENTIRE CART
export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({
      user: req.user._id,
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.items = [];
    cart.totalAmount = 0;

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      data: cart,
    });
  } catch (error) {
    console.error("Clear cart error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to clear cart",
    });
  }
};
