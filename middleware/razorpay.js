const Razorpay = require("razorpay");


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
    console.log("razorpay orderDetailsorderDetails razorpay :", orderDetails);
    return orderDetails;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const createOrder = async (req, res) => {
  try {
    console.log('inside create order');
    console.log(req.body.totalPrice);
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
    console.log(error);
    throw error;
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