const express=require("express");
const userRoute=express();
const userController=require("../controller/userController"); 
const wishlistController=require("../controller/wishlistController"); 
const cartController=require("../controller/cartController"); 
const orderController=require("../controller/orderController"); 
const couponController=require("../controller/couponController"); 
const addressHelper = require("../helper/addressHelper");
const { isLoggedIn } = require("../middleware/authentication");

// User actions
userRoute.get("/",userController.getHome);
userRoute.get("/login",userController.getLogin);
userRoute.post("/login",userController.userLogin);
userRoute.get("/signup",userController.getSignup);
userRoute.post("/signup",userController.userSignup);
userRoute.get("/otp",userController.getOtp);
userRoute.post("/otp",userController.otpVerify);
// userRoute.get("/resendOtp",userController.resendOtpPage)
userRoute.post("/resendOtp",userController.resendOtp);
userRoute.get("/verifyEmail",userController.getVerifyEmail);
userRoute.post("/VerifyEmail",userController.postVerifyEmail);
userRoute.post("/verifyForgotPassOtp",userController.verifyForgotPassOtp);
userRoute.post("/newPassword",userController.postNewPassword);
userRoute.get("/logout",userController.userLogout);

// Products based routes
userRoute.get("/productDetails/:id", isLoggedIn, userController.getProductDetailsPage);
userRoute.get("/shop",isLoggedIn, userController.getShopPage);
userRoute.get("/filter", isLoggedIn, userController.filterProduct);


// Cart based routes
userRoute.get('/cart',isLoggedIn, cartController.userCart);
userRoute.post("/addToCart/:prodId/:quantity/:size",isLoggedIn, cartController.addToCart);
userRoute.post('/remove-cart-item/:id',isLoggedIn , cartController.removeFromCart);
userRoute.post('/quantity-change',isLoggedIn, cartController.incDecQuantity);

// Wishlist based routes
userRoute.get('/wishlist',isLoggedIn, wishlistController.viewWishlist);
userRoute.post('/addToWishlist/:prodId/:size',isLoggedIn, wishlistController.addToWishlist);
userRoute.post('/removeFromWishlist/:id',isLoggedIn,wishlistController.removeFromWishlist);

// purchase based routes
userRoute.get('/checkoutPage',isLoggedIn,orderController.checkout);
userRoute.post('/place-order',isLoggedIn,orderController.placeOrder);
userRoute.get('/order-details/:orderId',isLoggedIn,orderController.orderDetails);

// User-Account based routes
userRoute.get('/user-profile',isLoggedIn,userController.userProfile);
userRoute.post('/add-address',isLoggedIn,userController.addAddress);
userRoute.get('/edit-address', isLoggedIn,userController.editAddressPage);
userRoute.post('/edit-address', isLoggedIn,userController.updateAddress);
userRoute.post('/change-password', isLoggedIn,userController.updatePassword);
userRoute.post('/cancel-order', isLoggedIn,userController.cancelOrder);

//Coupon based routes
userRoute.post('/applyCoupon', isLoggedIn,couponController.applyCoupon);
userRoute.post('/removeCoupon', isLoggedIn,couponController.removeCoupon);


module.exports=userRoute;