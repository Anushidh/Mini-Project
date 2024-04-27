const Category = require("../model/categoryModel");
const categoryHelper = require("../helper/categoryHelper");



const getCategory = async (req, res) => {
  const currentPage = parseInt(req.params.page) || 1; // Get the current page number from the query parameter
  console.log(currentPage);
  const pageSize = 5; // Set the desired page size
  console.log(pageSize);
  try {
    const { categories, totalPages } = await categoryHelper.getAllCategory(currentPage, pageSize);

    res.render('admin/category', {
      categories,
      currentPage,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).send("Internal Server Error");
  }
};

const addCategory = (req, res) => {
  try {
    console.log(req.body);
    categoryHelper.addCategoryToDb(req.body).then((response) => {
      return res.json(response);
    })
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An error occurred while creating the category' });
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
      console.log(id);
      const { categoryName, description } = req.body;
      console.log(req.body);
      
     
      const nameLowerCase = categoryName.toLowerCase();
      
     
      const existingCategory = await Category.findOne({ _id: { $ne: id }, name: { $regex: new RegExp('^' + nameLowerCase + '$', 'i') } });

      if (existingCategory) {
        return res.status(400).json({ error: 'Category name already exists.' });
      } else {
          
          await Category.findByIdAndUpdate(id, { name: categoryName, description: description });
          res.status(200).json({ message: 'Category updated successfully' });
      }

  } catch (error) {
      console.log(error.message);
      res.status(500).json({ error: 'Internal Server Error' });
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