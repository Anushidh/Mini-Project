const User = require("../model/userModel");
const Product = require("../model/productModel");
const Address = require("../model/addressModel");
const mongoose = require('mongoose');
const ObjectId = require("mongoose").Types.ObjectId;
const addressHelper = require("../helper/addressHelper");
const cartHelper = require("../helper/cartHelper");
const orderHelper = require("../helper/orderHelper");
const productHelper = require("../helper/productHelper");
const Order = require('../model/orderModel');
const Cart = require('../model/cartModel');
const Wallet = require('../model/walletModel');
const walletHelper = require("../helper/walletHelper");
const razorpay = require('../middleware/razorpay');
const Coupon = require("../model/couponModel");


const checkout = async (req, res) => {
  try {
    const user = req.session.user;
    const loggedIn = user;
    let totalAmount;
    cartCount = await cartHelper.getCartCount(user._id);
    let cartItems = await cartHelper.getAllCartItems(user._id);
    const cart = await Cart.findOne({ user: user._id });
    totalAmount = cart.totalPrice;
    const userAddress = await addressHelper.findAllAddress(user._id);
    res.render('user/checkout', { loggedIn, loginStatus: req.session.user, user, cartItems, totalAmount: totalAmount, address: userAddress, cartCount, currencyFormat: cartHelper.currencyFormat })
  } catch (error) {
    res.status(500).render('user/404', { loggedIn });
  }
}

const secondTry = async (req, res) => {
  try {
    const orderId = req.body.order_id;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (req.body.payment_method === 'razorpay') {
      const razorpayOrderDetails = await razorpay.razorpayOrderCreate(order._id, order.totalAmount);
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: order._id },
        { paymentStatus: 'success' },
        { new: true }
      );
      res.json({ paymentMethod: 'razorpay', order, razorpayOrderDetails, razorpaykeyId: process.env.razorpay_key_id });
    }
  } catch (error) {
    throw error;
  }
}

const failedRazorpay = async (req, res) => {
  try {
    let userId = req.session.user._id;
    let coupon = req.session.coupon;
    console.log(req.body);
    // Get the selected address ID from the request body
    let selectedAddressId = req.body.selected_address;
    console.log(selectedAddressId);
    // Fetch the address details based on the selected address ID
    const addressData = await Address.findById(selectedAddressId);
    console.log(addressData);
    let paymentStatus = 'pending';
    let cartItems = await cartHelper.getAllCartItems(userId);
    console.log(cartItems, 'cartitemsssssssssssssssssss');
    if (!cartItems.length) {
      return res.json({ error: true, message: "Please add items to cart before checkout" })
    }
    const totalAmount = await cartHelper.totalAmount(userId);
    console.log(typeof totalAmount);
    let wallet = await Wallet.findOne({ user: userId });
    // console.log(wallet);
    if (!wallet) {
      wallet = new Wallet({ user: userId });
      await wallet.save();
    }
    const orderDetails = await orderHelper.forOrderPlacing(req.body, totalAmount, cartItems, userId, coupon, addressData);
    await orderHelper.changeOrderStatus(orderDetails._id, 'confirmed', req.body.payment_method);
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderDetails._id },
      { paymentStatus: 'pending' },
      { new: true }
    );
    await cartHelper.clearTheCart(userId);

  } catch (error) {
    console.log(error);
    res.status(500).render('user/404', { loggedIn });
  }
}


const placeOrder = async (req, res) => {
  try {
    console.log('inside placeorder');
    let userId = req.session.user._id;
    let coupon = req.session.coupon;
    let selectedAddressId = req.body.selected_address;
    const addressData = await Address.findById(selectedAddressId);
    let paymentStatus = 'pending';
    let cartItems = await cartHelper.getAllCartItems(userId);
    // console.log(cartItems, 'cartitemsssssssssssssssssss');
    if (!cartItems.length) {
      return res.json({ error: true, message: "Please add items to cart before checkout" })
    }
    if (req.body.payment_method === undefined) {
      return res.json({ error: true, message: "Please Select any Payment Method before checkout" })
    }
    const cart = await Cart.findOne({ user: userId });
    // console.log(cart);
    const totalAmount = cart.totalPrice;
    // console.log(totalAmount);
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = new Wallet({ user: userId });
      await wallet.save();
    }
    if (req.body.payment_method === 'Cash on Delivery') {
      try {
        if (totalAmount >= 1000) {
          console.log('inside cod');
          const placeOrder = await orderHelper.forOrderPlacing(req.body, totalAmount, cartItems, userId, coupon, addressData);
          console.log('after placeorder');
          await Order.findOneAndUpdate(
            { _id: placeOrder._id },
            { paymentStatus: 'success' },
            { new: true }
          );
          // await productHelper.stockDecrease(cartItems);
          for (let i = 0; i < cartItems.length; i++) {
            const { item: productId, size, quantity } = cartItems[i];
            const product = await Product.findById(productId);
            if (!product) {
              return res.json({ error: true, message: `Product with ID ${productId} not found` });
            }
            const sizeIndex = product.productSizes.findIndex(s => s.size === size);
            if (sizeIndex === -1) {
              return res.json({ error: true, message: `Size ${size} not found for product ${product.productName}` });
            }
            const availableQuantity = product.productSizes[sizeIndex].quantity - quantity;
            console.log(availableQuantity);
            if (availableQuantity >= 0) {
              console.log('inside if');
              product.productSizes[sizeIndex].quantity = availableQuantity;
            } else {
              console.log('inside else');
              return res.json({ error: true, message: `Insufficient stock for product ${product.productName} in size ${size}` });
            }
            await product.save();
          }

          const productIds = cartItems.map(item => item.item);
          const products = await Product.find({ _id: { $in: productIds } });
          for (const product of products) {
            let totalQuantity = 0;
            for (const size of product.productSizes) {
              totalQuantity += size.quantity;
            }
            product.totalQuantity = totalQuantity;
            await product.save();
          }
          await cartHelper.clearTheCart(userId);
          req.session.coupon = null;
          res.status(202).json({ error: false, paymentMethod: 'Cash on Delivery', message: "Purchase Done", totalAmount: totalAmount });
        } else {
          console.log('cod error');
          return res.json({ error: true, paymentMethod: 'Cash on Delivery', message: "Orders with Cash on Delivery are only allowed for total amount greater than 1000", totalAmount: totalAmount });
        }
      } catch (error) {
        console.error('Error processing Cash on Delivery payment:', error);
        res.status(500).json({ error: 'Failed to process payment' });
      }
    }
    else if (req.body.payment_method === 'razorpay') {
      try {
        const orderDetails = await orderHelper.forOrderPlacing(req.body, totalAmount, cartItems, userId, coupon, addressData);
        // const razorpayOrderDetails = await razorpay.razorpayOrderCreate(orderDetails._id, orderDetails.totalAmount);
        await orderHelper.changeOrderStatus(orderDetails._id, 'confirmed', req.body.payment_method);
        const updatedOrder = await Order.findOneAndUpdate(
          { _id: orderDetails._id },
          { paymentStatus: 'success' },
          { new: true }
        );
        // await productHelper.stockDecrease(cartItems);
        for (let i = 0; i < cartItems.length; i++) {
          const { item: productId, size, quantity } = cartItems[i];
          const product = await Product.findById(productId);
          if (!product) {
            return res.json({ error: true, message: `Product with ID ${productId} not found` });
          }
          const sizeIndex = product.productSizes.findIndex(s => s.size === size);
          if (sizeIndex === -1) {
            return res.json({ error: true, message: `Size ${size} not found for product ${product.productName}` });
          }
          const availableQuantity = product.productSizes[sizeIndex].quantity - quantity;
          console.log(availableQuantity);
          if (availableQuantity >= 0) {
            console.log('inside if');
            product.productSizes[sizeIndex].quantity = availableQuantity;
          } else {
            console.log('inside else');
            return res.json({ error: true, message: `Insufficient stock for product ${product.productName} in size ${size}` });
          }
          await product.save();
        }

        const productIds = cartItems.map(item => item.item);
        const products = await Product.find({ _id: { $in: productIds } });
        for (const product of products) {
          let totalQuantity = 0;
          for (const size of product.productSizes) {
            totalQuantity += size.quantity;
          }
          product.totalQuantity = totalQuantity;
          await product.save();
        }
        await cartHelper.clearTheCart(userId);
        req.session.coupon = null;
        res.json({ paymentMethod: 'razorpay', orderDetails, });
      } catch (error) {
        console.error('Error processing Razorpay payment:', error);
        res.status(500).json({ error: 'Failed to process payment' });
      }
    }
    else if (req.body.payment_method === 'wallet') {
      try {
        let isPaymentDone = await walletHelper.payUsingWallet(userId, totalAmount);
        if (isPaymentDone) {
          const orderDetails = await orderHelper.forOrderPlacing(req.body, totalAmount, cartItems, userId, coupon, addressData);
          await orderHelper.changeOrderStatus(orderDetails._id, 'confirmed', req.body.payment_method);
          const updatedOrder = await Order.findOneAndUpdate(
            { _id: orderDetails._id },
            { paymentStatus: 'success' },
            { new: true }
          );
          // await productHelper.stockDecrease(cartItems);
          for (let i = 0; i < cartItems.length; i++) {
            const { item: productId, size, quantity } = cartItems[i];
            const product = await Product.findById(productId);
            if (!product) {
              return res.json({ error: true, message: `Product with ID ${productId} not found` });
            }
            const sizeIndex = product.productSizes.findIndex(s => s.size === size);
            if (sizeIndex === -1) {
              return res.json({ error: true, message: `Size ${size} not found for product ${product.productName}` });
            }
            const availableQuantity = product.productSizes[sizeIndex].quantity - quantity;
            console.log(availableQuantity);
            if (availableQuantity >= 0) {
              console.log('inside if');
              product.productSizes[sizeIndex].quantity = availableQuantity;
            } else {
              console.log('inside else');
              return res.json({ error: true, message: `Insufficient stock for product ${product.productName} in size ${size}` });
            }
            await product.save();
          }

          const productIds = cartItems.map(item => item.item);
          const products = await Product.find({ _id: { $in: productIds } });
          for (const product of products) {
            let totalQuantity = 0;
            for (const size of product.productSizes) {
              totalQuantity += size.quantity;
            }
            product.totalQuantity = totalQuantity;
            await product.save();
          }
          await cartHelper.clearTheCart(userId);
          req.session.coupon = null;
          res.status(202).json({ paymentMethod: 'wallet', message: "Purchase Done" });
        } else {
          res.status(200).json({ paymentMethod: 'wallet', message: "Balance Insufficient in Wallet" });
        }
      } catch (error) {
        console.error('Error processing wallet payment:', error);
        res.status(500).json({ error: 'Failed to process payment' });
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500).render('user/404', { loggedIn });
  }
}

const paymentSuccess = (req, res) => {
  try {
    console.log(req.body);
    const { paymentid, signature, orderId } = req.body;
    const { createHmac } = require("node:crypto");

    const hash = createHmac("sha256", process.env.KEY_SECRET)
      .update(orderId + "|" + paymentid)
      .digest("hex");

    if (hash === signature) {
      console.log("payment success");
      res.status(200).json({ success: true, message: "Payment successful" });
    } else {
      console.log("error");
      res.json({ success: false, message: "Invalid payment details" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


const orderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    let userId = req.session.user._id;
    const loggedIn = userId;
    const order = await Order.findById(orderId);
    const addressId = order.address;
    const userAddress = await Address.findById(addressId);
    const orderDetails = await Order.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(orderId) }
      },
      {
        $unwind: "$orderedItems"
      },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.product",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      {
        $project: {
          orderedItems: 1,
          productDetails: 1,
          orderStatus: 1,
          paymentMethod: 1,
          totalDiscount: 1,
          paymentStatus: 1,
          totalAmount: 1,
        }
      }
    ]);
    res.render('user/order-details', { orderDetails, userAddress, loggedIn });
  } catch (error) {
    console.error('Error in orderDetails:', error);
    res.status(500).send('Internal Server Error');
  }
};


const getOrderList = async (req, res) => {
  try {
    const currentPage = parseInt(req.query.page) || 1; // Get the current page number from the query parameter
    const pageSize = 7; // Set the desired page size to 9
    const allOrderDetails = await Order.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.product",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      {
        $project: {
          orderedItems: 1,
          productDetails: 1,
          userDetails: 1,
          orderStatus: 1,
          totalAmount: 1,
          orderDate: 1,
          paymentMethod: 1
        }
      },
      { $sort: { orderDate: -1 } },
      { $skip: (currentPage - 1) * pageSize },
      { $limit: pageSize }
    ]);
    // console.log(allOrderDetails[0].userDetails);
    // console.log(allOrderDetails);
    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / pageSize);
    // Send the order details as the response
    res.render('admin/order-list', {
      allOrderDetails,
      currentPage,
      totalPages
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getOrderDetailsAdmin = async (req, res) => {
  try {
    // console.log('1');
    const orderId = req.params.orderId;
    // console.log(orderId);

    const orderDetails = await Order.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(orderId) }
      },
      {
        $unwind: "$orderedItems"
      },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.product",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      {
        $lookup: {
          from: "addresses",
          localField: "userDetails._id",
          foreignField: "userId",
          as: "addressDetails"
        }
      },
      {
        $project: {
          orderedItems: 1,
          productDetails: 1,
          userDetails: 1,
          addressDetails: 1,
          orderStatus: 1,
          totalAmount: 1
        }
      }
    ]);

    console.log(orderDetails);
    res.render('admin/order-details', { orderDetails });
  } catch (error) {
    console.error('Error in orderDetails:', error);
    res.status(500).send('Internal Server Error');
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { newStatus } = req.body;
    console.log(orderId + " " + newStatus);
    const order = await Order.findOne({ "orderedItems.orderId": orderId });
    console.log(order);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    order.orderedItems.forEach((item) => {
      if (item.orderId.toString() === orderId) {
        item.orderStat = newStatus;
      }
    });
    if (order.orderedItems.length === 1) {
      // If there is only one ordered item, set the orderStatus to the same value as the orderStat
      order.orderStatus = newStatus;
    } else {
      // If there are multiple ordered items, set the orderStatus based on the individual item statuses
      const hasDeliveredItem = order.orderedItems.some((item) => item.orderStat === "delivered");
      const allItemsDelivered = order.orderedItems.every((item) => item.orderStat === "delivered");
      const allItemsCancelled = order.orderedItems.every((item) => item.orderStat === "cancelled");
      const allItemsReturned = order.orderedItems.every((item) => item.orderStat === "returned");

      if (allItemsDelivered) {
        order.orderStatus = "delivered";
      } else if (hasDeliveredItem) {
        order.orderStatus = "delivered";
      } else if (allItemsCancelled) {
        order.orderStatus = "cancelled";
      } else if (allItemsReturned) {
        order.orderStatus = "returned";
      } else {
        // If there is a mix of different statuses, set the orderStatus to a suitable value
        order.orderStatus = "pending";
      }
    }
    const updatedOrder = await order.save();
    console.log(updatedOrder);
    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const verifyPayment = async (req, res) => {
  console.log('verify payment');
  const userId = req.session.user._id;
  const loggedIn = userId;
  await razorpay.verifyPaymentSignature(req.body)
    .then(async (response) => {
      if (response.signatureIsValid) {
        await orderHelper.changeOrderStatus(req.body['orderDetails[_id]'], "confirmed");
        let cartItems = await cartHelper.getAllCartItems(userId);
        await productHelper.stockDecrease(cartItems);
        await cartHelper.clearTheCart(userId);
        res.status(200).json({ status: true })
      } else {
        res.status(200).json({ status: false })
      }
    })
    .catch((error) => {
      console.log(error);
      res.status(500).render('user/404', { loggedIn });
    })
}

const orderSuccess = (req, res) => {
  try {
    const user = req.session.user;
    const loggedIn = user;
    res.render('user/success', { loginStatus: req.session.user, loggedIn })
  } catch (error) {

    res.status(500).render('user/404', { loggedIn });
  }
}

module.exports = {
  checkout,
  placeOrder,
  orderDetails,
  getOrderList,
  getOrderDetailsAdmin,
  updateOrderStatus,
  orderSuccess,
  verifyPayment,
  secondTry,
  paymentSuccess,
  failedRazorpay,
}





