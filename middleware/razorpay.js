const Razorpay = require("razorpay");
const cartHelper = require("../helper/cartHelper");
const Product = require("../model/productModel");


var razorpay = new Razorpay({
  key_id: process.env.KEY_ID,
  key_secret: process.env.KEY_SECRET,
});

const razorpayOrderCreate = async (orderId, totalAmount) => {
  try {
    const orderDetails = await razorpay.orders.create({
      "amount": `${totalAmount * 100}`,
      "currency": "INR",
      "receipt": `${orderId}`,
      payment_capture: 1,
    });
    return orderDetails;
  } catch (error) {
    throw error;
  }
};

const createOrder = async (req, res) => {
  try {
    console.log('inside create order');
    console.log(req.body.totalPrice);
     // Get the user's cart items
     const userId = req.session.user._id;
     let cartItems = await cartHelper.getAllCartItems(userId);
    console.log(cartItems);
     // Check if the cart is empty
     if (!cartItems.length) {
       return res.json({ error: true, message: "Please add items to cart before checkout" });
     }
 
     // Check stock availability for each cart item
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
 
       const availableQuantity = product.productSizes[sizeIndex].quantity;
       if (availableQuantity < quantity) {
         return res.json({ error: true, message: `Insufficient stock for product ${product.productName} in size ${size}` });
       }
     }
     console.log('after for loop');
    const amount = parseInt(req.body.totalPrice);
    console.log(amount);
    const orderDetails = await razorpay.orders.create({
      "amount": `${amount * 100}`,
      "currency": "INR",
      "receipt": String(req.session.user),
      payment_capture: 1,
    });
    console.log(orderDetails);
    res.json({ orderId: orderDetails, totalPrice: req.body.totalPrice });
  } catch (error) {
    console.log(error.message);
  }
};


const verifyPaymentSignature = async (details) => {
  try {
    console.log('inside verifypaymentsignature');
    console.log(details, 'ddddddddddderererererererereretailsssssssssss');
    const { payment } = details;

    console.log(payment.razorpay_order_id);

    let body = payment['razorpay_order_id'] + "|" + payment['razorpay_payment_id'];

    console.log(body, 'bbbbbooooooooddddddyyyyyyyyyyy');

    const crypto = require("crypto");
    let expectedSignature = crypto.createHmac('sha256', `${process.env.KEY_SECRET}`)
      .update(body.toString())
      .digest('hex');

    console.log(expectedSignature, 'eeeeeeeeeeeeeeeeeeeexxxxxxxxxxxxxxxxxxxxxxxxx');

    console.log("sigggggggg receiveddddddddddd ", payment['razorpay_signature']);

    let response = { "signatureIsValid": false };

    if (expectedSignature === payment['razorpay_signature']) {
      response = { "signatureIsValid": true };
    }

    return response;
  } catch (error) {
    throw error;
  }
};



module.exports = {
  razorpayOrderCreate,
  verifyPaymentSignature,
  razorpayOrderCreate,
  createOrder,
}