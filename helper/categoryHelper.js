const User = require('../model/userModel');
const Category = require('../model/categoryModel');

const addCategoryToDb = (body) => {
  return new Promise(async (resolve, reject) => {
    try {
      let name = body.categoryName.toLowerCase(); 
      let oldCategory = await Category.findOne({ name: { $regex: new RegExp('^' + name + '$', 'i') } }); 
      if (oldCategory) {
        resolve({ status: false });
      } else {
        const newCategory = new Category({
          name: body.categoryName,
          description: body.categoryDescription,
        });
        await newCategory.save();
        resolve({ status: true });
      }
    } catch (error) {
      console.error("Error adding category:", error);
      reject(error);
    }
  });
};

const getAllCategory = (currentPage, pageSize) => {
  return new Promise(async (resolve, reject) => {
    try {
      const skip = (currentPage - 1) * pageSize;
      const categories = await Category.find()
        .skip(skip)
        .limit(pageSize);
      const totalCategories = await Category.countDocuments();
      const totalPages = Math.ceil(totalCategories / pageSize);
      resolve({ categories, totalPages });
    } catch (error) {
      reject(error);
    }
  });
};

const softDeleteCategory = async (categoryId) => {
  return new Promise(async (resolve, reject) => {
    let category = await Category.findById({ _id: categoryId });
    category.isBlocked = !category.isBlocked;
    category.save()
    resolve(category)
  })
}

module.exports = {
  addCategoryToDb,
  getAllCategory,
  softDeleteCategory
}