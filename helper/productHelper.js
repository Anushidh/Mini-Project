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
    const unblockedProducts = await Product.find({ isBlocked: false });
    return unblockedProducts;
  } catch (error) {
    throw new Error('Error fetching unblocked products: ' + error.message);
  }
}



const stockDecrease = async (cartItems) => {
  try {
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
      await product.save();
    }
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
    return true;
  } catch (error) {
    throw error;
  }
};



const stockStatus = async (productId, size) => {
  try {
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error("Product not found");
    }
    const productSize = product.productSizes.find(sizeObj => sizeObj.size === size);
    if (!productSize) {
      return "Out of Stock";
    }
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