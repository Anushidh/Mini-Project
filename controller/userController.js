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
    const loggedIn = userId;
    let userDetails = await User.findById(userId);
    let userOrders = await Order.find({ user: userId });
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
  }
};

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
    console.log('inside delete address');
    const addressId = req.query.id;
    await Address.deleteOne({ _id: addressId });
    console.log("Address deleted successfully");
    // Send a success response
    res.status(200).json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    console.error(error);
    // Send an error response
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

// const editAddressPage = async (req, res) => {
//   try {
//     // let userId = req.session.user._id;
//     let addressId = req.query.id;
//     let userAddress = await addressHelper.findAnAddress(addressId);
//     //  console.log(userAddress);
//     // let allAddress = await addressHelper.findAllAddress(userId);
//     res.render('user/edit-address', { loginStatus: req.session.user, userAddress: userAddress, });
//   } catch (error) {
//     res.status(500).render('user/404');
//   }
// }

const searchProduct = async (req, res) => {
  try {
    const { query } = req.query;
    console.log(query);
    const user = req.session.user
    const loggedIn = user;
    let products;
    if (req.session.category) {
      console.log('1');
      products = await Product.find({
        isBlocked: false,
        productName: { $regex: new RegExp(query, 'i') },
        category: req.session.category, // This will only be included if a categoryId is available
      });
    }
    else if (req.session.sort) {
      console.log('2');
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

    console.log(products);
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
    console.log('1');
    const user = req.session.user;
    const loggedIn = user;
    // console.log("wrking");
    const id = req.params.id
    // console.log(id);
    const findProduct = await Product.findOne({ _id: id });
    // console.log('product is is here',findProduct);
    // console.log(findProduct.id, "Hello world");
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
    // console.log(sort);
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
    console.log('1');
    const user = req.session.id;
    const loggedIn = user;
    const { minPrice, maxPrice } = req.body;
    console.log(minPrice + " " + maxPrice);
    const filteredProducts = await Product.find({
      salePrice: { $gte: minPrice, $lte: maxPrice }
    });
    console.log(filteredProducts);
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
    console.log(categoryId);
    req.session.category = categoryId;
    // console.log(categoryId);
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

// const getOtpLostPassword = async (req, res) => {
//   try {
//     res.render("user/verify-otp-lostPassword");
//   } catch (error) {
//     throw new Error(error.message);
//   }
// }

const userSignup = async (req, res) => {
  try {
    console.log('user signup');
    const { username, email, phone, password, referral } = req.body;
    // let email = req.body.email;
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
        console.log('inside info');
        res.render("user/verify-otp", { email })
        console.log("Email sent", info.messageId);
        // const newUser = await User.create(req.body);
      } else {
        res.json("email-error");
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// const posOtpLostPassword = async (req,res) => {
//   try {

//   } catch (error) {

//   }
// }
const otpVerify = async (req, res) => {
  try {
    console.log('otp verify');
    const { otp } = req.body;
    if (otp === req.session.userOtp) {
      const user = req.session.userData
      const passwordHash = await passwordHelper.securePassword(user.password)
      const referralCode = await generateRandomString();
      console.log("the referralCode  =>" + referralCode);
      let newUserWallet;
      if (req.session.referral) {
        const existingUser = await User.findOne({ referralCode: req.session.referral });
        console.log(existingUser);
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
      // Create a new wallet for the new user and add 50rs to it
      const existingUser = await User.findOne({ referralCode: req.session.referral });
      if (existingUser) {
        const newUserWallet = new Wallet({
          user: saveUserData._id, // Now we have the user's ID after saving the user data
          walletBalance: 50
        });
        await newUserWallet.save();
      }
      else {
        const newUserWallet = new Wallet({
          user: saveUserData._id, // Now we have the user's ID after saving the user data
          walletBalance: 0
        });
        await newUserWallet.save();
      }
      req.session.user = saveUserData._id
      res.redirect('/login')
    }
    else {
      console.log('otp not matching');
      res.json("status wrong");
    }
  } catch (error) {
    console.error(error);
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
    console.log('inside resendotp');
    if (req.session.userData && req.session.userData.email) {
      const email = req.session.userData.email;
      console.log(email);
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

  try {
    // console.log('inside login');
    // console.log(req.body);
    const { email, password } = req.body;
    const findUser = await User.findOne({ isAdmin: '0', email: email });
    if (findUser) {
      const isUserNotBlocked = !findUser.isBlocked;
      if (isUserNotBlocked) {
        const samePassword = await bcrypt.compare(password, findUser.password);
        if (samePassword) {
          req.session.user = findUser;
          const products = await Product.find();
          // res.render("user/home", { products: products });
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
    console.log(email);
    // Check if the email is provided
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Check if a user with the provided email exists
    const findUser = await User.findOne({ email });

    if (!findUser) {
      return res.status(404).json({ success: false, message: "User with this email does not exist" });
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
    console.log('email sent');
    res.json({ success: true, message: "OTP sent to your email" });

    // console.log("Email sent successfully", info.messageId);
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
    console.log('inside resendotpagain');
    if (req.session.email) {
      const email = req.session.email;
      console.log(email);
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

const getNewPassword = async (req, res) => {
  try {
    res.render("user/reset-password");
  } catch (error) {
    console.log(error.message);
  }
}
const verifyForgotPassOtp = async (req, res) => {
  try {
    console.log(req.body.otp);
    const enteredOtp = req.body.otp;
    if (enteredOtp === req.session.userOtp) {
      // OTP verification successful
      req.session.isOtpVerified = true;
      res.json({ status: true });
    } else {
      console.log('Invalid OTP');
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
      res.json({ success: true, message: 'Password changed successfully' });
    } else {
      console.log("Password not match");
      res.status(400).json({ success: false, message: "Password not matching" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
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
      if (order.paymentMethod === 'razorpay') {
        const wallet = await Wallet.findOne({ user: req.session.user._id });
        console.log(wallet);
        if (!wallet) {
          return res.status(404).json({ error: 'Wallet not found' });
        }
        wallet.walletBalance += totalAmount;
        await wallet.save();
        console.log(wallet);
      }
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
          product.totalQuantity += item.quantity;
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
    let totalAmount = order.totalAmount;
    console.log(totalAmount);
    if (order.orderStatus === 'delivered') {
      if (order.paymentMethod === 'razorpay') {
        const wallet = await Wallet.findOne({ user: req.session.user._id });
        console.log(wallet);
        if (!wallet) {
          return res.status(404).json({ error: 'Wallet not found' });
        }
        wallet.walletBalance += totalAmount;
        await wallet.save();
        console.log(wallet);
      }
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
          product.totalQuantity += item.quantity;
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
  cancelOrder,
  filterPrice,
  searchProduct,
  returnOrder,
  filterProduct,
  deleteAddress,
  getAddress,
  getForgotPassOtp,
  getNewPassword,
  resendOtpAgain,
}




