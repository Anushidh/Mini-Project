const Wallet = require('../model/walletModel')
const { totalAmount } = require('./cartHelper')
const ObjectId = require('mongoose').Types.ObjectId

const getWalletAmount = async (userId) => {
  try {
    // console.log('inside getwalletamount');
    // let userId = req.session.user._id;
      const balance = await Wallet.aggregate([
          {
              $match: {
                  user: new ObjectId(userId)
              }
          },
          {
              $project: {
                  walletBalance: 1
              }
          }
      ]);
      // console.log(balance); 
      const walletBalance = balance.length ? balance[0].walletBalance : 0;
      return walletBalance;
  } catch (error) {
      console.error("Error in fetching wallet amount:", error);
    //   res.status(500).json({ error: "Internal Server Error" });
  }
};

const payUsingWallet = async (userId, amount) => {
  try {
    // console.log('inside payusingwallet');
    const wallet = await Wallet.findOne({ user: userId });
    // console.log(wallet);
    if (!wallet) {
      throw new Error(`Wallet not found for user ${userId}`);
    }

    if (wallet.walletBalance < amount) {
      return false;
    }

    wallet.walletBalance -= amount;
    await wallet.save();
    // console.log(wallet);
    return true;
  } catch (error) {
    console.error("Error paying using wallet:", error);
    throw error;
  }
};

// const payUsingWallet = async (userId, amount) => {
//   try {
//     console.log('inside payusingwallet');
//     let wallet = await Wallet.findOne({ user: userId });
//     console.log(wallet);
//     if (wallet.walletBalance >= amount) {
//       wallet.walletBalance -= amount;
//     } else {
//       return false;
//     }

//     await wallet.save();
//     console.log(wallet);
//     return true;
//   } catch (error) {
//     console.error("Error paying using wallet:", error);
//     throw error;
//   }
// };


module.exports = {
  getWalletAmount,
  payUsingWallet,
}