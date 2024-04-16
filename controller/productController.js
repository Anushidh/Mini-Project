const Product = require("../model/productModel");
const Category = require("../model/categoryModel");
const productHelper = require("../helper/productHelper");
const fs = require("fs");
const path = require("path");
const { log } = require("console");

const stocks = async (req, res) => {
    try {
        const products = await productHelper.getAllProducts();
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
        res.render('user/404');
    }
}

const addProducts = async (req, res) => {
    try {
        const { productName, productDescription, category, regularPrice, salePrice, small_quantity, medium_quantity, large_quantity } = req.body;

        // Backend validation
        if (!productName || !productDescription || !category || !regularPrice || !salePrice || !small_quantity || !medium_quantity || !large_quantity) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Additional validation for numeric fields
        if (isNaN(regularPrice) || isNaN(salePrice) || isNaN(small_quantity) || isNaN(medium_quantity) || isNaN(large_quantity)) {
            return res.status(400).json({ error: "Invalid numeric values" });
        }

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

        const images = []
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename);
            }
        }

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
        await newProduct.save();

        res.redirect("/admin/products")
        // res.json("success")
    } catch (error) {
        console.log(error.message);
        res.render('user/404');
    }
}


const adminProductList = async (req, res) => {
    // console.log('inside list');
    productHelper.getAllProducts()
        .then((response) => {
            // console.log(response);
            res.render('admin/product', { products: response });
        })
        .catch((error) => {
            console.error('Error in adminProductList:', error);
            res.status(500).send('Internal Server Error');
        });
};

const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id;
        console.log(id);
        const findProduct = await Product.findOne({ _id: id });
        const category = await Category.find({});
        // const findBrand = await Brand.find({})
        res.render("admin/edit-product", { product: findProduct, cat: category })
    } catch (error) {
        console.log(error.message);
        res.render('user/404')
    }
}

const editProduct = async (req, res) => {
    console.log('editproduct');
    try {
        const id = req.params.id
        const data = req.body
        const images = []
        // console.log(data.small_quantity + " " + data.medium_quantity + " " + data.large_quantity);
        const smallQuantity = parseInt(data.small_quantity, 10) || 0;
        const mediumQuantity = parseInt(data.medium_quantity, 10) || 0;
        const largeQuantity = parseInt(data.large_quantity, 10) || 0;
        const totalQuantity = parseInt(data.small_quantity) + parseInt(data.medium_quantity) + parseInt(data.large_quantity);

        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename);
            }
        }
        console.log(req.files)


        const existingProduct = await Product.findById(id);
        const productSizes = [
            { size: "Small", quantity: smallQuantity },
            { size: "Medium", quantity: mediumQuantity },
            { size: "Large", quantity: largeQuantity }
        ];

        console.log();
        // Check if any new images were uploaded
        if (req.files.length > 0) {
            console.log("Yes, images are there")
            // Check if the uploaded image is different from the existing image(s)
            const newImages = images.filter(image => !existingProduct.productImage.includes(image));
            if (newImages.length > 0) {
                const updatedProduct = await Product.findByIdAndUpdate(id, {
                    productName: data.productName,
                    productDescription: data.description,
                    category: data.category,
                    regularPrice: data.regularPrice,
                    productSizes,
                    salePrice: data.salePrice,
                    totalQuantity: totalQuantity,
                    $push: { productImage: { $each: newImages } } // Add new images to the existing images
                }, { new: true });
                console.log("Product updated");
                return res.redirect("/admin/products");
            } else {
                console.log("Same images were present");
                // No new images were uploaded, so update the product without changing the images
                const updatedProduct = await Product.findByIdAndUpdate(id, {
                    productName: data.productName,
                    productDescription: data.description,
                    category: data.category,
                    regularPrice: data.regularPrice,
                    productSizes,
                    salePrice: data.salePrice,
                    totalQuantity: totalQuantity,
                }, { new: true });
                console.log("Product updated");
                return res.redirect("/admin/products");
            }
        } else {
            console.log("No images were present");
            // No images were uploaded, so update the product without changing the images
            const updatedProduct = await Product.findByIdAndUpdate(id, {
                productName: data.productName,
                productDescription: data.description,
                category: data.category,
                regularPrice: data.regularPrice,
                productSizes,
                salePrice: data.salePrice,
                totalQuantity: totalQuantity,
            }, { new: true });
            console.log(updatedProduct);
            console.log("Product updated");
            return res.redirect("/admin/products");
        }
    } catch (error) {
        console.log(error.message);
        res.render('user/404');
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
        res.render('user/404');
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
        res.render('user/404');
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
}