const User = require('../model/userModel');



  function formatDate(date) {
    // Example format: "May 10, 2022"
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
}












module.exports = {
  formatDate,
};
