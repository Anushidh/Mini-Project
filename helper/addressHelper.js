const addressModel = require('../model/addressModel');
const Address = require('../model/addressModel');
const ObjectId = require('mongoose').Types.ObjectId;

const addAddress = async (addressDetails) => {
  try {
    // Convert userId string to ObjectId
    const userId = new ObjectId(addressDetails.userId);
    
    // Create a new address document
    const newAddress = new Address({
      userId: userId,
      name: addressDetails.name,
      house: addressDetails.house,
      city: addressDetails.city,
      state: addressDetails.state,
      pincode: addressDetails.pincode
    });

    // Save the new address document
    const updatedAddress = await newAddress.save();

    return updatedAddress;
  } catch (error) {
    console.error('Error adding address:', error);
    throw error;
  }
};

  
const editAddress = async (addressDetails) => {
  try {
    
    // Convert userId string to ObjectId
    const userId =new ObjectId(addressDetails.userId);
    
    // Check if an address document with the given userId exists
    const existingAddress = await Address.findOne({ userId });
    if (existingAddress) {
      // If an existing address is found, update its fields
      existingAddress.name = addressDetails.name;
      existingAddress.house = addressDetails.house;
      existingAddress.city = addressDetails.city;
      existingAddress.state = addressDetails.state;
      existingAddress.pincode = addressDetails.pincode;

      // Save the updated address document
      const updatedAddress = await existingAddress.save();
      
      return updatedAddress;
    } 
     else {
      const newAddress = new Address({
        name: addressDetails.name,
        house: addressDetails.house,
        city: addressDetails.city,
        state: addressDetails.state,
        pincode: addressDetails.pincode,
        userId: userId
    });
    const savedAddress = await newAddress.save();
   
    return savedAddress;
     }
     
  } catch (error) {
      console.error('Error adding address:', error);
      throw error;
  }
};


const findAllAddress = async (userId) => {
  try {
      const result = await Address.find({ userId: userId });
      // console.log(result);
      return result;
  } catch (error) {
      console.error('Error finding addresses:', error);
      throw error; // Throw the error for handling
  }
};

const findAnAddress = async (Id) => {
  try {
      const result = await Address.findOne({ _id: Id });
      console.log(result);
      return result;
  } catch (error) {
      throw error;
  }
}


module.exports = {
  addAddress,
  findAllAddress,
  findAnAddress,
  editAddress,
}