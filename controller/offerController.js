const productOffer = require('../model/productOfferModel');
const categoryOffer = require('../model/categoryOfferModel');
const Product = require('../model/productModel');
const Category = require('../model/categoryModel');

const allProductOffer = async (req, res) => {
  try {
    const prodoffers = await productOffer.find({ "productOffer.offerStatus": true }).populate('productOffer.product');
    const products = await Product.find({ isBlocked: false });
    res.render('admin/productOffer', { prodoffers, products: products });
  } catch (error) {
    console.error('Error fetching product offers:', error);
    res.status(500).send('Internal Server Error');
  }
};

const addProductOffer = async (req, res) => {
  try {
    console.log('inside addproductoffer');
    console.log(req.body);
    const { name, product, discount, startingDate, endingDate } = req.body;

    // Validate input data
    if (!name || !product || !discount || !startingDate || !endingDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if an offer with the same name already exists
    const existingOffer = await productOffer.findOne({ name });
    if (existingOffer) {
      return res.status(400).json({ message: 'An offer with the same name already exists' });
    }
    console.log(existingOffer);
    const existingProduct = await Product.findById(product);
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    console.log(existingProduct);
    if (existingProduct.isBlocked) {
      return res.status(403).json({ message: 'Product is blocked' });
    }
    // const existingProductOffer = await productOffer.findOne({
    //   'productOffer.product': product,
    // });
    // if (!existingProductOffer) {
    //   return res.status(404).json({ message: 'Product offer not found' });
    // }

    // Check if the product has an active category offer
    const productCategory = existingProduct.category;
    const activeCategoryOffer = await categoryOffer.findOne({
      'categoryOffer.category': productCategory,
      status: true,
    });

    if (activeCategoryOffer) {
      return res.status(400).json({ message: 'Product already has an active category offer' });
    }

    // If all validations pass, create the new offer
    const newOffer = new productOffer({
      name: name,
      startingDate: startingDate,
      endingDate: endingDate,
      productOffer: {
        product: product,
        offerStatus: true,
      },
      discount: discount,
    });

    await newOffer.save();

    const currentSalePrice = existingProduct.salePrice;
    existingProduct.oldSalePrice = currentSalePrice;
    console.log(currentSalePrice);
    const offerDiscount = discount;
    const newSalePrice = currentSalePrice - offerDiscount;
    existingProduct.salePrice = newSalePrice;
    await existingProduct.save();
    console.log(existingProduct);

    res.status(200).json({ message: 'Product offer created successfully' });
  } catch (error) {
    console.error('Error adding product offer:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const deleteProductOffer = async (req, res) => {
  try {
    const offerId = req.params.offerId;
    const deletedOffer = await productOffer.findById(offerId);
    const productId = deletedOffer.productOffer.product;
    const offerDiscount = deletedOffer.discount;
    const affectedProduct = await Product.findById(productId);
    const currentSalePrice = affectedProduct.salePrice;
    // const newSalePrice = currentSalePrice + offerDiscount;
    affectedProduct.salePrice = affectedProduct.oldSalePrice;
    await affectedProduct.save();
    await deletedOffer.deleteOne();
    res.redirect('/admin/productOffer');
  } catch (error) {
    console.error('Error deleting product offer:', error);
    res.status(500).send('Internal Server Error');
  }
};


const editProductOffer = async (req, res) => {
  try {
    console.log('inside editproduct offer');
    const offerId = req.body.offerId;
    const existingOffer = await productOffer.findById(offerId);
    if (!existingOffer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    const { name, product, discount, startingDate, endingDate } = req.body;
    // Validate input data
    if (!name || !product || !discount || !startingDate || !endingDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const oldDiscount = existingOffer.discount;
    existingOffer.name = name;
    existingOffer.startingDate = startingDate;
    existingOffer.endingDate = endingDate;
    existingOffer.discount = discount;
    await existingOffer.save();
    const productToUpdate = await Product.findById(existingOffer.productOffer.product);
    if (!productToUpdate) {
      return res.status(404).json({ message: 'Product not found' });
    }
    productToUpdate.salePrice += oldDiscount - discount;
    await productToUpdate.save();
    res.status(200).json({ message: 'Product offer updated successfully' });
  } catch (error) {
    console.error('Error editing product offer:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};



const allCategoryOffer = async (req, res) => {
  try {
    const catoffers = await categoryOffer.find({ "categoryOffer.offerStatus": true }).populate('categoryOffer.category');
    const categories = await Category.find({ isBlocked: false });
    res.render('admin/categoryOffer', { catoffers, categories: categories });
  } catch (error) {
    console.error('Error fetching product offers:', error);
    res.status(500).send('Internal Server Error');
  }
}

const addCategoryOffer = async (req, res) => {
  try {
    const { name, category, discount, startingDate, endingDate } = req.body;
    // Check if an offer with the same name already exists
    const existingOffer = await categoryOffer.findOne({ name });
    if (existingOffer) {
      return res.status(400).json({ message: 'An offer with this name already exists' });
    }
    // Check if there are products available for the selected category
    const productsInCategory = await Product.countDocuments({ category, isBlocked: false });
    if (productsInCategory === 0) {
      return res.status(400).json({ message: 'No products available for the selected category' });
    }
    const productIds = await Product.find({ category, isBlocked: false }, '_id');
    console.log(productIds);
    // Check which products have an active product offer
    const productsWithProductOffer = await productOffer.find({
      'productOffer.product': { $in: productIds },
      'productOffer.offerStatus': true,
    }, 'productOffer.product');
    console.log(productsWithProductOffer);
    const productsWithoutProductOffer = productIds.filter(id => !productsWithProductOffer.some(offer => offer.productOffer.product.toString() === id._id.toString()));
    console.log(productsWithoutProductOffer);
    if (productsWithoutProductOffer.length === 0) {
      return res.status(400).json({ message: 'All products in the category have an active product offer' });
    }
    const newOffer = new categoryOffer({
      name: name,
      startingDate: startingDate,
      endingDate: endingDate,
      categoryOffer: {
        category: category,
        offerStatus: true,
      },
      discount: discount,
    });
    await newOffer.save();
    for (let i = 0; i < productsWithoutProductOffer.length; i++) {
      const productToUpdate = await Product.findById(productsWithoutProductOffer[i]);
      const oldSalePrice = productToUpdate.salePrice;
      productToUpdate.oldSalePrice = oldSalePrice;
      const newSalePrice = oldSalePrice - discount;
      productToUpdate.salePrice = newSalePrice;
      await productToUpdate.save();
    }
    console.log(productsWithProductOffer);
    res.status(200).json({ message: 'Category offer added successfully' });
  } catch (error) {
    console.error('Error adding product offer:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

const deleteCategoryOffer = async (req, res) => {
  try {
    const offerId = req.params.offerId;
    const deletedOffer = await categoryOffer.findById(offerId);
    if (!deletedOffer) {
      return res.status(404).send('Category offer not found');
    }
    const categoryId = deletedOffer.categoryOffer.category;
    const offerDiscount = deletedOffer.discount;
    const productsToUpdate = await Product.find({ category: categoryId });
    for (let i = 0; i < productsToUpdate.length; i++) {
      const productToUpdate = productsToUpdate[i];
      // productToUpdate.salePrice += offerDiscount;
      productToUpdate.salePrice = productToUpdate.oldSalePrice;
      await productToUpdate.save();
    }
    await deletedOffer.deleteOne();
    res.redirect('/admin/categoryOffer');
  } catch (error) {
    console.error('Error deleting category offer:', error);
    res.status(500).send('Internal Server Error');
  }
};

const editCategoryOffer = async (req, res) => {
  try {
    console.log('inside editcategoryoffer');
    const offerId = req.body.offerId;
    const existingOffer = await categoryOffer.findById(offerId);
    if (!existingOffer) {
      return res.status(404).send('Offer not found');
    }
    const { name, category, discount, startingDate, endingDate } = req.body;
    console.log(`${name} ${category} ${discount} ${startingDate} ${endingDate}`);
    const oldDiscount = existingOffer.discount;
    existingOffer.name = name;
    existingOffer.startingDate = startingDate;
    existingOffer.endingDate = endingDate;
    existingOffer.discount = discount;
    await existingOffer.save();
    const discountDifference = oldDiscount - discount;
    const productsToUpdate = await Product.find({ category: category });
    for (const productToUpdate of productsToUpdate) {
      productToUpdate.salePrice += discountDifference;
      await productToUpdate.save();
    }
    res.status(200).json({ message: 'Category offer updated successfully' });
  } catch (error) {
    console.error('Error editing category offer:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


module.exports = {
  allProductOffer,
  addProductOffer,
  deleteProductOffer,
  editProductOffer,
  allCategoryOffer,
  addCategoryOffer,
  deleteCategoryOffer,
  editCategoryOffer,
}