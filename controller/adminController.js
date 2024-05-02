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

const dashboard = async (req,res) => {
  try {
    if(req.session.admin) {
      const salesDetails = await Order.find();
        const products = await Product.find();
        const categories = await Category.find();
        const topSellingProducts = await Order.aggregate([
          { $unwind: "$orderedItems" }, 
          {
            $group: {
              _id: "$orderedItems.product",
              totalQuantity: { $sum: "$orderedItems.quantity" },
            },
          }, 
          { $sort: { totalQuantity: -1 } }, 
          { $limit: 10 }, 
        ]);
        const productIds = topSellingProducts.map((product) => product._id.toString());
        const productsData = await Product.find(
          { _id: { $in: productIds } },
          { productName: 1, productImage: 1 } 
        );
        const topSellingCategories = await Order.aggregate([
          { $unwind: "$orderedItems" }, 
          {
            $lookup: {
              from: "products",
              localField: "orderedItems.product",
              foreignField: "_id",
              as: "product",
            },
          }, 
          { $unwind: "$product" }, 
          {
            $lookup: {
              from: "categories",
              localField: "product.category",
              foreignField: "_id",
              as: "category",
            },
          }, 
          { $unwind: "$category" }, 
          {
            $group: {
              _id: "$category._id",
              categoryName: { $first: "$category.name" }, 
              totalQuantity: { $sum: "$orderedItems.quantity" }, 
            },
          }, 
          { $sort: { totalQuantity: -1 } }, 
          { $limit: 10 }, 
        ]);
        const categoryIds = topSellingCategories.map((category) => category._id);
        const topSellingCategoriesData = await Category.find({
          _id: { $in: categoryIds },
        });
        // Count of delivered orders
      const deliveredOrdersCount = await Order.countDocuments({
        orderStatus: "delivered",
      });
        res.render('admin/dashboard', {
          salesDetails: salesDetails,
          products: products,
          categories: categories,
          productsData: productsData,
          topSellingCategories: topSellingCategoriesData,
          topSellingProducts: topSellingProducts,
          deliveredOrdersCount: deliveredOrdersCount,
        });
    }
    else {
      res.render('admin/login');
    }
  } catch (error) {
    throw new Error("dashboard rendering failed");
  }
  }

const adminLoginPost = async (req, res) => {
  const adminEmail = req.body.email;
  const adminPassword = req.body.password;
  try {
    const adminDetails = await adminHelper.isAdminExist(adminEmail);
    if (adminDetails) {
      req.session.admin = adminDetails;
      const salesDetails = await Order.find();
      const products = await Product.find();
      const categories = await Category.find();
      const topSellingProducts = await Order.aggregate([
        { $unwind: "$orderedItems" }, 
        {
          $group: {
            _id: "$orderedItems.product",
            totalQuantity: { $sum: "$orderedItems.quantity" },
          },
        }, 
        { $sort: { totalQuantity: -1 } }, 
        { $limit: 10 }, 
      ]);
      const productIds = topSellingProducts.map((product) => product._id.toString());
      const productsData = await Product.find(
        { _id: { $in: productIds } },
        { productName: 1, productImage: 1 } 
      );
      const topSellingCategories = await Order.aggregate([
        { $unwind: "$orderedItems" }, 
        {
          $lookup: {
            from: "products",
            localField: "orderedItems.product",
            foreignField: "_id",
            as: "product",
          },
        }, 
        { $unwind: "$product" }, 
        {
          $lookup: {
            from: "categories",
            localField: "product.category",
            foreignField: "_id",
            as: "category",
          },
        }, 
        { $unwind: "$category" }, 
        {
          $group: {
            _id: "$category._id",
            categoryName: { $first: "$category.name" }, 
            totalQuantity: { $sum: "$orderedItems.quantity" }, 
          },
        }, 
        { $sort: { totalQuantity: -1 } }, 
        { $limit: 10 }, 
      ]);
      const categoryIds = topSellingCategories.map((category) => category._id);
      const topSellingCategoriesData = await Category.find({
        _id: { $in: categoryIds },
      });
      res.render('admin/dashboard', {
        salesDetails: salesDetails,
        products: products,
        categories: categories,
        productsData: productsData,
        topSellingCategories: topSellingCategoriesData,
        topSellingProducts: topSellingProducts,
      });
    }
    else {
      res.render('admin/login');
    }
  }
  catch (error) {
    throw new Error("admin sign in error");
  }
};

const showChart = async (req, res) => {
  try {
    if (req.body.msg) {
      const monthlySalesData = await Order.aggregate([
        {
          $match: { "orderStatus": "delivered" }, 
        },
        {
          $group: {
            _id: { $month: "$createdAt" }, 
            totalAmount: { $sum: "$totalAmount" }, 
          },
        },
        {
          $sort: { _id: 1 }, 
        },
      ]);
      const dailySalesData = await Order.aggregate([
        {
          $match: { "orderStatus": "delivered" }, 
        },
        {
          $group: {
            _id: { $dayOfMonth: "$createdAt" }, 
            totalAmount: { $sum: "$totalAmount" }, 
          },
        },
        {
          $sort: { _id: 1 }, 
        },
      ]);
      const yearlySalesData = await Order.aggregate([
        {
          $match: { "orderStatus": "delivered" }, 
        },
        {
          $group: {
            _id: { $year: "$createdAt" }, 
            totalAmount: { $sum: "$totalAmount" }, 
          },
        },
        {
          $sort: { _id: 1 }, 
        },
      ]);
      const orderStatuses = await Order.aggregate([
        {
          $unwind: "$orderedItems", 
        },
        {
          $group: {
            _id: "$orderedItems.orderStatus", 
            count: { $sum: 1 }, 
          },
        },
      ]);
      const eachOrderStatusCount = {};
      orderStatuses.forEach((status) => {
        eachOrderStatusCount[status._id] = status.count;
      });
      res
        .status(200)
        .json({ monthlySalesData, dailySalesData, eachOrderStatusCount, yearlySalesData });
    }
  } catch (error) {
    console.log(error);
  }
}
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
    const sales = await orderHelper.getAllDeliveredOrders();
    const deliveredOrders = await Order.find({ orderStatus: 'delivered' });
    const count = deliveredOrders.length;
    let totalOrderAmount = 0;
    let totalDiscountAmount = 0;
    for (const order of deliveredOrders) {
      totalOrderAmount += order.totalAmount;
      totalDiscountAmount += order.totalDiscount + order.couponAmount;
    }
    sales.forEach((order) => {
      const orderDate = new Date(order.orderDate)
      const formattedDate = orderDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
      order.orderDate = formattedDate
    })
    res.render('admin/salesReport', {
      sales, count,
      totalOrderAmount,
      totalDiscountAmount
    })
  } catch (error) {
    throw error;
  }
}

const salesReport = async (req, res) => {
  try {
    let { startDate, endDate } = req.body;
    startDate = new Date(startDate)
    endDate = new Date(endDate)
    const salesReport = await orderHelper.getAllDeliveredOrdersByDate(startDate, endDate);
    for (let i = 0; i < salesReport.length; i++) {
      salesReport[i].orderDate = dateFormat(salesReport[i].orderDate)
      salesReport[i].totalAmount = currencyFormat(salesReport[i].totalAmount)
    }
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
  showChart,
  dashboard,
}