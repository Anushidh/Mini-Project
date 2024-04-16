const Category = require("../model/categoryModel");
const categoryHelper = require("../helper/categoryHelper");



const getCategory = (req, res) => {
  categoryHelper.getAllCategory()
    .then((categories) => {
      res.render('admin/category', { categories: categories });
    })
    .catch((error) => {
      console.error("Error fetching categories:", error);
      res.status(500).send("Internal Server Error");
    });
};

const addCategory = (req, res) => {
  try {
    categoryHelper.addCategoryToDb(req.body).then((response) => {
      console.log('category already exists');
      res.redirect("/admin/category");
    })
  } catch (err) {
    console.error(err)
  }
};

const getEditCategory = async (req, res) => {
  try {
      const id = req.params.id
      const category = await Category.findOne({ _id: id })
      res.render("admin/editCategory", { category: category })
  } catch (error) {
      console.log(error.message);
  }
}


const editCategory = async (req, res) => {
  try {
      const id = req.params.id;
      const { categoryName, description } = req.body;
      
     
      const nameLowerCase = categoryName.toLowerCase();
      
     
      const existingCategory = await Category.findOne({ _id: { $ne: id }, name: { $regex: new RegExp('^' + nameLowerCase + '$', 'i') } });

      if (existingCategory) {
          console.log("Category name already exists.");
         
      } else {
          
          await Category.findByIdAndUpdate(id, { name: categoryName, description: description });
          res.redirect("/admin/category");
      }

  } catch (error) {
      console.log(error.message);
  }
};


const softDeleteCategory = async (req, res) => {
  console.log(req.params.id);
  categoryHelper.softDeleteCategory(req.params.id)
    .then((response) => {
      if (response.status) {
         res.status(200).json({ error: false, message: "category listed", listed: true });
      } else {
        res.status(200).json({ error: false, message: "category unlisted", listed: false });
      }
    });
}

const getListCategory = async (req, res) => {
  try {
      let id = req.query.id
      console.log("getListCategory");
      await Category.updateOne({ _id: id }, { $set: { isBlocked: false } })
      res.redirect("/admin/category")
  } catch (error) {
      console.log(error.message);
  }
}


const getUnlistCategory = async (req, res) => {
  try {
      let id = req.query.id
      console.log('getUnlistCategory');
      await Category.updateOne({ _id: id }, { $set: { isBlocked: true } })
      res.redirect("/admin/category")
  } catch (error) {
      console.log(error.message);
  }
}

module.exports = {
  getCategory,
  addCategory,
  getEditCategory,
  editCategory,
  softDeleteCategory,
  getListCategory,
  getUnlistCategory
}