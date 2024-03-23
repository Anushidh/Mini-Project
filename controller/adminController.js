const User = require('../model/userModel');
const adminHelper = require('../helper/adminHelper');
const categoryHelper = require('../helper/categoryHelper');
const Category = require('../model/categoryModel');
const Product = require('../model/productModel');

const adminLogin = async (req, res) => {
  try {
    res.render("admin/login");
  } catch (error) {
    throw new Error(error.message);
  }
};

const adminLoginPost = async (req, res) => {
  const adminEmail = req.body.email;
  const adminPassword = req.body.password;
  try {
    const adminDetails = await adminHelper.isAdminExist(adminEmail);
    if (adminDetails) {
      req.session.admin = adminDetails;
      res.render('admin/dashboard');
    }
    else {
      res.render('admin/login');
    }
  }
  catch (error) {
    throw new Error("admin sign in error");
  }
};

const adminLogout = async (req, res) => {
  try {
    req.session.admin = null
    res.render("admin/login")
  } catch (error) {
    console.log(error.message);
  }
}



module.exports = {
  adminLogin,
  adminLoginPost,
  adminLogout,
}