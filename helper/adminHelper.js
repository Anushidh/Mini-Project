const User = require('../model/userModel');



async function isAdminExist(adminEmail) {
  try {
    const isAdminExist = await User.findOne({
      email: adminEmail,
      isAdmin: "1"
    });
    return isAdminExist; // This will return null if admin not found
  } catch (error) {
    throw new Error("Error checking admin existence: " + error.message);
  }
}






module.exports = {
  isAdminExist
}