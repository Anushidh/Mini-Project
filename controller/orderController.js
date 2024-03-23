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
    // console.log('inside placeorder');
    let userId = req.session.user._id;
    // console.log(userId);
    // Access the address details from req.body
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
    // console.log(cartItems, 'cartitemsssssssssssssssssss');

    if (!cartItems.length) {
      return res.json({ error: true, message: "Please add items to cart before checkout" })
    }


    if (address === undefined) {
      return res.json({ error: true, message: "Please Select any Address before checkout" })
    }

    if (req.body.payment_method === undefined) {
      return res.json({ error: true, message: "Please Select any Payment Method before checkout" })
    }
    console.log('1');
    const totalAmount = await cartHelper.totalAmount(userId); // instead find cart using user id and take total amound from that 
    console.log(totalAmount);

    if (req.body.payment_method === 'Cash on Delivery') {
      const placeOrder = await orderHelper.forOrderPlacing(req.body, totalAmount, cartItems, userId)
        .then(async (response) => {
          console.log('inside placeorder');
          await productHelper.stockDecrease(cartItems);
          await cartHelper.clearTheCart(userId);

          // cartCount = await cartHelper.getCartCount(userId)

          res.status(202).json({ paymentMethod: 'Cash on Delivery', message: "Purchase Done" })
        })
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
        $unwind: "$orderedItems" // Since orderedItems is an array, unwind it to access individual elements
      },
      {
        $lookup: {
          from: "products", // Collection name for the Product model
          localField: "orderedItems.product",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      {
        $project: {
          orderedItems: 1, // Include all fields from the orderedItems array
          productDetails: 1, // Include all fields from the productDetails array
          orderStatus: 1
        }
      }
    ]);

    // console.log(orderDetails);
    res.render('user/order-details', { orderDetails }); // Pass orderDetails to the render function
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
        $unwind: "$orderedItems" // Since orderedItems is an array, unwind it to access individual elements
      },
      {
        $lookup: {
          from: "products", // Collection name for the Product model
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
          orderedItems: 1, // Include all fields from the orderedItems array
          productDetails: 1, // Include all fields from the productDetails array
          userDetails: 1,
          orderStatus: 1,
          totalAmount: 1
        }
      }
    ]);

    // console.log(orderDetails);
    res.render('admin/order-details', { orderDetails }); // Pass orderDetails to the render function
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
    // Update the order status
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

module.exports = {
  checkout,
  placeOrder,
  orderDetails,
  getOrderList,
  getOrderDetailsAdmin,
  updateOrderStatus,
}





