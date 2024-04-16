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


const checkout = async (req, res) => {
  try {
    const user = req.session.user;
    cartCount = await cartHelper.getCartCount(user._id);
    // wishListCount = await wishlistHelper.getWishListCount(user._id)
    let cartItems = await cartHelper.getAllCartItems(user._id);
    let totalAmount = await cartHelper.totalSubtotal(user._id, cartItems);
    req.session.oldTotal = totalAmount;
    // let walletBalance = await walletHelper.getWalletAmount(user._id)
    // walletBalance = currencyFormat(walletBalance);
    if (req.session.updatedTotal) {
      totalAmount = req.session.updatedTotal;
    }
    // const coupons = await couponHelper.findAllCoupons();
    const userAddress = await addressHelper.findAllAddress(user._id);
    // console.log(userAddress);
    res.render('user/checkout', { loginStatus: req.session.user, user, cartItems, totalAmount: totalAmount, address: userAddress, cartCount, currencyFormat: cartHelper.currencyFormat })
  } catch (error) {
    console.log(error);
    res.status(500).render('user/404');
  }
}

const secondTry = async (req,res) => {
  try {
    console.log(req.body);
    const orderId = req.body.order_id; 
    const order = await Order.findById(orderId);
    console.log(order);
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
      console.log(updatedOrder);
      res.json({ paymentMethod: 'razorpay', order, razorpayOrderDetails, razorpaykeyId: process.env.razorpay_key_id });
    }
  } catch (error) {
    console.log(error);
  }
}

const failedRazorpay = async (req,res) => {
  try {
    console.log('inside failedRazorpay');
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
    res.status(500).render('user/404');
  }
}

// const placeOrderRazorpay = async (req,res) => {
//   try {
//     console.log('placeorderrazorpay');
//     let userId = req.session.user._id;
//     let coupon = req.session.coupon;
//   } catch (error) {
//     console.log(error);
//     res.status(500).render('user/404');
//   }
// }

const placeOrder = async (req, res) => {
  try {
    console.log('inside placeorder');
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
    // if (address === undefined) {
    //   return res.json({ error: true, message: "Please Select any Address before checkout" })
    // }
    if (req.body.payment_method === undefined) {
      return res.json({ error: true, message: "Please Select any Payment Method before checkout" })
    }
    // console.log('1');
    const totalAmount = await cartHelper.totalAmount(userId);
    // console.log(typeof totalAmount);
    let wallet = await Wallet.findOne({ user: userId });
    // console.log(wallet);
    if (!wallet) {
      wallet = new Wallet({ user: userId });
      await wallet.save();
    }
    if (req.body.payment_method === 'Cash on Delivery') {
      try {
        if (totalAmount <= 1000) {
          const placeOrder = await orderHelper.forOrderPlacing(req.body, totalAmount, cartItems, userId, coupon, addressData);

          // Update payment status to 'success'
          await Order.findOneAndUpdate(
            { _id: placeOrder._id }, // Use order ID instead of user ID
            { paymentStatus: 'success' },
            { new: true }
          );
          
          // Decrease product stock and clear cart
          await productHelper.stockDecrease(cartItems);
          await cartHelper.clearTheCart(userId);

          res.status(202).json({ paymentMethod: 'Cash on Delivery', message: "Purchase Done", totalAmount: totalAmount });
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

        // Update order status to 'confirmed'
        await orderHelper.changeOrderStatus(orderDetails._id, 'confirmed', req.body.payment_method);

        // Update payment status to 'success'
        
        const updatedOrder = await Order.findOneAndUpdate(
          { _id: orderDetails._id },
          { paymentStatus: 'success' },
          { new: true }
        );

        // Decrease product stock and clear cart
        await productHelper.stockDecrease(cartItems);
        await cartHelper.clearTheCart(userId);

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

          // Update order status to 'confirmed'
          await orderHelper.changeOrderStatus(orderDetails._id, 'confirmed', req.body.payment_method);

          // Update payment status to 'success'
          const updatedOrder = await Order.findOneAndUpdate(
            { _id: orderDetails._id},
            { paymentStatus: 'success' },
            { new: true }
          );

          // Decrease product stock and clear cart
          await productHelper.stockDecrease(cartItems);
          await cartHelper.clearTheCart(userId);

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
    res.status(500).render('user/404');
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
    // console.log(orderId);
    let userId = req.session.user._id;
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
        }
      }
    ]);
    let userAddress = await addressHelper.findAnAddress(userId);
    // console.log(orderDetails);
    res.render('user/order-details', { orderDetails, userAddress });
  } catch (error) {
    console.error('Error in orderDetails:', error);
    res.status(500).send('Internal Server Error');
  }
};


const getOrderList = async (req, res) => {
  try {
    // console.log('1');
    // Fetch all order details using aggregation
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
      }
    ]);
    // console.log(allOrderDetails[0].userDetails);
    // console.log(allOrderDetails);

    // Send the order details as the response
    res.render('admin/order-list', { allOrderDetails });
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
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { orderStatus: newStatus },
      { new: true }
    );
    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const verifyPayment = async (req, res) => {
  console.log('verify payment');
  const userId = req.session.user._id;
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
      res.status(500).render('user/404');
    })
}

const orderSuccess = (req, res) => {
  try {
    res.render('user/success', { loginStatus: req.session.user })
  } catch (error) {

    res.status(500).render('user/404');
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





