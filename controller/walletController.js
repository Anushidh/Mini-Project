const Wallet = require('../model/walletModel');
const walletHelper = require('../helper/walletHelper');

const getWallet = async (req,res) => {
  try {
    // console.log('1');
    let userId = req.session.user._id;
    const loggedIn = userId;
    let wallet = await Wallet.findById(userId);
    let walletAmount = await walletHelper.getWalletAmount(userId);
    console.log(walletAmount);
    res.render('user/wallet', { walletDetails: walletAmount, loggedIn });
  } catch (error) {
    console.log(error);
    res.status(500).render('user/404');
  }
}

module.exports = {
  getWallet,
}