const WishList = require('../model/wishlistModel')
const Product = require('../model/productModel');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;


const addItemToWishlist = async (productId, userId, size) => {
  try {
    // console.log('inside additemtowishlist');
      const product = await Product.findOne({ _id: productId });
    //   console.log('product:', product);
      if (!product || product.isBlocked) {
          throw new Error("Product Not Found or Blocked");
      }

      // Check if the provided size is valid for the product
      const validSize = product.productSizes.find(s => s.size === size);
      if (!validSize) {
          throw new Error("Invalid Size for this Product");
      }
    //   console.log('validSize:', validSize);
     // Check if the product already exists in the wishlist
    const existingItem = await WishList.findOne({
        user: userId,
        'products.productItemId': productId
      });
    //   console.log('existingItem:', existingItem);
      if (existingItem) {
        // Check if the same size exists for the product in the wishlist
        const sizeExists = existingItem.products.some(item => {
        //   console.log('wishlist item size:', item.size);
          return item.size === size;
        });
        // console.log('sizeExists:', sizeExists);
        if (sizeExists) {
          // If the same size exists, return an error
          console.log('same size exists');
          throw new Error("Product already exists in the wishlist with the same size");
        }
      }
      const wishlist = await WishList.updateOne(
          {
              user: userId
          },
          {
              $push:{
                  products : { productItemId: productId, size: size }
              }
          },
          {
              upsert: true
          }
      );

      return wishlist;
  } catch (error) {
      throw error;
  }
};



// const getAllWishlistProducts = async (userId) => {
//     try {
//         let wishlistProducts = await WishList.aggregate([
//             {
//                 $match: {
//                     user: new mongoose.Types.ObjectId(userId)
//                 }
//             },
//             {
//                 $unwind: '$products'
//             },
//             {
//                 $project: {
//                     item: '$products.productItemId'
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'products',
//                     localField: 'item',
//                     foreignField: '_id',
//                     as: 'product'
//                 }
//             },
//             {
//                 $project: {
//                     item: 1,
//                     product: {
//                         $arrayElemAt: ['$product', 0]
//                     },
//                     size
//                 }
//             }
//         ]);
//         return wishlistProducts;
//     } catch (error) {
//         console.error("Error in getAllWishlistProducts:", error);
//         throw new Error("Failed to get wishlist products");
//     }
//   };

const getAllWishlistProducts = async (userId) => {
    try {
        let wishlistProducts = await WishList.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $unwind: '$products'
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.productItemId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $addFields: {
                    product: { $arrayElemAt: ['$product', 0] },
                    size: '$products.size' // Retrieve size from the products array
                }
            },
            {
                $project: {
                    item: '$products.productItemId',
                    product: 1,
                    size: 1
                }
            }
        ]);
        return wishlistProducts;
    } catch (error) {
        console.error("Error in getAllWishlistProducts:", error);
        throw new Error("Failed to get wishlist products");
    }
};


  const removeProductFromWishlist = async (userId, productId) => {
    try {
        console.log('removeProductFromWishlist');
        const result = await WishList.updateOne(
            {
                user: new mongoose.Types.ObjectId(userId)
            },
            {
                $pull: {
                    products: {
                        productItemId: productId
                    }
                }
            }
        );
        return result;
    } catch (error) {
        console.error("Error in removeProductFromWishlist:", error);
        throw new Error("Failed to remove product from wishlist");
    }
};


  const getWishListCount = async (userId) => {
    try {
        // console.log('getwishlistcount');
        let wishlist = await WishList.findOne({ user: userId });
        let wishlistCount = wishlist?.products.length;
        return wishlistCount;
    } catch (error) {
        console.error("Error in getWishListCount:", error);
        throw new Error("Failed to get wishlist count");
    }
};








module.exports = {
  addItemToWishlist,
  getAllWishlistProducts,
  getWishListCount,
  removeProductFromWishlist,
}