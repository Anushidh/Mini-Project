const Cart = require('../model/cartModel');
const Product = require('../model/productModel');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const addressHelper = require("../helper/addressHelper");
const User = require('../model/userModel');

const addToUserCart = async (userId, productId, quantity, size = "Small") => {
  try {
    const maxUser = 5;
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      const product = await Product.findOne({ _id: productId });
      if (!product || product.isBlocked) {
        throw new Error("Product Not Found or Blocked");
      }
      const productSize = product.productSizes.find(sizeObj => sizeObj.size === size);
      if (quantity > productSize.quantity) {
        throw new Error("Requested quantity exceeds available quantity");
      }
      const totalPrice = product.salePrice * quantity;
      cart = new Cart({ user: userId, items: [] });
      cart.items.push({
        productId: productId,
        quantity: quantity,
        size: size,
        total: totalPrice,// Default size if not specified
      });
    } else {
      let existingItem = cart.items.find(item => String(item.productId) === String(productId) && item.size === size);
      if (existingItem) {
        const newQuantity = quantity + existingItem.quantity;
        if (newQuantity > maxUser) {
          throw new Error("Requested quantity exceeds available quantity");
        }
        const product = await Product.findOne({ _id: productId });
        if (!product || product.isBlocked) {
          throw new Error("Product Not Found or Blocked");
        }
        const productSize = product.productSizes.find(sizeObj => sizeObj.size === size);
        if (newQuantity > productSize.quantity) {
          throw new Error("Requested quantity exceeds available quantity");
        }
        existingItem.quantity = newQuantity;
        existingItem.total = product.salePrice * newQuantity;
      } else {
        const product = await Product.findOne({ _id: productId });
        if (!product || product.isBlocked) {
          throw new Error("Product Not Found or Blocked");
        }
        const productSize = product.productSizes.find(sizeObj => sizeObj.size === size);
        if (quantity > productSize.quantity) {
          throw new Error("Requested quantity exceeds available quantity");
        }
        const totalPrice = product.salePrice * quantity;
        cart.items.push({
          productId: productId,
          quantity: quantity,
          size: size,
          total: totalPrice, // Default size if not specified
        });
      }
    }
    cart.totalPrice = cart.items.reduce((acc, curr) => acc + curr.total, 0);
    await cart.save();
    return cart;
  } catch (error) {
    console.log('addcart error:', error);
    throw error;
  }
};



async function getMaxQuantityForUser(userId, selectedSize, productId, quantity) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return { quantity: 5, existingQuantity: 0 }; 
    }
    const matchingItem = cart.items.find(item => item.productId.toString() === productId && item.size === selectedSize);
    let existingQuantity = 0;
    if (matchingItem) {
      existingQuantity = matchingItem.quantity;
      quantity -= existingQuantity;
    }
    if (matchingItem && (quantity + existingQuantity) <= 5) {
      return { quantity, existingQuantity }; 
    } else {
      return { quantity: 0, existingQuantity }; 
    }
  } catch (error) {
    console.error('Error fetching maximum quantity for user:', error);
    throw new Error('Failed to fetch maximum quantity for user');
  }
}


const getCartCount = async (userId) => {
  try {
    let count = 0;
    const cart = await Cart.findOne({ user: userId });
    if (cart) {
      count = cart.items.reduce((total, item) => total + item.quantity, 0);
    }
    return count;
  } catch (error) {
    throw error;
  }
};

const getAllCartItems = async (userId) => {
  try {
    console.log('inside getallcartitems');
    const userCartItems = await Cart.aggregate([
      {
        $match: { user: new mongoose.Types.ObjectId(userId) }
      },
      {
        $unwind: "$items"
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $project: {
          item: "$items.productId",
          quantity: "$items.quantity",
          size: "$items.size",
          product: { $arrayElemAt: ['$product', 0] },
          total: "$items.total"
        }
      }
    ]);
    return userCartItems;
  } catch (error) {
    console.error('Error in getAllCartItems:', error);
    throw error;
  }
};

const totalSubtotal = async (userId, cartItems) => {
  try {
    let cart = await Cart.findOne({ user: userId }).populate('coupon');
    let total = 0;
    if (cart) {
      if (cartItems.length) {
        for (let i = 0; i < cartItems.length; i++) {
          const product = await Product.findById(cartItems[i].item);
          if (product) {
            total += cartItems[i].quantity * product.salePrice;
          }
        }
      }
      cart.totalPrice = total;
      await cart.save();
    }
    return total;
  } catch (error) {
    throw error;
  }
};

const removeAnItemFromCart = async (cartId, productId, size) => {
  try {
    const result = await Cart.updateOne(
      { _id: cartId },
      { $pull: { items: { productId: productId, size: size } } }
    );
    return result;
  } catch (error) {
    throw error;
  }
};


function currencyFormat(amount) {
  return Number(amount).toLocaleString('en-in', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })
}

const incDecProductQuantity = async (userId, productId, quantity, selectedSize, maxQuantityAllowed) => {
  try {
    const cart = await Cart.findOne({ user: userId });
    const item = cart.items.find(item => item.productId.toString() === productId && item.size === selectedSize);
    let itemQuantity = item.quantity;
    if (!item) {
      return { message: 'Product not found in cart' };
    }
    const product = await Product.findById(productId);
    const sizeInfo = product.productSizes.find(size => size.size === selectedSize);
    if (!sizeInfo) {
      return { message: 'Size information not found for the product' };
    }
    let newQuantity = parseInt(quantity);
    item.quantity = newQuantity;
    if (item.quantity > sizeInfo.quantity) {
      item.quantity = itemQuantity;
      return { message: 'Stock exceeded' };
    }
    await cart.save();
    return newQuantity;
  } catch (error) {
    console.log(error);
  }
};

const updateCartItemTotal = async (cartId, productId, quantity, selectedSize) => {
  try {
    const cart = await Cart.findById(cartId);
    if (!cart) {
      throw new Error("Cart not found");
    }
    const cartItem = cart.items.find(item => String(item.productId) === String(productId) && item.size === selectedSize);
    if (!cartItem) {
      throw new Error("Item not found in the cart");
    }
    const product = await Product.findById(productId);
    if (!product || product.isBlocked) {
      throw new Error("Product not found or blocked");
    }
    const totalPrice = product.salePrice * quantity;
    cartItem.total = totalPrice;
    await cart.save();
    return cart;
  } catch (error) {
    console.error('Error updating cart item total:', error);
    throw error;
  }
};

const totalAmount = async (userId) => {
  try {
    const cart = await Cart.findOne({ user: userId }).populate('coupon');
    if (!cart) {
      return 0; 
    }
    let totalPrice = cart.totalPrice;
    return totalPrice;
  } catch (error) {
    throw error;
  }
};

const clearTheCart = async (userId) => {
  try {
    const result = await Cart.findOneAndUpdate(
      { user: userId },
      { $set: { items: [], totalPrice: null } },
      { new: true }
    );
    return result;
  } catch (error) {
    throw error;
  }
};

const isAProductInCart = async (userId, productId) => {
  try {
    const cart = await Cart.findOne({ user: userId, 'products.productItemId': productId });
    if (cart) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
};


module.exports = {
  addToUserCart,
  getCartCount,
  getAllCartItems,
  totalSubtotal,
  removeAnItemFromCart,
  currencyFormat,
  incDecProductQuantity,
  totalAmount,
  clearTheCart,
  getMaxQuantityForUser,
  isAProductInCart,
  updateCartItemTotal,
}

