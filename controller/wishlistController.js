const WishList = require('../model/wishlistModel');
const wishlistHelper = require('../helper/wishlistHelper');
const productHelper = require('../helper/productHelper');
const cartHelper = require('../helper/cartHelper');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const addToWishlist = async (req, res) => {
  try {
    // console.log('1');
    let productId = req.params.prodId;
    let user = req.session.user._id
    let size = req.params.size;
    // console.log(productId + " " + user + " " + size);
    let result = await wishlistHelper.addItemToWishlist(productId, user, size)
    // console.log(result);
    res.json({ message: `item added to wishlist ` })
  } catch (error) {
    res.status(500).render('user/404');
  }
}

const viewWishlist = async (req, res) => {
  try {
    let userId = req.session.user._id
    let wishlist = await wishlistHelper.getAllWishlistProducts(userId)
    // console.log(wishlist);
    cartCount = await cartHelper.getCartCount(userId)
    wishListCount = await wishlistHelper.getWishListCount(userId)
    // let stock = await productHelper.stockStatus(wishlist[i].product._id,wishlist[i].size)
    // console.log(stock);
    let stocks = [];
    for (let i = 0; i < wishlist.length; i++) {
      // console.log(wishlist[i].product._id,'iiiiiiiiiiiddd');
      let stock = await productHelper.stockStatus(wishlist[i].product._id, wishlist[i].size);
      // console.log(stock);
      let isInCart = await cartHelper.isAProductInCart(userId, wishlist[i].product._id)
      stocks.push(stock);
      wishlist[i].isInCart = isInCart
    }
    // console.log(stocks);
    res.render('user/wishlist', { loginStatus : req.session.user, wishlist: wishlist, cartCount, wishListCount,stocks })
  } catch (error) {
    console.error(error);
    res.status(500).render('user/404');
  }
}

const removeFromWishlist = async (req, res) => {
  try {
    console.log('removefromwishlist');
    let userId = req.session.user._id
    let productId = req.body.productId
    await wishlistHelper.removeProductFromWishlist(userId, productId)
    wishlistCount = await wishlistHelper.getWishListCount(userId)

    res.status(200).json({ message: 'item removed from the wishlist', wishlistCount })
  } catch (error) {
    console.error(error);
    res.status(500).render('user/404');
  }
}


module.exports = {
  addToWishlist,
  viewWishlist,
  removeFromWishlist,
}