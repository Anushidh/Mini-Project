const { orders } = require('../controller/userController');
const Order = require('../model/orderModel');
const ObjectId = require('mongoose').Types.ObjectId;
const addressHelper = require('../helper/addressHelper');

function orderDate(){
  const  date = new Date()
  console.log(date);
  return date;
}

const forOrderPlacing = async (order, totalAmount, cartItems, userId1) => {
  try {
    // console.log('inside fororderplacing');
    // console.log(order);
      let status = order.payment_method == 'Cash on Delivery' ? 'confirmed' : 'pending';
      // console.log(status);
      let date = orderDate();
      // console.log(date);
      let userId = userId1;
      // console.log(userId);
      let paymentMethod = order.payment_method;
      // console.log(paymentMethod);
      let address = await addressHelper.findAnAddress(order.address);
      // console.log(address);
      let itemsOrdered = cartItems;
      // console.log(itemsOrdered);
    // console.log('2');
      let completedOrders = new Order({
          user: userId,
          address: address,
          orderDate: date,
          totalAmount: totalAmount,
          paymentMethod: paymentMethod,
          orderStatus: status,
          orderedItems: itemsOrdered
      });

      await completedOrders.save();
      // console.log('3');
      return completedOrders; // Return the saved order
  } catch (error) {
      throw error; // Propagate any errors
  }
};

module.exports = {
  forOrderPlacing,
}