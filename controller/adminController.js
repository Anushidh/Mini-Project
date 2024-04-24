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
        // console.log(salesDetails);
        // Fetch all products and categories
        const products = await Product.find();
        // console.log(products);
        const categories = await Category.find();
        // console.log(categories);
        const topSellingProducts = await Order.aggregate([
          { $unwind: "$orderedItems" }, // Split orders into individual items
          {
            $group: {
              _id: "$orderedItems.product",
              totalQuantity: { $sum: "$orderedItems.quantity" },
            },
          }, // Group by productId and sum quantities
          { $sort: { totalQuantity: -1 } }, // Sort by total quantity descending
          { $limit: 10 }, // Limit to top 10 products
        ]);
        // console.log(topSellingProducts);
        // Extract product IDs of top selling products
        const productIds = topSellingProducts.map((product) => product._id.toString());
        // console.log(productIds);
        // Fetch details of top selling products
        const productsData = await Product.find(
          { _id: { $in: productIds } },
          { productName: 1, productImage: 1 } // Modify the fields you want to fetch
        );
        // console.log(productsData);
        const topSellingCategories = await Order.aggregate([
          { $unwind: "$orderedItems" }, // Split orders into individual items
          {
            $lookup: {
              from: "products",
              localField: "orderedItems.product",
              foreignField: "_id",
              as: "product",
            },
          }, // Lookup products collection to get product details
          { $unwind: "$product" }, // Unwind the product array
          {
            $lookup: {
              from: "categories",
              localField: "product.category",
              foreignField: "_id",
              as: "category",
            },
          }, // Lookup categories collection to get category details
          { $unwind: "$category" }, // Unwind the category array
          {
            $group: {
              _id: "$category._id",
              categoryName: { $first: "$category.name" }, // Get category name
              totalQuantity: { $sum: "$orderedItems.quantity" }, // Sum quantities of items
            },
          }, // Group by categoryId and sum quantities
          { $sort: { totalQuantity: -1 } }, // Sort by total quantity descending
          { $limit: 10 }, // Limit to top 10 categories
        ]);
        // console.log(topSellingCategories);
        // Extract category IDs of top selling categories
        const categoryIds = topSellingCategories.map((category) => category._id);
  
        // Fetch details of the top selling categories
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
      // console.log(salesDetails);
      // Fetch all products and categories
      const products = await Product.find();
      // console.log(products);
      const categories = await Category.find();
      // console.log(categories);
      const topSellingProducts = await Order.aggregate([
        { $unwind: "$orderedItems" }, // Split orders into individual items
        {
          $group: {
            _id: "$orderedItems.product",
            totalQuantity: { $sum: "$orderedItems.quantity" },
          },
        }, // Group by productId and sum quantities
        { $sort: { totalQuantity: -1 } }, // Sort by total quantity descending
        { $limit: 10 }, // Limit to top 10 products
      ]);
      // console.log(topSellingProducts);
      // Extract product IDs of top selling products
      const productIds = topSellingProducts.map((product) => product._id.toString());
      // console.log(productIds);
      // Fetch details of top selling products
      const productsData = await Product.find(
        { _id: { $in: productIds } },
        { productName: 1, productImage: 1 } // Modify the fields you want to fetch
      );
      // console.log(productsData);
      const topSellingCategories = await Order.aggregate([
        { $unwind: "$orderedItems" }, // Split orders into individual items
        {
          $lookup: {
            from: "products",
            localField: "orderedItems.product",
            foreignField: "_id",
            as: "product",
          },
        }, // Lookup products collection to get product details
        { $unwind: "$product" }, // Unwind the product array
        {
          $lookup: {
            from: "categories",
            localField: "product.category",
            foreignField: "_id",
            as: "category",
          },
        }, // Lookup categories collection to get category details
        { $unwind: "$category" }, // Unwind the category array
        {
          $group: {
            _id: "$category._id",
            categoryName: { $first: "$category.name" }, // Get category name
            totalQuantity: { $sum: "$orderedItems.quantity" }, // Sum quantities of items
          },
        }, // Group by categoryId and sum quantities
        { $sort: { totalQuantity: -1 } }, // Sort by total quantity descending
        { $limit: 10 }, // Limit to top 10 categories
      ]);
      // console.log(topSellingCategories);
      // Extract category IDs of top selling categories
      const categoryIds = topSellingCategories.map((category) => category._id);

      // Fetch details of the top selling categories
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
      // Aggregate monthly sales data
      const monthlySalesData = await Order.aggregate([
        {
          $match: { "orderStatus": "delivered" }, // Consider only delivered orders
        },
        {
          $group: {
            _id: { $month: "$createdAt" }, // Group by month
            totalAmount: { $sum: "$totalAmount" }, // Calculate total sales amount for each month
          },
        },
        {
          $sort: { _id: 1 }, // Sort by month
        },
      ]);
      // Aggregate daily sales data
      const dailySalesData = await Order.aggregate([
        {
          $match: { "orderStatus": "delivered" }, // Consider only delivered orders
        },
        {
          $group: {
            _id: { $dayOfMonth: "$createdAt" }, // Group by day of month
            totalAmount: { $sum: "$totalAmount" }, // Calculate total sales amount for each day
          },
        },
        {
          $sort: { _id: 1 }, // Sort by day of month
        },
      ]);
      const yearlySalesData = await Order.aggregate([
        {
          $match: { "orderStatus": "delivered" }, // Consider only delivered orders
        },
        {
          $group: {
            _id: { $year: "$createdAt" }, // Group by year
            totalAmount: { $sum: "$totalAmount" }, // Calculate total sales amount for each year
          },
        },
        {
          $sort: { _id: 1 }, // Sort by year
        },
      ]);
      
      // Count occurrences of each order status
      const orderStatuses = await Order.aggregate([
        {
          $unwind: "$orderedItems", // Unwind the orderedItems array
        },
        {
          $group: {
            _id: "$orderedItems.orderStatus", // Group by order status
            count: { $sum: 1 }, // Count occurrences of each status
          },
        },
      ]);
      // Map order statuses to object format
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
  showChart,
  dashboard,
}