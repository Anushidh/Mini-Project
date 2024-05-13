const Product = require("../model/productModel");
const Category = require("../model/categoryModel");
const productHelper = require("../helper/productHelper");
const fs = require("fs");
const path = require("path");
const { log } = require("console");
const sharp = require('sharp');

const stocks = async (req, res) => {
    try {
        const products = await Product.find({});
        res.render('admin/stock', { products });
    } catch (error) {
        // Handle errors
        console.error('Error fetching products:', error);
        res.status(500).send('Internal Server Error');
    }
}


const getProductAddPage = async (req, res) => {
    try {
        const category = await Category.find({ isBlocked: false });
        // const brand = await Brand.find({ isBlocked: false })
        res.render("admin/product-add", { cat: category });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

const addProducts = async (req, res) => {
    try {
        console.log(req.body);
        const { productName, productDescription, category, regularPrice, salePrice, small_quantity, medium_quantity, large_quantity } = req.body;
        console.log(req.files);
        // Backend validation
        if (!productName || !productDescription || !category || !regularPrice || !salePrice || !small_quantity || !medium_quantity || !large_quantity) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Additional validation for numeric fields
        if (isNaN(regularPrice) || isNaN(salePrice) || isNaN(small_quantity) || isNaN(medium_quantity) || isNaN(large_quantity)) {
            return res.status(400).json({ error: "Invalid numeric values" });
        }
        // const fetchedProducts = Product.productSizes.find({size:small});
        // const lessThan = fetchedProducts.find({salePrice})
        const smallQuantity = parseInt(small_quantity, 10) || 0;
        const mediumQuantity = parseInt(medium_quantity, 10) || 0;
        const largeQuantity = parseInt(large_quantity, 10) || 0;

        // Calculate total quantity
        const totalQuantity = smallQuantity + mediumQuantity + largeQuantity;

        // Check if a product with the same name or image already exists
        const productExists = await Product.findOne({ $or: [{ productName }, { productImage: { $in: req.files.map(file => file.filename) } }] });
        if (productExists) {
            if (productExists.productName === productName && productExists.productImage.includes(req.files[0].filename)) {
                return res.status(400).json({ error: "Product with the same name and image already exists" });
            }
        }

        const productSizes = [
            { size: "Small", quantity: smallQuantity },
            { size: "Medium", quantity: mediumQuantity },
            { size: "Large", quantity: largeQuantity }
            // Add more sizes if needed
        ];

        const images = [];
        const imagesDir = path.join('E:', 'New folder', 'public', 'uploads', 'product-images');

        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const imagePath = req.files[i].path; // Use the path provided in req.files

                // Crop the image using sharp
                const croppedImage = await sharp(imagePath)
                    .extract({ left: 0, top: 0, width: 800, height: 600 })
                    .toFormat('jpeg')
                    .toBuffer();

                // Save the cropped image to a new file
                const croppedFilename = `cropped_${req.files[i].filename}`;
                const croppedFilePath = path.join(imagesDir, croppedFilename);
                await sharp(croppedImage).toFile(croppedFilePath);

                images.push(croppedFilename);
            }
        }
        console.log(images);
        const newProduct = new Product({
            productName,
            productDescription,
            category,
            regularPrice,
            salePrice,
            productSizes,
            totalQuantity,
            productImage: images
        });
        console.log(newProduct);
        await newProduct.save();
        res.status(200).json({ success: "Product added successfully" });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}


const adminProductList = async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const limit = 5; // Set the desired limit here

        const { products, totalPages, currentPage } = await productHelper.getAllProducts(page, limit);

        res.render('admin/product', {
            products,
            totalPages,
            currentPage,
            pagination: {
                page,
                limit,
            },
        });
    } catch (error) {
        console.error('Error in adminProductList:', error);
        res.status(500).send('Internal Server Error');
    }
};

const adminSearchProduct = async (req, res) => {
    try {
        console.log('inside search');
        const searchTerm = req.query.search || '';
        console.log(searchTerm);
        const product = await Product.find({
            productName: { $regex: searchTerm, $options: 'i' }
        });
        console.log(product);
        res.json({ product });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id;
        console.log(id);
        const findProduct = await Product.findOne({ _id: id }).populate('category');
        const category = await Category.find({});
        // const findBrand = await Brand.find({})
        res.render("admin/edit-product", { product: findProduct, cat: category })
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


const editProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
    const images = [];

    const smallQuantity = parseInt(data.small_quantity, 10) || 0;
    const mediumQuantity = parseInt(data.medium_quantity, 10) || 0;
    const largeQuantity = parseInt(data.large_quantity, 10) || 0;
    const totalQuantity = parseInt(data.small_quantity) + parseInt(data.medium_quantity) + parseInt(data.large_quantity);

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        images.push(req.files[i].filename);
      }
    }

    const existingProduct = await Product.findById(id);
    const productSizes = [
      { size: "Small", quantity: smallQuantity },
      { size: "Medium", quantity: mediumQuantity },
      { size: "Large", quantity: largeQuantity }
    ];

    const imagesDir = path.join('E:', 'New folder', 'public', 'uploads', 'product-images');

    if (req.files.length > 0) {
      console.log("Yes, images are there");

      const newImages = images.filter(image => !existingProduct.productImage.includes(image));
      const croppedNewImages = [];

      if (newImages.length > 0) {
        for (let i = 0; i < newImages.length; i++) {
          const imagePath = path.join(imagesDir, newImages[i]);

          const croppedImage = await sharp(imagePath)
            .extract({ left: 0, top: 0, width: 800, height: 600 })
            .toFormat('jpeg')
            .toBuffer();

          const croppedFilename = `cropped_${newImages[i]}`;
          const croppedFilePath = path.join(imagesDir, croppedFilename);
          await sharp(croppedImage).toFile(croppedFilePath);

          croppedNewImages.push(croppedFilename);
        }
      }

      if (croppedNewImages.length > 0) {
        const updatedProduct = await Product.findByIdAndUpdate(
          id,
          {
            productName: data.productName,
            productDescription: data.description,
            category: data.category,
            regularPrice: data.regularPrice,
            productSizes,
            salePrice: data.salePrice,
            totalQuantity: totalQuantity,
            $push: { productImage: { $each: croppedNewImages } }
          },
          { new: true }
        );

        console.log("Product updated");
        return res.status(200).json({ success: 'Product updated successfully!' });
      } else {
        console.log("Same images were present");
        const updatedProduct = await Product.findByIdAndUpdate(
          id,
          {
            productName: data.productName,
            productDescription: data.description,
            category: data.category,
            regularPrice: data.regularPrice,
            productSizes,
            salePrice: data.salePrice,
            totalQuantity: totalQuantity,
          },
          { new: true }
        );

        console.log("Product updated");
        return res.status(200).json({ success: 'Product updated successfully!' });
      }
    } else {
      console.log("No images were present");
      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        {
          productName: data.productName,
          productDescription: data.description,
          category: data.category,
          regularPrice: data.regularPrice,
          productSizes,
          salePrice: data.salePrice,
          totalQuantity: totalQuantity,
        },
        { new: true }
      );

      console.log(updatedProduct);
      console.log("Product updated");
      return res.status(200).json({ success: 'Product updated successfully!' });
    }
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: 'An error occurred while updating the product.' });
  }
}


const getBlockProduct = async (req, res) => {
    try {
        let id = req.query.id
        await Product.updateOne({ _id: id }, { $set: { isBlocked: true } })
        console.log("product blocked")
        res.redirect("/admin/products")
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


const getUnblockProduct = async (req, res) => {
    try {
        let id = req.query.id
        await Product.updateOne({ _id: id }, { $set: { isBlocked: false } })
        console.log("product unblocked")
        res.redirect("/admin/products")
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

const deleteSingleImage = async (req, res) => {
    try {
        console.log("hi");
        const id = req.body.productId
        const image = req.body.filename
        console.log(id, image);
        const product = await Product.findByIdAndUpdate(id, {
            $pull: { productImage: image }
        })
        // console.log(image);
        const imagePath = path.join('public', 'uploads', 'product-images', image);
        if (fs.existsSync(imagePath)) {
            await fs.unlinkSync(imagePath);
            console.log(`Image ${image} deleted successfully`);
            res.json({ success: true })
        } else {
            console.log(`Image ${image} not found`);
            res.status(404).json({ success: false, message: 'Image not found' });
        }

        // res.redirect(`/admin/editProduct?id=${product._id}`)

    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = {
    getProductAddPage,
    addProducts,
    adminProductList,
    getEditProduct,
    editProduct,
    getBlockProduct,
    getUnblockProduct,
    deleteSingleImage,
    stocks,
    adminSearchProduct,
}