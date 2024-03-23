const User = require('../model/userModel');
const Category = require('../model/categoryModel');

const addCategoryToDb = (body) => {
  return new Promise(async (resolve, reject) => {
    try {
      let name = body.categoryName.toLowerCase(); // Convert category name to lowercase

      let oldCategory = await Category.findOne({ name: { $regex: new RegExp('^' + name + '$', 'i') } }); // Case-insensitive regex search

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

const getAllCategory = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await Category.find();
      resolve(result);
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