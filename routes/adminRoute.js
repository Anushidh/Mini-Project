const express=require("express");
const adminRoute=express();
const adminController=require("../controller/adminController"); 
const categoryController = require("../controller/categoryController");
const productController = require("../controller/productController");
const customerController = require("../controller/customerController");
const orderController=require("../controller/orderController"); 
const couponController = require("../controller/couponController");
const offerController = require("../controller/offerController");

const { isAdmin } = require("../middleware/authentication");

// Multer Settings
const multer = require("multer");
const storage = require("../middleware/multer");
const upload = multer({ storage: storage });
adminRoute.use("/public/uploads", express.static("/public/uploads"));

//Admin Actions
adminRoute.get("/",adminController.adminLogin);
adminRoute.post("/",adminController.adminLoginPost);
adminRoute.get("/logout",adminController.adminLogout);

//Category Management
adminRoute.get("/category",isAdmin,categoryController.getCategory);
adminRoute.post("/category",isAdmin,categoryController.addCategory);
adminRoute.get("/listCategory",isAdmin,categoryController.getListCategory);
adminRoute.get("/unListCategory",isAdmin,categoryController.getUnlistCategory);
adminRoute.get("/edit-category/:id",isAdmin,categoryController.getEditCategory);
adminRoute.post("/edit-category/:id",isAdmin,categoryController.editCategory);
adminRoute.get("/soft-delete-category/:id",isAdmin,categoryController.softDeleteCategory);

//Product Management
adminRoute.get("/addProducts",isAdmin,productController.getProductAddPage);
adminRoute.post("/addProducts",isAdmin,upload.array("images", 5),productController.addProducts);
adminRoute.get("/products",isAdmin,productController.adminProductList);
adminRoute.get("/editProduct",isAdmin,productController.getEditProduct);
adminRoute.post("/editProduct/:id",isAdmin,upload.array("images", 5), productController.editProduct);
adminRoute.post("/deleteImage",isAdmin,productController.deleteSingleImage);
adminRoute.get("/blockProduct",isAdmin,productController.getBlockProduct);
adminRoute.get("/unBlockProduct",isAdmin,productController.getUnblockProduct);

// Customer Management
adminRoute.get("/users",isAdmin,customerController.getCustomersInfo);
adminRoute.get("/blockCustomer",isAdmin,customerController.getCustomerBlocked);
adminRoute.get("/unblockCustomer",isAdmin,customerController.getCustomerUnblocked);

// Order Management
adminRoute.get("/order-list",isAdmin,orderController.getOrderList);
adminRoute.get('/orderDetailsAdmin/:orderId', isAdmin, orderController.getOrderDetailsAdmin);
adminRoute.post('/updateOrderStatus/:orderId', isAdmin, orderController.updateOrderStatus);

// Coupon Management
adminRoute.get("/coupons",isAdmin,couponController.getCouponPage);
adminRoute.post("/add-coupon",isAdmin,couponController.addCoupon);
adminRoute.get('/deleteCoupon/:id',isAdmin,couponController.deleteCoupon);

//Offer Management
adminRoute.get("/productOffer",isAdmin,offerController.allProductOffer);
adminRoute.post("/add-ProdOffer",isAdmin,offerController.addProductOffer);
adminRoute.post("/edit-ProdOffer",isAdmin,offerController.editProductOffer);
adminRoute.get("/delete-ProdOffer/:offerId",isAdmin,offerController.deleteProductOffer);
adminRoute.get("/categoryOffer",isAdmin,offerController.allCategoryOffer);
adminRoute.post("/add-catOffer",isAdmin,offerController.addCategoryOffer);
adminRoute.post("/edit-catOffer",isAdmin,offerController.editCategoryOffer);
adminRoute.get("/delete-catOffer/:offerId",isAdmin,offerController.deleteCategoryOffer);

//sales report
adminRoute.get('/sales-report-page',isAdmin,adminController.salesReportPage);
adminRoute.post('/sales-report',isAdmin,adminController.salesReport);



module.exports = adminRoute;






