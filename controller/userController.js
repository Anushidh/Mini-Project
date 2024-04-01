const User = require('../model/userModel');
const Product = require('../model/productModel');
const Category = require('../model/categoryModel');
const productOffer = require('../model/productOfferModel');
const categoryOffer = require('../model/categoryOfferModel');
const userHelper = require('../helper/userHelper');
const productHelper = require("../helper/productHelper");
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const otpHelper = require('../helper/otpHelper');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const passwordHelper = require('../helper/passwordHelper');
const cartHelper = require('../helper/cartHelper');
const addressHelper = require("../helper/addressHelper");
const { v4: uuidv4 } = require("uuid");
const Order = require('../model/orderModel');
const walletHelper = require('../helper/walletHelper');
const walletController=require("../controller/walletController"); 
const Wallet = require('../model/walletModel');
// const { render } = require('../routes/userRoute');



const getHome = async (req, res) => {
  try {
    let userId = req.session.user;
    let products = await productHelper.getAllUnblockedProducts();
    // console.log(products);
    res.render("user/home", {
      products,
      userData: req.session.user
    });
  } catch (error) {
    throw new Error(error.message);
  }
}

const userProfile = async (req, res) => {
  try {
    let userId = req.session.user._id;
    let userAddress = await addressHelper.findAnAddress(userId);
    let userOrders = await Order.find({ user: userId });
    cartCount = await cartHelper.getCartCount(userId);
    // wishListCount = await wishlistHelper.getWishListCount(userId)
    // let walletDetails = await walletHelper.getWalletAmount(userId)
    let allAddress = await addressHelper.findAllAddress(userId);
    res.render('user/profile', { loginStatus: req.session.user, allAddress: allAddress, cartCount, userAddress: userAddress, userOrders: userOrders, formatDate: userHelper.formatDate });
  } catch (error) {
    console.error(error);
    // res.status(500).render('user/404');
  }
}

const addAddress = async (req, res) => {
  try {
    // console.log('1');
    // console.log(req.body);
    addressHelper.addAddress(req.body)
      .then((result) => {
        res.status(202).json({ message: "address added successfully" })
      })
    // console.log('4');
  } catch (error) {

    res.status(500).render('user/404');
  }
}

const updateAddress = async (req, res) => {
  try {
    console.log(req.body);
    // Wait for the address to be edited before redirecting
    await addressHelper.editAddress(req.body);
    let userId = req.session.user._id;
    // Fetch the user's address details from the database
    let userAddress = await addressHelper.findAnAddress(userId);
    //  console.log(userAddress);

    cartCount = await cartHelper.getCartCount(userId);
    // wishListCount = await wishlistHelper.getWishListCount(userId)

    let allAddress = await addressHelper.findAllAddress(userId);
    res.render('user/profile', { loginStatus: req.session.user, allAddress: allAddress, cartCount, userAddress: userAddress, });


  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).render('user/404');
  }
};


const editAddressPage = async (req, res) => {
  try {
    let userId = req.session.user._id;
    // Fetch the user's address details from the database
    let userAddress = await addressHelper.findAnAddress(userId);
    //  console.log(userAddress);

    cartCount = await cartHelper.getCartCount(userId);
    // wishListCount = await wishlistHelper.getWishListCount(userId)

    let allAddress = await addressHelper.findAllAddress(userId);
    // console.log(allAddress);
    // res.redirect('/edit-address');
    res.render('user/edit-address', { loginStatus: req.session.user, allAddress: allAddress, cartCount, userAddress: userAddress, });
  } catch (error) {
    res.status(500).render('user/404');
  }

}


const getProductDetailsPage = async (req, res) => {
  try {
    // console.log('1');
    const user = req.session.user
    // console.log("wrking");
    const id = req.params.id
    // console.log(id);
    const findProduct = await Product.findOne({ _id: id });
    // console.log('product is is here',findProduct);
    // console.log(findProduct.id, "Hello world");
    let products = await productHelper.getAllUnblockedProducts();
    if (findProduct) {
      res.render("user/product-details", { data: findProduct, user: user, products })

    } else {
      res.render("user/product-details", { data: findProduct })

    }
  } catch (error) {
    console.log(error.message);
  }
}

const getShopPage = async (req, res) => {
  try {
    const sort = req.query.sort;
    // console.log(sort);
    const user = req.session.id;
    let currentProduct;

    if (sort === "highToLow") {
      currentProduct = await Product.find({ isBlocked: false }).sort({ salePrice: -1 });
    } else if (sort === "lowToHigh") {
      currentProduct = await Product.find({ isBlocked: false }).sort({ salePrice: 1 });
    } else if (sort === "releaseDate") {
      currentProduct = await Product.find({ isBlocked: false }).sort({ createdAt: 1 });
    } else {
      currentProduct = await Product.find({ isBlocked: false });
    }

    const productOffers = await productOffer.find({ "productOffer.offerStatus": true }).populate('productOffer.product');
    const categoryOffers = await categoryOffer.find({ "categoryOffer.offerStatus": true }).populate('categoryOffer.category');

    const count = await Product.find({ isBlocked: false }).count();
    const categories = await Category.find({ isBlocked: false });

    const itemsPerPage = 8;
    const currentPage = parseInt(req.query.page) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const totalPages = Math.ceil(currentProduct.length / itemsPerPage);
    const productsOnPage = currentProduct.slice(startIndex, endIndex);

    res.render("user/shop", {
      user: user,
      product: productsOnPage,
      category: categories,
      productOffers: productOffers,
      categoryOffers: categoryOffers,
      count: count,
      totalPages: totalPages,
      currentPage: currentPage,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const filterPrice = async (req,res) => {
  try {
    console.log('1');
    const { minPrice, maxPrice } = req.body;
    const filteredProducts = await Product.find({
        salePrice: { $gte: minPrice, $lte: maxPrice }
    });
    
    res.json({ success: true, product: filteredProducts });
} catch (error) {
    console.error('Error filtering products:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
}
}
// const filterProduct = async (req, res) => {
//   try {
//     const categoryId = req.query.category;
//     // console.log(categoryId);
//     const user = req.session.id;
//     const products = await Product.find({ category: categoryId, isBlocked: false });

//     const count = products.length;
//     const categories = await Category.find({ isBlocked: false });

//     const itemsPerPage = 8;
//     const currentPage = parseInt(req.query.page) || 1;
//     const startIndex = (currentPage - 1) * itemsPerPage;
//     const endIndex = startIndex + itemsPerPage;
//     const totalPages = Math.ceil(products.length / itemsPerPage);
//     const productsOnPage = products.slice(startIndex, endIndex);

//     res.render("user/shop", {
//       user: user,
//       product: productsOnPage,
//       category: categories,
//       count: count,
//       totalPages: totalPages,
//       currentPage: currentPage,
//     });
//   } catch (error) {
//     console.log(error.message);
//     res.status(500).send("Internal Server Error");
//   }
// };



const getLogin = async (req, res) => {
  try {
    res.render("user/login");
  } catch (error) {
    throw new Error(error.message);
  }
}


const getSignup = async (req, res) => {
  try {
    res.render("user/register");
  } catch (error) {
    throw new Error(error.message);
  }
}

const getOtp = async (req, res) => {
  try {
    res.render("user/verify-otp");
  } catch (error) {
    throw new Error(error.message);
  }
}


const userSignup = async (req, res) => {
  const { username, email, phone, password } = req.body;
  // let email = req.body.email;
  const findUser = await User.findOne({ email });
  if (!findUser) {
    var otp = await otpHelper.generateOtp();
    console.log(otp);
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Account ✔',
      text: `Your OTP is ${otp}`,
      html: `<b>  <h4 >Your OTP  ${otp}</h4>    <br>  <a href="">Click here</a></b>`
    });
    if (info) {
      req.session.userOtp = otp
      req.session.userData = req.body
      console.log('inside info');
      res.render("user/verify-otp", { email })
      console.log("Email sent", info.messageId);
      // const newUser = await User.create(req.body);
    } else {
      res.json("email-error");
    }
  }
  else {
    res.redirect("/login");
  }
}


const otpVerify = async (req, res) => {
  console.log('otp verify');
  const { otp } = req.body;
  if (otp === req.session.userOtp) {
    const user = req.session.userData
    const passwordHash = await passwordHelper.securePassword(user.password)
    const referalCode = uuidv4()
    console.log("the referralCode  =>" + referalCode);

    const saveUserData = new User({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: passwordHash,
      referalCode: referalCode
    })
    await saveUserData.save()
    req.session.user = saveUserData._id
    res.redirect('/login')
  }
  else {
    console.log('otp not matching');
    res.json("status wrong");
  }
}


const resendOtp = async (req, res) => {
  try {
    console.log('inside resendotp');
    if (req.session.userData && req.session.userData.email) {
      const email = req.session.userData.email;
      var newOtp = await otpHelper.generateOtp();
      console.log(newOtp);

      const transporter = nodemailer.createTransport({
        service: "gmail",
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      const info = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Resend OTP ✔",
        text: `Your new OTP is ${newOtp}`,
        html: `<b>  <h4 >Your new OTP is ${newOtp}</h4>    <br>  <a href="">Click here</a></b>`,
      });

      if (info) {
        req.session.userOtp = newOtp;
        res.json({ success: true, message: 'OTP resent successfully' });
        console.log("Email resent", info.messageId);
      } else {
        res.json({ success: false, message: 'Failed to resend OTP' });
      }
    }
    else {
      res.json({ success: false, message: 'User data is undefined or missing email' });
    }
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: 'Error in resending OTP' });

  }
}

const userLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const findUser = await User.findOne({ isAdmin: '0', email: email });

    if (findUser) {
      const isUserNotBlocked = !findUser.isBlocked;

      if (isUserNotBlocked) {
        const samePassword = await bcrypt.compare(password, findUser.password);

        if (samePassword) {
          // Store user information in session
          req.session.user = findUser;
          // console.log(req.session.user.id);

          // Assuming products are retrieved from the database and stored in a variable
          const products = await Product.find(); // Adjust this according to your actual retrieval method

          // Set a success flash message
          req.flash('success', 'Login successful');

          // console.log(req.flash('success')[0]);
          // Pass products data to the home page
          res.render("user/home", { products: products, successMessage: req.flash('success') });
        } else {
          // Set an error flash message for incorrect password
          req.flash('error', 'Incorrect password');
          // Incorrect password
          const errorMessage = req.flash('error')[0];
          console.log(errorMessage);
          res.render("user/login", { errorMessage: req.flash('error')[0] });
        }
      } else {
        // Set an error flash message for blocked user
        req.flash('error', 'User has been blocked');

        // Render the login page with error message
        res.render("user/login", { errorMessage: req.flash('error')[0] });
      }
    } else {
      // Set an error flash message for user not found
      req.flash('error', 'User not found');

      // Render the login page with error message
      res.render("user/login", { errorMessage: req.flash('error')[0] });
    }
  } catch (error) {
    // Handle database errors or other exceptions
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
};

const getVerifyEmail = async (req, res) => {
  try {
    res.render("user/verify-email");
  } catch (error) {
    throw new Error(error.message);
  }
}

const postVerifyEmail = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if the email is provided
    if (!email) {
      return res.status(400).render("forgot-password", { message: "Email is required" });
    }

    // Check if a user with the provided email exists
    const findUser = await User.findOne({ email });

    if (!findUser) {
      return res.status(404).render("forgot-password", { message: "User with this email does not exist" });
    }

    // Generate OTP
    const otp = await otpHelper.generateOtp();
    console.log(otp);

    // Send OTP via email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify Your Account ✔",
      text: `Your OTP is ${otp}`,
      html: `<b><h4>Your OTP: ${otp}</h4><br><a href="">Click here to verify</a></b>`,
    });

    if (!info) {
      throw new Error("Failed to send OTP email");
    }

    // Store OTP and user email in session
    req.session.userOtp = otp;
    req.session.email = email;

    // Render OTP verification page
    res.render("user/forgotPass-otp");

    console.log("Email sent successfully", info.messageId);
  } catch (error) {
    console.error("Error in forgotEmailValid:", error.message);
    res.status(500).render("forgot-password", { message: "An error occurred while processing your request" });
  }
};

const verifyForgotPassOtp = async (req, res) => {
  try {
    console.log(req.body.otp);
    const enteredOtp = req.body.otp
    if (enteredOtp === req.session.userOtp) {
      res.render("user/reset-password.ejs");
    } else {
      console.log('password not reset');
      res.json({ status: false })
    }
  } catch (error) {
    console.log(error.message);
  }
}

const postNewPassword = async (req, res) => {
  try {
    const { newPass } = req.body
    const email = req.session.email
    console.log(email);
    console.log(newPass);
    if (newPass) {
      console.log('1');
      const passwordHash = await passwordHelper.securePassword(newPass)
      await User.updateOne(
        { email: email },
        {
          $set: {
            password: passwordHash
          }
        }
      )
        .then((data) => console.log(data))
      res.redirect("/login")
    } else {
      console.log("Password not match");
      res.render("/user/reset-password", { message: "Password not matching" })
    }


  } catch (error) {
    console.log(error.message);
  }
}


const updatePassword = async (req, res) => {
  try {
    console.log('1');
    const { currentPassword, newPassword } = req.body;
    console.log(currentPassword);
    console.log(newPassword);

    // Retrieve the user from the database
    const user = await User.findById(req.session.user._id); // Assuming you have implemented authentication middleware to set req.user

    // Verify if the current password matches the one stored in the database
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid current password' });
    }

    const hashedPassword = await passwordHelper.securePassword(newPassword)

    // Update the user's password in the database
    user.password = hashedPassword;
    await user.save();
    console.log('2');
    // Send a success response
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const userLogout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log(err.message);
      }
      console.log("Logged out");
      res.redirect("/login")
    })
  } catch (error) {
    console.log(error.message);
  }
}

const cancelOrder = async (req, res) => {
  try {
    console.log('inside cancel order');
    const { orderId } = req.body;
    console.log(orderId);
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    console.log(order);
     let totalAmount = order.totalAmount;
     
     console.log(totalAmount);
    if (order.orderStatus === 'confirmed' || order.orderStatus === 'pending') {
      const wallet = await Wallet.findOne({ user: req.session.user._id });
      console.log(wallet);
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }
      wallet.walletBalance += totalAmount;
      await wallet.save();
      console.log(wallet);
      order.orderStatus = 'cancelled';
      await order.save();
      console.log(order);
      for (const item of order.orderedItems) {
        const product = await Product.findById(item.product);
        if (!product) {
          console.error(`Product not found for item: ${item}`);
          continue; 
        }
        if (!product.productSizes || !Array.isArray(product.productSizes)) {
          console.error(`Product sizes not defined or not an array for product: ${product}`);
          continue; 
        }
        const sizeIndex = product.productSizes.findIndex(size => size.size === item.size);
        if (sizeIndex !== -1) {
          
          product.productSizes[sizeIndex].quantity += item.quantity;
          await product.save();
        } else {
          console.error(`Size ${item.size} not found for product: ${product}`);
        }
      }
     
      return res.status(200).json({ message: 'Order cancelled successfully' });
    } else {
      
      return res.status(400).json({ error: 'Order cannot be cancelled' });
    }
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const returnOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.orderStatus === 'delivered') {
      order.orderStatus = 'returned';
      await order.save();
      for (const item of order.orderedItems) {
        const product = await Product.findById(item.product);
        if (!product) {
          console.error(`Product not found for item: ${item}`);
          continue;
        }
        if (!product.productSizes || !Array.isArray(product.productSizes)) {
          console.error(`Product sizes not defined or not an array for product: ${product}`);
          continue;
        }
        const sizeIndex = product.productSizes.findIndex(size => size.size === item.size);
        if (sizeIndex !== -1) {
          product.productSizes[sizeIndex].quantity += item.quantity;
          await product.save();
        } else {
          console.error(`Size ${item.size} not found for product: ${product}`);
        }
      }
      return res.status(200).json({ message: 'Order returned successfully' });
    } else {
      return res.status(400).json({ error: 'Order cannot be returned' });
    }
  } catch (error) {
    console.error('Error returning order:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const searchProduct = async (req, res) => {
  try {
    const { productName } = req.body;
    console.log(productName);
    const regex = new RegExp(productName, 'i');
    const product = await Product.findOne({ productName: { $regex: regex } });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({ productId: product._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


module.exports = {
  getHome,
  getLogin,
  getSignup,
  userSignup,
  otpVerify,
  getOtp,
  userLogin,
  resendOtp,
  getVerifyEmail,
  postVerifyEmail,
  verifyForgotPassOtp,
  postNewPassword,
  getProductDetailsPage,
  getShopPage,
  userProfile,
  addAddress,
  editAddressPage,
  updateAddress,
  userLogout,
  updatePassword,
  cancelOrder,
  filterPrice,
  searchProduct,
  returnOrder,
}




