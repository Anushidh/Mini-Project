const User = require('../model/userModel');
const adminHelper = require('../helper/adminHelper');
const categoryHelper = require('../helper/categoryHelper');
const Category = require('../model/categoryModel');
const Product = require('../model/productModel');
const Order = require('../model/orderModel');
const orderHelper = require("../helper/orderHelper");


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



const salesReportPage = async (req, res) => {
  try {
    // console.log('salesreportpage');
    const sales = await orderHelper.getAllDeliveredOrders();
    const deliveredOrders = await Order.find({ orderStatus: 'delivered' });
    const count = deliveredOrders.length;
    console.log(count);
    let totalOrderAmount = 0;
    let totalDiscountAmount = 0;
    for (const order of deliveredOrders) {
      totalOrderAmount += order.totalAmount;
      totalDiscountAmount += order.totalDiscount + order.couponAmount;
    }
    console.log(totalOrderAmount);
    console.log(totalDiscountAmount);
    sales.forEach((order) => {
      const orderDate = new Date(order.orderDate)
      const formattedDate = orderDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
      order.orderDate = formattedDate
    })
    res.render('admin/salesReport',{ sales, count,
      totalOrderAmount,
      totalDiscountAmount })
  } catch (error) {
    throw error;
  }
}

const salesReport = async (req, res) => {
  try {
    let { startDate, endDate } = req.body;
    console.log(startDate);
    console.log(endDate);
    startDate = new Date(startDate)
    endDate = new Date(endDate)
    console.log(startDate);
    console.log(endDate);
    const salesReport = await orderHelper.getAllDeliveredOrdersByDate(startDate, endDate);
    for (let i = 0; i < salesReport.length; i++) {
      salesReport[i].orderDate = dateFormat(salesReport[i].orderDate)
      salesReport[i].totalAmount = currencyFormat(salesReport[i].totalAmount)
    }
    console.log(salesReport);
    res.status(200).json({ sales: salesReport })
  } catch (error) {
    throw error;
  }
}



function currencyFormat(amount) {
  return Number(amount).toLocaleString('en-in', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })
}


function dateFormat(date) {
  return date.toISOString().slice(0, 10)
}


module.exports = {
  adminLogin,
  adminLoginPost,
  adminLogout,
  salesReportPage,
  salesReport,
}