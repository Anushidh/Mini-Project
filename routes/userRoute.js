const express = require("express");
const userRoute = express();
const userController = require("../controller/userController");
const wishlistController = require("../controller/wishlistController");
const cartController = require("../controller/cartController");
const orderController = require("../controller/orderController");
const couponController = require("../controller/couponController");
const addressHelper = require("../helper/addressHelper");
const razorpay = require("../middleware/razorpay");
const walletController = require("../controller/walletController");
const { isLoggedIn } = require("../middleware/authentication");

// User actions
userRoute.get("/", userController.getHome);
userRoute.get("/login", userController.getLogin);
userRoute.post("/login", userController.userLogin);
userRoute.get("/signup", userController.getSignup);
userRoute.post("/signup", userController.userSignup);
userRoute.get("/otp", userController.getOtp);
userRoute.post("/otp", userController.otpVerify);
userRoute.post("/resendOtp", userController.resendOtp);
userRoute.post("/resendOtpAgain", userController.resendOtpAgain);
userRoute.get("/verifyEmail", userController.getVerifyEmail);
userRoute.post("/VerifyEmail", userController.postVerifyEmail);
userRoute.get("/verifyForgotPassOtp", userController.getForgotPassOtp);
userRoute.post("/verifyForgotPassOtp", userController.verifyForgotPassOtp);
userRoute.get("/newPassword", userController.getNewPassword);
userRoute.post("/newPassword", userController.postNewPassword);
userRoute.get("/logout", userController.userLogout);

// Products based routes
userRoute.get("/productDetails/:id", isLoggedIn, userController.getProductDetailsPage);
userRoute.get("/search-product", isLoggedIn, userController.searchProduct);
userRoute.get("/shop", userController.getShopPage);
userRoute.post("/filter-price", isLoggedIn, userController.filterPrice);
userRoute.get("/filter", isLoggedIn, userController.filterProduct);

// Cart based routes
userRoute.get('/cart', isLoggedIn, cartController.userCart);
userRoute.post('/get-stock-status', cartController.checkStock);
userRoute.post("/addToCart/:prodId/:quantity/:size", isLoggedIn, cartController.addToCart);
userRoute.post('/remove-cart-item/:id', isLoggedIn, cartController.removeFromCart);
userRoute.post('/quantity-change', isLoggedIn, cartController.incDecQuantity);
userRoute.post('/clear-cart', isLoggedIn, cartController.clearCart);

// Wishlist based routes
userRoute.get('/wishlist', isLoggedIn, wishlistController.viewWishlist);
userRoute.post('/addToWishlist/:prodId/:size', isLoggedIn, wishlistController.addToWishlist);
userRoute.post('/removeFromWishlist/:id', isLoggedIn, wishlistController.removeFromWishlist);

// purchase based routes
userRoute.get('/checkoutPage', isLoggedIn, orderController.checkout);
userRoute.post('/place-order', isLoggedIn, orderController.placeOrder);
userRoute.post("/createOrder", isLoggedIn, razorpay.createOrder);
userRoute.post('/paymentSuccess', isLoggedIn, orderController.paymentSuccess);
userRoute.post('/failedRazorpay', isLoggedIn, orderController.failedRazorpay);
userRoute.post('/second-try', isLoggedIn, orderController.secondTry);
userRoute.get('/order-details/:orderId', isLoggedIn, orderController.orderDetails);
userRoute.get('/order-success', isLoggedIn, orderController.orderSuccess);
userRoute.post('/verify-payment', isLoggedIn, orderController.verifyPayment);

// User-Account based routes
userRoute.get('/user-profile', isLoggedIn, userController.userProfile);
userRoute.post('/add-address', isLoggedIn, userController.addAddress);
userRoute.get('/get-address', isLoggedIn, userController.getAddress);
userRoute.delete('/delete-address', isLoggedIn, userController.deleteAddress);
userRoute.post('/updateAddress', isLoggedIn, userController.updateAddress);
userRoute.post('/change-password', isLoggedIn, userController.updatePassword);
userRoute.post('/cancel-product', isLoggedIn, userController.cancelProduct);
userRoute.post('/return-product', isLoggedIn, userController.returnProduct);

//Coupon based routes
userRoute.post('/applyCoupon', isLoggedIn, couponController.applyCoupon);
userRoute.post('/removeCoupon', isLoggedIn, couponController.removeCoupon);

//wallet based routes
userRoute.get('/get-wallet', isLoggedIn, walletController.getWallet);
userRoute.post("/addMoney", isLoggedIn, walletController.addMoneyToWallet);
userRoute.post("/payment-verify", isLoggedIn, walletController.verify_payment);




module.exports = userRoute;