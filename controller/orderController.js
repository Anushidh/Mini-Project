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
    if(req.session.updatedTotal) {
      totalAmount = req.session.updatedTotal;
    } 
    // const coupons = await couponHelper.findAllCoupons();
    const userAddress = await addressHelper.findAnAddress(user._id);
    res.render('user/checkout', { loginStatus : req.session.user, user, cartItems,totalAmount : totalAmount, address: userAddress, cartCount,currencyFormat: cartHelper.currencyFormat})
  } catch (error) {
    console.log(error);
    res.status(500).render('user/404');
  }
}

const placeOrder = async (req, res) => {
  try {
    console.log('inside placeorder');
    let userId = req.session.user._id;
    let coupon = req.session.coupon;
    // console.log(req.body);
    const address = {
      name: req.body.name,
      house: req.body.house,
      city: req.body.city,
      state: req.body.state,
      pincode: req.body.pincode
  };
  // console.log(address);
  //   console.log(req.body.payment_method);

    let cartItems = await cartHelper.getAllCartItems(userId);
    console.log(cartItems, 'cartitemsssssssssssssssssss');

    if (!cartItems.length) {
      return res.json({ error: true, message: "Please add items to cart before checkout" })
    }


    if (address === undefined) {
      return res.json({ error: true, message: "Please Select any Address before checkout" })
    }

    if (req.body.payment_method === undefined) {
      return res.json({ error: true, message: "Please Select any Payment Method before checkout" })
    }
    // console.log('1');
    const totalAmount = await cartHelper.totalAmount(userId);  
    // console.log(totalAmount);
    let wallet = await Wallet.findOne({ user: userId });
    // console.log(wallet);
    if (!wallet) {
      wallet = new Wallet({ user: userId });
      await wallet.save();
    }

    if (req.body.payment_method === 'Cash on Delivery') {
      const placeOrder = await orderHelper.forOrderPlacing(req.body, totalAmount, cartItems, userId, coupon)
        .then(async (response) => {
          console.log('inside placeorder');
          await productHelper.stockDecrease(cartItems);
          await cartHelper.clearTheCart(userId);

          // cartCount = await cartHelper.getCartCount(userId)

          res.status(202).json({ paymentMethod: 'Cash on Delivery', message: "Purchase Done" })
        })
      }  
      else if(req.body.payment_method === 'razorpay') {
        await orderHelper.forOrderPlacing(req.body, totalAmount, cartItems, userId, coupon)
        .then(async (orderDetails) => {
          await razorpay.razorpayOrderCreate(orderDetails._id, orderDetails.totalAmount)
            .then(async (razorpayOrderDetails) => {
              await orderHelper.changeOrderStatus(orderDetails._id, 'confirmed',req.body.payment_method)
              await productHelper.stockDecrease(cartItems)
              await cartHelper.clearTheCart(userId)
              res.json({ paymentMethod: 'razorpay', orderDetails, razorpayOrderDetails, razorpaykeyId: process.env.razorpay_key_id })
            })
        })
    } 
    else if (req.body.payment_method === 'wallet') {
      // console.log('2');
      let isPaymentDone = await walletHelper.payUsingWallet(userId, totalAmount)
      // console.log(isPaymentDone);
      if (isPaymentDone) {
        await orderHelper.forOrderPlacing(req.body, totalAmount, cartItems, userId, coupon)
          .then(async (orderDetails) => {
            await orderHelper.changeOrderStatus(orderDetails._id, 'confirmed',req.body.payment_method)
            await productHelper.stockDecrease(cartItems)
            await cartHelper.clearTheCart(userId)
            // console.log('3');
            res.status(202).json({ paymentMethod: 'wallet', message: "Purchase Done" })
          })
      } else {
        res.status(200).json({ paymentMethod: 'wallet', message: "Balance Insufficient in Wallet" })
      }
    }
      
  } catch (error) {
   
    res.status(500).render('user/404');
  }
}

const orderDetails = async (req, res) => {
  try {
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
        $project: {
          orderedItems: 1, 
          productDetails: 1, 
          orderStatus: 1,
          paymentMethod: 1,
          totalDiscount: 1,
        }
      }
    ]);

    // console.log(orderDetails);
    res.render('user/order-details', { orderDetails }); 
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
    res.render('user/success', { loginStatus : req.session.user })
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
}





