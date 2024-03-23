const Cart = require('../model/cartModel');
const Product = require('../model/productModel');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const addressHelper = require("../helper/addressHelper");
const User = require('../model/userModel');
 
const addToUserCart = async (userId, productId, quantity, size = "Small") => {
  try {
    // console.log('inside helper');
    const product = await Product.findOne({ _id: productId });

    if (!product || product.isBlocked) {
      throw new Error("Product Not Found or Blocked");
    }

    // Find the product size object with the specified size
    const productSize = product.productSizes.find(sizeObj => sizeObj.size === size);

    if (!productSize) {
      throw new Error("Invalid Product Size");
    }

    // Check if the quantity to be added exceeds the available quantity
    if (quantity > productSize.quantity) {
      throw new Error("Requested quantity exceeds available quantity");
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      // If cart doesn't exist, create a new one
      cart = new Cart({ user: userId, items: [] });
    }

    // Check if the product with the same size already exists in the cart
    const existingItem= cart.items.find(item => String(item.productId) === String(productId) && item.size === size);

    if (existingItem) {
      // If the item already exists in the cart, check if adding the new quantity exceeds the limit
      if (existingItem.quantity + quantity > 5) {
        throw new Error("Quantity exceeds the maximum limit (5) for this product size");
      } 
       // If not exceeding the limit, update the quantity
       existingItem.quantity += +quantity;
      } else {
      // If the item doesn't exist, add it to the cart
      cart.items.push({
        productId: productId,
        quantity: quantity,
        size: size // Default size if not specified
      });
    }

    await cart.save();
    return cart;
  } catch (error) {
    console.log('addcart error:', error);
    throw error;
  }
};


async function getMaxQuantityForUser(userId, selectedSize, productId,  quantity) {
  try {
    console.log('inside getMaxQuantityForUser');
    // Fetch the user from the database
    const user = await User.findById(userId);

    // Check if the user exists
    if (!user) {
      throw new Error('User not found');
    }

    // Retrieve the user's cart
    const cart = await Cart.findOne({ user: userId });

    // If the user doesn't have a cart yet, return the default maximum quantity
    if (!cart) {
      return { quantity: 5, existingQuantity: 0 }; // Default maximum quantity
    }

    // Find the item in the cart with the specified productId and selectedSize
    const matchingItem = cart.items.find(item => item.productId.toString() === productId && item.size === selectedSize);
    let existingQuantity = 0;
    if (matchingItem) {
      existingQuantity = matchingItem.quantity;
      quantity -= existingQuantity;
    }

    // If the matching item is found, check if the sum of the quantity passed and the item's quantity is less than or equal to 5
    if (matchingItem && (quantity + existingQuantity) <= 5) {
      return { quantity, existingQuantity }; // Return the quantities if they're valid
    } else {
      return { quantity: 0, existingQuantity }; // Return 0 quantity if the condition is not met or if no matching item is found
    }

  } catch (error) {
    console.error('Error fetching maximum quantity for user:', error);
    throw new Error('Failed to fetch maximum quantity for user');
  }
}


const getCartCount = async (userId) => {
  try {
    // console.log('3');
    let count = 0;
    const cart = await Cart.findOne({ user: userId });
    // console.log('cartttttttttttttttt',cart)
    if (cart) {
      // console.log('4');
      count = cart.items.reduce((total, item) => total + item.quantity, 0);
      // console.log(count);
    }
    // console.log('countssssssss',count)
    return count;
  } catch (error) {
    console.log('getcartcout error');
    throw error;
  }
};

const getAllCartItems = async (userId) => {
  try {
    // console.log('inside getallcartitems');
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
                  product: { $arrayElemAt: ['$product', 0] }
              }
          }
      ]);
      // console.log(userCartItems);
      return userCartItems;
  } catch (error) {
    console.error('Error in getAllCartItems:', error);
      throw error;
  }
};

const totalSubtotal = async (userId, cartItems) => {
  try {
      let cart = await Cart.findOne({ user: userId });
      // console.log(cart);
      let total = 0;
    // console.log(cart,'carttttttttttt11111111')
      if (cart) {
          if (cartItems.length) {
              for (let i = 0; i < cartItems.length; i++) {
                  // Fetch product details for each item in the cartItems array
                  const product = await Product.findById(cartItems[i].item);
                  // console.log(product,'productttttt');
                  // Calculate subtotal for each item and add to total
                  if (product) {
                      total += cartItems[i].quantity * product.salePrice;
                      // console.log(total); // Assuming the price field is named 'price'

                  }
              }
              // console.log(total);
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
    // console.log('removeanitemfromcart');
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

const incDecProductQuantity = async (userId, productId, quantity, selectedSize) => {
  try {
    console.log('inside incdecproductquantity');
    const cart = await Cart.findOne({ user: userId });
    // console.log(cart);
    // Find the item in the cart's items array that matches the productId
    const item = cart.items.find(item => item.productId.toString() === productId);
    // console.log(item);
    if (!item) {
      throw new Error('Product not found in cart');
    }

    // Fetch the product from the database
    const product = await Product.findById(productId);
    // console.log(product);

    // Find the size of the item in the product schema
    const sizeInfo = product.productSizes.find(size => size.size === item.size);
    console.log(sizeInfo);

    if (!sizeInfo) {
      throw new Error('Size information not found for the product');
    }
    // console.log(item.quantity + " " + parseInt(quantity));
    // Calculate the new quantity
    let newQuantity = parseInt(quantity);
    console.log(newQuantity);
    console.log(item.quantity);
    console.log(sizeInfo.quantity);

    if (newQuantity + item.quantity >= sizeInfo.quantity) {
      // If the total quantity exceeds the available quantity, set newQuantity to the maximum allowed quantity
      newQuantity = sizeInfo.quantity - item.quantity;
  }
  
  // Ensure newQuantity is at least 1
  newQuantity = Math.max(1, newQuantity);
    // Update the quantity of the item
    item.quantity = newQuantity;
    // console.log(item.quantity);

    // Save the updated cart
    await cart.save();
    // console.log(item.quantity);
    return newQuantity;
  } catch (error) {
    throw error; // If any error occurs, throw it for handling
  }
};

const totalAmount = async (userId) => {
  try {
    const cart = await Cart.findOne({ user: userId });
    return cart.totalPrice;
  } catch (error) {
    // Handle error if necessary
    throw error;
  }
};

const clearTheCart = async (userId) => {
  try {
    const result = await Cart.findOneAndUpdate(
      { user: userId },
      { $set: { items: [] } },
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
}

