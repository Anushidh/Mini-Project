const productOffer = require('../model/productOfferModel');
const categoryOffer = require('../model/categoryOfferModel');
const Product = require('../model/productModel');
const Category = require('../model/categoryModel');

const allProductOffer = async (req, res) => {
  try {
    const prodoffers = await productOffer.find({"productOffer.offerStatus":true}).populate('productOffer.product');
    const products = await Product.find({});
    res.render('admin/productOffer', { prodoffers, products: products });
  } catch (error) {
    console.error('Error fetching product offers:', error);
    res.status(500).send('Internal Server Error');
  }
};

const addProductOffer = async (req, res) => {
  try {
    // console.log('1');
    // console.log(req.body);
    const { name, product, discount, startingDate, endingDate } = req.body;
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
    // console.log(newOffer);
    res.redirect('/admin/productOffer');
  } catch (error) {
    console.error('Error adding product offer:', error);
    res.status(500).send('Internal Server Error');
  }
};

const deleteProductOffer = async (req, res) => {
  try {
    const offerId = req.params.offerId;
    await productOffer.findByIdAndDelete(offerId);
    // console.log('Offer deleted successfully');
    res.redirect('/admin/productOffer');
  } catch (error) {
    console.error('Error deleting product offer:', error);
    res.status(500).send('Internal Server Error');
  }
};

const editProductOffer = async (req, res) => {
  try {
    const offerId = req.body.offerId;
    const existingOffer = await productOffer.findById(offerId);
    if (!existingOffer) {
      return res.status(404).send('Offer not found');
    }
    const { name, product, discount, startingDate, endingDate } = req.body;
    existingOffer.name = name;
    existingOffer.startingDate = startingDate;
    existingOffer.endingDate = endingDate;
    existingOffer.discount = discount;
    await existingOffer.save();
    res.redirect('/admin/productOffer');
  } catch (error) {
    console.error('Error editing product offer:', error);
    res.status(500).send('Internal Server Error');
  }
};

const allCategoryOffer = async (req, res) => {
  try {
    const catoffers = await categoryOffer.find({"categoryOffer.offerStatus":true}).populate('categoryOffer.category');
    const categories = await Category.find({});
    res.render('admin/categoryOffer', { catoffers, categories: categories });
  } catch (error) {
    console.error('Error fetching product offers:', error);
    res.status(500).send('Internal Server Error');
  }
}

const addCategoryOffer = async (req, res) => {
  try {
    // console.log('1');
    // console.log(req.body);
    const { name, category, discount, startingDate, endingDate } = req.body;
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
    // console.log(newOffer);
    res.redirect('/admin/categoryOffer');
  } catch (error) {
    console.error('Error adding product offer:', error);
    res.status(500).send('Internal Server Error');
  }
}

const deleteCategoryOffer = async (req, res) => {
  try {
    const offerId = req.params.offerId;
    await categoryOffer.findByIdAndDelete(offerId);
    // console.log('Offer deleted successfully');
    res.redirect('/admin/categoryOffer');
  } catch (error) {
    console.error('Error deleting product offer:', error);
    res.status(500).send('Internal Server Error');
  }
};

const editCategoryOffer = async (req, res) => {
  try {
    const offerId = req.body.offerId;
    const existingOffer = await categoryOffer.findById(offerId);
    if (!existingOffer) {
      return res.status(404).send('Offer not found');
    }
    const { name, category, discount, startingDate, endingDate } = req.body;
    existingOffer.name = name;
    existingOffer.startingDate = startingDate;
    existingOffer.endingDate = endingDate;
    existingOffer.discount = discount;
    await existingOffer.save();
    res.redirect('/admin/categoryOffer');
  } catch (error) {
    console.error('Error editing product offer:', error);
    res.status(500).send('Internal Server Error');
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