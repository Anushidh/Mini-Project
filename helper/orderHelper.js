const { orders } = require('../controller/userController');
const Order = require('../model/orderModel');
const ObjectId = require('mongoose').Types.ObjectId;
const addressHelper = require('../helper/addressHelper');
const Coupon = require('../model/couponModel');

function orderDate(){
  const  date = new Date()
  console.log(date);
  return date;
}

const forOrderPlacing = async (order, totalAmount, cartItems, userId1, coupon, addressData) => {
  try {
    console.log('inside fororderplacing');
    console.log(order);
    let couponUsed = await Coupon.findOne({ couponCode: coupon });

      let status = order.payment_method == 'Cash on Delivery' ? 'confirmed' : 'pending';
      // console.log(status);
      let date = orderDate();
      // console.log(date);
      let userId = userId1;
      // console.log(userId);
      let paymentMethod = order.payment_method;
      console.log(paymentMethod);
      let address = addressData;
      // console.log(address);
      let itemsOrdered = cartItems;
      // console.log(itemsOrdered);
      let couponAmount = couponUsed ? couponUsed.discount : 0;
    // console.log('2');
      let completedOrders = new Order({
          user: userId,
          address: address,
          orderDate: date,
          totalAmount: totalAmount,
          paymentMethod: paymentMethod,
          orderStatus: status,
          orderedItems: itemsOrdered,
          coupon: coupon,
          couponAmount: couponAmount,
      });

      await completedOrders.save();
      // console.log('3');
      return completedOrders; // Return the saved order
  } catch (error) {
      throw error; // Propagate any errors
  }
};

const changeOrderStatus = async (orderId, changeStatus, paymentMethod) => {
  try {
      const orderStatusChange = await Order.findOneAndUpdate(
          { _id: orderId },
          {
              $set: {
                orderStatus: changeStatus,
                paymentMethod: paymentMethod,
              }
          },
          {
              new: true
          }
      );
      console.log(orderStatusChange);
      return orderStatusChange;
  } catch (error) {
      throw new Error('Something went wrong! Failed to change status');
  }
};

const getAllDeliveredOrders = async () => {
  try {
    // console.log('getalldeliveredorders');
      const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const result = await Order.aggregate([
          {
              $match: { orderStatus: 'delivered' }
          },
          {
              $lookup: {
                  from: 'users',
                  localField: 'user',
                  foreignField: '_id',
                  as: 'userDetails'
              }
          },
          {
              $match: {
                  createdAt: { $gte: currentMonthStart }
              }
          }
      ]);
      // console.log(result);
      return result;
  } catch (error) {
      throw error;
  }
};

const getAllDeliveredOrdersByDate = async (startDate, endDate) => {
  try {
      const result = await Order.find({ orderStatus: 'delivered', orderDate: { $gte: startDate, $lt: new Date(endDate.getTime() + 86400000)} }).lean();
      // console.log("orders in range", result);
      return result;
  } catch (error) {
      throw error;
  }
};


module.exports = {
  forOrderPlacing,
  changeOrderStatus,
  getAllDeliveredOrders,
  getAllDeliveredOrdersByDate,
}