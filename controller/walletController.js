const Wallet = require('../model/walletModel');
const User = require('../model/userModel');
const walletHelper = require('../helper/walletHelper');
const Razorpay = require("razorpay");
const ObjectId = require('mongoose').Types.ObjectId

let instance = new Razorpay({
  key_id: process.env.KEY_ID,
  key_secret: process.env.KEY_SECRET,
});


const getWallet = async (req, res) => {
  try {
    console.log('inside getwallet');
    let userId = req.session.user._id;
    console.log(userId);
    const loggedIn = userId;
    let user = await User.findById(userId);
    console.log(user);
    const wallet = await Wallet.findOne({ user: userId });
    console.log(wallet);
    let walletAmount = await walletHelper.getWalletAmount(userId);
    console.log(walletAmount);
    res.render('user/wallet', { walletAmount: walletAmount, loggedIn, userDetails: user, walletDetails: wallet });
  } catch (error) {
    console.log(error);
    res.status(500).render('user/404',{loggedIn});
  }
}

const addMoneyToWallet = async (req, res) => {
  try {
    var options = {
      amount: req.body.total * 100,
      currency: "INR",
      receipt: "" + Date.now(),
    };

    instance.orders.create(options, async function (err, order) {
      if (err) {
        console.log("Error while creating order : ", err);
      } else {
        const amount = order.amount / 100;
        console.log(amount);

        // Find the user's wallet and update the walletBalance
        const wallet = await Wallet.findOneAndUpdate(
          { user: req.session.user },
          {
            $inc: { walletBalance: amount },
            $push: {
              history: {
                date: Date.now(),
                status: "credit",
                amount: amount,
              },
            },
          },
          { new: true }
        );

        if (!wallet) {
          // If the wallet doesn't exist, create a new one
          const newWallet = new Wallet({
            user: req.session.user,
            walletBalance: amount,
            history: [
              {
                date: Date.now(),
                status: "credit",
                amount: amount,
              },
            ],
          });
          await newWallet.save();
        }
      }

      res.json({ order: order, razorpay: true });
    });
  } catch (error) {
    console.log(error.message);
  }
};

const verify_payment = async (req, res) => {
  try {
    let details = req.body;
    console.log(details);
    let amount = parseInt(details.order.order.amount) / 100;
    console.log(amount);

    // Find the user's wallet and update the walletBalance
    const wallet = await Wallet.findOneAndUpdate(
      { user: req.session.user },
      { $inc: { walletBalance: amount } },
      { new: true }
    );

    if (!wallet) {
      // If the wallet doesn't exist, create a new one
      const newWallet = new Wallet({
        user: req.session.user,
        walletBalance: amount,
      });
      await newWallet.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  getWallet,
  addMoneyToWallet,
  verify_payment,
}