const Product = require('../model/productModel')
const Category = require('../model/categoryModel');

const getAllProducts = async (page = 1, limit = 10) => {
  try {
    const startIndex = (page - 1) * limit;
    const result = await Product.aggregate([
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $skip: startIndex,
      },
      {
        $limit: limit,
      }
    ]);
    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);
    return { products: result, totalPages, currentPage: page };
    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
};


const getAllUnblockedProducts = async () => {
  try {
    // Fetch all products that are not blocked
    const unblockedProducts = await Product.find({ isBlocked: false });
    return unblockedProducts;
  } catch (error) {
    throw new Error('Error fetching unblocked products: ' + error.message);
  }
}

// const stockDecrease = async (cartItems) => {
//   try {
//     console.log(cartItems);
//     // console.log('inside stockdecrease');
//     for (let i = 0; i < cartItems.length; i++) {
//       const productId = cartItems[i].product._id;
//       console.log('Product ID:', productId);
//       const product = await Product.findById(productId);

//       console.log('Product:', product);
//       if (!product) {
//         throw new Error(`Product with ID ${productId} not found`);
//       }

//       // Iterate over cart items and decrement quantities
//       if (cartItems[i].sizes && cartItems[i].sizes.length > 0) {
//         for (let j = 0; j < cartItems[i].sizes.length; j++) {
//           const sizeObj = cartItems[i].sizes[j];
//           console.log('Size object:', sizeObj);
//           const productSize = product.productSizes.find(size => size.size === sizeObj.size);
//           console.log('Product size:', productSize);
//           if (!productSize) {
//             throw new Error(`Size ${sizeObj.size} not found for product ${product.productName}`);
//           }

//           if (productSize.quantity < sizeObj.quantity) {
//             throw new Error(`Insufficient stock for size ${sizeObj.size} of product ${product.productName}`);
//           }

//           // Decrease the quantity of the selected size
//           productSize.quantity -= sizeObj.quantity;
//         }
//       } else {
//         console.log('No sizes found for item:', cartItems[i]);
//       }

//       // Recalculate total quantity after decreasing individual sizes
//       product.totalQuantity = product.productSizes.reduce((acc, size) => acc + size.quantity, 0);

//       await product.save();
//     }
//     console.log('Stock decreased successfully');
//     return true;
//   } catch (error) {
//     throw error;
//   }
// };

const stockDecrease = async (cartItems) => {
  try {
    // console.log('Inside stock decrease');

    for (let i = 0; i < cartItems.length; i++) {
      const { item: productId, size, quantity } = cartItems[i];
      const product = await Product.findById(productId);

      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      const sizeIndex = product.productSizes.findIndex(s => s.size === size);

      if (sizeIndex === -1) {
        throw new Error(`Size ${size} not found for product ${product.productName}`);
      }

      const availableQuantity = product.productSizes[sizeIndex].quantity - quantity;

      if (availableQuantity >= 0) {
        product.productSizes[sizeIndex].quantity = availableQuantity;
      } else {
        throw new Error(`Insufficient stock for product ${product.productName} in size ${size}`);
      }

      // Save the product after updating individual size quantity
      await product.save();
    }

  // Update total quantity for each product
  const productIds = cartItems.map(item => item.item);
  const products = await Product.find({ _id: { $in: productIds } });

  for (const product of products) {
    let totalQuantity = 0;

    for (const size of product.productSizes) {
      totalQuantity += size.quantity;
    }

    product.totalQuantity = totalQuantity;
    await product.save();
  }

    console.log('Stock decreased successfully');
    return true;
  } catch (error) {
    console.log('inside catch block');
    throw error;
  }
};



const stockStatus = async (productId, size) => {
  try {
    // Find the product by productId
    const product = await Product.findById(productId);

    if (!product) {
      throw new Error("Product not found");
    }

    // Find the product size object with the specified size
    const productSize = product.productSizes.find(sizeObj => sizeObj.size === size);

    if (!productSize) {
      return "Out of Stock";
    }

    // Check if the quantity of the product size is greater than 0
    if (productSize.quantity > 0) {
      return "In Stock";
    } else {
      return "Out of Stock";
    }
  } catch (error) {
    console.error('Error in stockStatus:', error);
    throw new Error("Failed to check stock status");
  }
};

module.exports = {
  getAllProducts,
  getAllUnblockedProducts,
  stockDecrease,
  stockStatus,
} 