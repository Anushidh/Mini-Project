const Wallet = require('../model/walletModel');
const walletHelper = require('../helper/walletHelper');

const getWallet = async (req,res) => {
  try {
    // console.log('1');
    let userId = req.session.user._id;
    let walletAmount = await walletHelper.getWalletAmount(userId);
    // console.log(walletAmount);
    res.render('user/wallet', { walletDetails: walletAmount });
  } catch (error) {
    console.log(error);
    res.status(500).render('user/404');
  }
}

module.exports = {
  getWallet,
}