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
const walletController = require("../controller/walletController");
const Wallet = require('../model/walletModel');
const Address = require('../model/addressModel');
// const { render } = require('../routes/userRoute');


const getHome = async (req, res) => {
  try {
    const userId = req.session.user;
    let products = await productHelper.getAllUnblockedProducts();
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
    const loggedIn = userId;
    let userDetails = await User.findById(userId);
    let userOrders = await Order.find({ user: userId }).sort({ orderDate: -1 });;
    let allAddress = await addressHelper.findAllAddress(userId);

    const pageSize = 10;
    const totalPages = Math.ceil(userOrders.length / pageSize);
    const currentPage = req.query.page ? parseInt(req.query.page) : 1;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    const paginatedOrders = userOrders.slice(startIndex, endIndex);

    res.render('user/profile', {
      loggedIn,
      loginStatus: req.session.user,
      allAddress: allAddress,
      userOrders: paginatedOrders,
      formatDate: userHelper.formatDate,
      userDetails: userDetails,
      currentPage,
      totalPages
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('user/404', { loggedIn });
  }
};

const addAddress = async (req, res) => {
  try {
    let userId = req.session.user._id;
    const loggedIn = userId;
    addressHelper.addAddress(req.body)
      .then((result) => {
        res.status(202).json({ message: "address added successfully" })
      })
  } catch (error) {
    res.status(500).render('user/404', { loggedIn });
  }
}

const getAddress = async (req, res) => {
  try {
    const addressId = req.query.id;
    const address = await Address.findById(addressId);
    res.status(200).json(address);
  } catch (error) {
    console.error('Error fetching address:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.query.id;
    await Address.deleteOne({ _id: addressId });
    res.status(200).json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const updateAddress = async (req, res) => {
  try {
    const { _id, name, house, city, state, pincode } = req.body;
    const updatedAddress = await Address.findByIdAndUpdate(_id, { name, house, city, state, pincode }, { new: true });
    res.status(200).json({ message: 'Address updated successfully', address: updatedAddress });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};



const searchProduct = async (req, res) => {
  try {
    const { query } = req.query;
    const user = req.session.user
    const loggedIn = user;
    let products;
    if (req.session.category) {
      products = await Product.find({
        isBlocked: false,
        productName: { $regex: new RegExp(query, 'i') },
        category: req.session.category, // This will only be included if a categoryId is available
      });
    }
    else if (req.session.sort) {
      if (req.session.sort === "highToLow") {
        products = await Product.find({
          productName: { $regex: new RegExp(query, 'i') },
          isBlocked: false,
        }).sort({ salePrice: -1 });
      }
      else if (req.session.sort === "lowToHigh") {
        products = await Product.find({
          productName: { $regex: new RegExp(query, 'i') },
          isBlocked: false,
        }).sort({ salePrice: 1 });
      }
      else if (req.session.sort === "releaseDate") {
        products = await Product.find({
          productName: { $regex: new RegExp(query, 'i') },
          isBlocked: false,
        }).sort({ createdAt: 1 });
      }

    }
    else {
      products = await Product.find({
        productName: { $regex: new RegExp(query, 'i') },
        isBlocked: false,
      });
    }
    const productOffers = await productOffer.find({ "productOffer.offerStatus": true }).populate('productOffer.product');
    const categoryOffers = await categoryOffer.find({ "categoryOffer.offerStatus": true }).populate('categoryOffer.category');
    const categories = await Category.find({ isBlocked: false });
    res.json(products,
      loggedIn,
      productOffers,
      categoryOffers,
      categories,);
  } catch (error) {
    console.error('Error searching for products:', error);
    res.status(500).json({ error: 'Error searching for products' });
  }
}

const getProductDetailsPage = async (req, res) => {
  try {
    const user = req.session.user;
    const loggedIn = user;
    const id = req.params.id
    const findProduct = await Product.findOne({ _id: id });
    let products = await productHelper.getAllUnblockedProducts();
    if (findProduct) {
      res.render("user/product-details", { data: findProduct, user: user, products, loggedIn: loggedIn })

    } else {
      res.render("user/product-details", { data: findProduct, loggedIn: loggedIn })

    }
  } catch (error) {
    console.log(error.message);
  }
}

const getShopPage = async (req, res) => {
  try {
    const sort = req.query.sort;
    req.session.sort = sort;
    const user = req.session.id;
    const loggedIn = user;
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
      loggedIn: loggedIn,
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

const filterPrice = async (req, res) => {
  try {
    const user = req.session.id;
    const loggedIn = user;
    const { minPrice, maxPrice } = req.body;
    const filteredProducts = await Product.find({
      salePrice: { $gte: minPrice, $lte: maxPrice }
    });
    const count = filteredProducts.length;
    const categories = await Category.find({ isBlocked: false });
    const itemsPerPage = 8;
    const currentPage = parseInt(req.query.page) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const productsOnPage = filteredProducts.slice(startIndex, endIndex);
    res.render("user/shop", {
      loggedIn: loggedIn,
      user: user,
      product: productsOnPage,
      category: categories,
      count: count,
      totalPages: totalPages,
      currentPage: currentPage,
    });
  } catch (error) {
    console.error('Error filtering products:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}


const filterProduct = async (req, res) => {
  try {
    const categoryId = req.query.category;
    req.session.category = categoryId;
    const user = req.session.id;
    const loggedIn = user;
    const products = await Product.find({ category: categoryId, isBlocked: false });
    const count = products.length;
    const categories = await Category.find({ isBlocked: false });
    const itemsPerPage = 8;
    const currentPage = parseInt(req.query.page) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const totalPages = Math.ceil(products.length / itemsPerPage);
    const productsOnPage = products.slice(startIndex, endIndex);
    res.render("user/shop", {
      loggedIn: loggedIn,
      user: user,
      product: productsOnPage,
      category: categories,
      count: count,
      totalPages: totalPages,
      currentPage: currentPage,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};


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
  try {
    const { username, email, phone, password, referral } = req.body;
    req.session.referral = referral;
    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }
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
        res.render("user/verify-otp", { email })
      } else {
        res.json("email-error");
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}


const otpVerify = async (req, res) => {
  try {
    const { otp } = req.body;
    if (otp === req.session.userOtp) {
      const user = req.session.userData
      const passwordHash = await passwordHelper.securePassword(user.password)
      const referralCode = await generateRandomString();
      let newUserWallet;
      if (req.session.referral) {
        const existingUser = await User.findOne({ referralCode: req.session.referral });
        if (existingUser) {
          // Referrer found, add 50rs to their wallet balance
          const wallet = await Wallet.findOne({ user: existingUser._id });
          if (wallet) {
            wallet.walletBalance += 50;
            await wallet.save();
          } else {
            // If the wallet doesn't exist for the user, create a new one
            const newWallet = new Wallet({
              user: existingUser._id,
              walletBalance: 50
            });
            await newWallet.save();
          }
        }
      }
      const saveUserData = new User({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: passwordHash,
        referralCode: referralCode
      })
      await saveUserData.save()
      const existingUser = await User.findOne({ referralCode: req.session.referral });
      if (existingUser) {
        const newUserWallet = new Wallet({
          user: saveUserData._id,
          walletBalance: 50
        });
        await newUserWallet.save();
      }
      else {
        const newUserWallet = new Wallet({
          user: saveUserData._id,
          walletBalance: 0
        });
        await newUserWallet.save();
      }
      req.session.user = saveUserData._id
      res.json({ success: true });
    }
    else {
      res.json({ success: false, message: "Invalid OTP" });
    }
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "An error occurred. Please try again later." });
  }
}

function generateRandomString() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 15; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  return result;
}

const resendOtp = async (req, res) => {
  try {
    if (req.session.userData && req.session.userData.email) {
      const email = req.session.userData.email;
      var newOtp = await otpHelper.generateOtp();
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

  try {
    const { email, password } = req.body;
    const findUser = await User.findOne({ isAdmin: '0', email: email });
    if (findUser) {
      const isUserNotBlocked = !findUser.isBlocked;
      if (isUserNotBlocked) {
        const samePassword = await bcrypt.compare(password, findUser.password);
        if (samePassword) {
          req.session.user = findUser;
          const products = await Product.find();
          res.json({ success: true });
        } else {
          res.json({ success: false, message: "Incorrect password" });
        }
      } else {
        res.json({ success: false, message: "User has been blocked" });
      }
    } else {
      res.json({ success: false, message: "User not found" });
    }
  } catch (error) {
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
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    const findUser = await User.findOne({ email });
    if (!findUser) {
      return res.status(404).json({ success: false, message: "User with this email does not exist" });
    }
    const otp = await otpHelper.generateOtp();
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
    req.session.userOtp = otp;
    req.session.email = email;
    res.json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    console.error("Error in forgotEmailValid:", error.message);
    res.status(500).json({ success: false, message: "An error occurred while processing your request" });
  }
};

const getForgotPassOtp = async (req, res) => {
  try {
    res.render("user/forgotPass-otp");
  } catch (error) {
    console.log(error.message);
  }
}

const resendOtpAgain = async (req, res) => {
  try {
    if (req.session.email) {
      const email = req.session.email;
      var newOtp = await otpHelper.generateOtp();
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

const getNewPassword = async (req, res) => {
  try {
    res.render("user/reset-password");
  } catch (error) {
    console.log(error.message);
  }
}
const verifyForgotPassOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    if (enteredOtp === req.session.userOtp) {
      req.session.isOtpVerified = true;
      res.json({ status: true });
    } else {
      res.json({ status: false, message: 'Invalid OTP' });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};

const postNewPassword = async (req, res) => {
  try {
    const { newPass } = req.body
    const email = req.session.email
    if (newPass) {
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
      res.json({ success: true, message: 'Password changed successfully' });
    } else {
      res.status(400).json({ success: false, message: "Password not matching" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}


const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.session.user._id);
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid current password' });
    }
    const hashedPassword = await passwordHelper.securePassword(newPassword)
    user.password = hashedPassword;
    await user.save();
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
      res.redirect("/login")
    })
  } catch (error) {
    console.log(error.message);
  }
}




const cancelProduct = async (req, res) => {
  try {
    const { orderId, orderProductId } = req.body;
    const orderIdObj = new mongoose.Types.ObjectId(orderId);
    const order = await Order.findOne({ _id: orderIdObj });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const orderProduct = order.orderedItems.find(item => item.orderId.toString() === orderProductId);
    if (!orderProduct) {
      return res.status(404).json({ success: false, error: 'Order product not found' });
    }
    orderProduct.orderStat = 'cancelled';
    await order.save();
    const product = await Product.findById(orderProduct.product);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    const productSize = product.productSizes.find(size => size.size === orderProduct.size);
    if (!productSize) {
      return res.status(404).json({ success: false, error: 'Product size not found' });
    }
    productSize.quantity += orderProduct.quantity;
    product.totalQuantity += orderProduct.quantity;
    await product.save();
    const wallet = await Wallet.findOne({ user: order.user });
    if (wallet) {
      wallet.walletBalance += order.totalAmount;
      wallet.history.push({
        status: 'credit',
        amount: order.totalAmount,
      });
      await wallet.save();
    } else {
      return res.status(404).json({ success: false, error: 'User does not have a wallet' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling product:', error);
    return res.status(500).json({ success: false, error: 'An error occurred while cancelling the product' });
  }
};



const returnProduct = async (req, res) => {
  try {
    const { orderId, orderProductId } = req.body;
    const orderIdObj = new mongoose.Types.ObjectId(orderId);
    const order = await Order.findOne({ _id: orderIdObj });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const orderProduct = order.orderedItems.find(item => item.orderId.toString() === orderProductId);
    if (!orderProduct) {
      return res.status(404).json({ success: false, error: 'Order product not found' });
    }
    orderProduct.orderStat = 'return pending';
    await order.save();
    const product = await Product.findById(orderProduct.product);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    const productSize = product.productSizes.find(size => size.size === orderProduct.size);
    if (!productSize) {
      return res.status(404).json({ success: false, error: 'Product size not found' });
    }
    productSize.quantity += orderProduct.quantity;
    product.totalQuantity += orderProduct.quantity;
    await product.save();
    const wallet = await Wallet.findOne({ user: order.user });
    if (wallet) {
      wallet.walletBalance += order.totalAmount;
      wallet.history.push({
        date: new Date(),
        status: 'credit',
        amount: order.totalAmount,
      });
      await wallet.save();
    } else {
      return res.status(404).json({ success: false, error: 'User does not have a wallet' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Error returning product:', error);
    return res.status(500).json({ success: false, error: 'An error occurred while returning the product' });
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
  updateAddress,
  userLogout,
  updatePassword,
  filterPrice,
  searchProduct,
  filterProduct,
  deleteAddress,
  getAddress,
  getForgotPassOtp,
  getNewPassword,
  resendOtpAgain,
  cancelProduct,
  returnProduct,
}




