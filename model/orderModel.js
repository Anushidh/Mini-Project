const mongoose = require("mongoose");
const Product = require('../model/productModel');
const Category = require('../model/categoryModel');
const ProductOffer = require('../model/productOfferModel');
const CategoryOffer = require('../model/categoryOfferModel');
const Coupon = require('../model/couponModel');

const orderSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    orderedItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'products',
        },
        quantity: Number,
        size: {
          type: String,
          default: "Small",
          enum: ["Small", "Medium", "Large"] // Replace with full names
        },
        discountAvailed: Number,
      },
    ],
    address: mongoose.Schema.Types.ObjectId,
    orderDate: Date,
    coupon: {
      type: String,
      default: null,
    },
    couponAmount: Number,
    totalAmount: Number,
    totalDiscount: Number,
    paymentMethod: String,
    orderStatus: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'shipped',
        'outForDelivery',
        'delivered',
        'cancelled',
        'return pending',
        'returned',
      ],
      default: 'pending',
    },
    cancellationReason: {
      type: String,
      maxlength: 20,
      default: null, // Add default value as null
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'success'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.pre('save', async function (next) {
  try {
    let totalDiscount = 0;
    for (const item of this.orderedItems) {
      const product = await Product.findById(item.product);
      const category = await Category.findById(product.category);
      let discountAmount = 0;
      const productOffer = await ProductOffer.findOne({ product: item.product });
      const categoryOffer = await CategoryOffer.findOne({ category: product.category });
      if (productOffer || categoryOffer) {
        if (productOffer && productOffer.offerStatus) {
          discountAmount += productOffer.discount * item.quantity;
        }
        if (categoryOffer && categoryOffer.offerStatus) {
          discountAmount += categoryOffer.discount * item.quantity;
        }
      } else {
        discountAmount += (product.regularPrice - product.salePrice) * item.quantity;
      }
      item.discountAvailed = discountAmount;
      totalDiscount += discountAmount;
    }
    this.totalDiscount = totalDiscount;
    next();
  } catch (error) {
    next(error);
  }
});


module.exports = new mongoose.model("Order", orderSchema);
