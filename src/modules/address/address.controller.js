
import mongoose from "mongoose";
import Address from "../../models/Address.model.js";

// Convert boolean values safely
const parseBoolean = (value) => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
};

// CREATE ADDRESS
export const createAddress = async (req, res) => {
  try {
    const {
      fullName,
      phoneNumber,
      addressLine,
      city,
      postalCode,
      country,
      isDefault = false,
    } = req.body;

    const requiredFields = {
      fullName,
      phoneNumber,
      addressLine,
      city,
      postalCode,
      country,
    };

    for (const [field, value] of Object.entries(requiredFields)) {
      if (typeof value !== "string" || !value.trim()) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`,
        });
      }
    }

    const defaultValue = parseBoolean(isDefault);

    if (defaultValue === null) {
      return res.status(400).json({
        success: false,
        message: "isDefault must be true or false",
      });
    }

    // Create the address first
    const address = await Address.create({
      user: req.user._id,
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      addressLine: addressLine.trim(),
      city: city.trim(),
      postalCode: postalCode.trim(),
      country: country.trim(),
      isDefault: defaultValue,
    });

    // Make it the only default address if requested
    if (defaultValue) {
      await Address.updateMany(
        {
          user: req.user._id,
          _id: { $ne: address._id },
        },
        { $set: { isDefault: false } }
      );
    }

    return res.status(201).json({
      success: true,
      message: "Address created successfully",
      data: address,
    });
  } catch (error) {
    console.error("Create address error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create address",
    });
  }
};

// GET LOGGED-IN USER'S ADDRESSES
export const getMyAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: addresses,
    });
  } catch (error) {
    console.error("Get addresses error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch addresses",
    });
  }
};

// UPDATE ADDRESS
export const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID",
      });
    }

    const allowedFields = [
      "fullName",
      "phoneNumber",
      "addressLine",
      "city",
      "postalCode",
      "country",
      "isDefault",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    const address = await Address.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    // Validate and normalize supplied fields
    const stringFields = [
      "fullName",
      "phoneNumber",
      "addressLine",
      "city",
      "postalCode",
      "country",
    ];

    for (const field of stringFields) {
      if (updates[field] !== undefined) {
        if (
          typeof updates[field] !== "string" ||
          !updates[field].trim()
        ) {
          return res.status(400).json({
            success: false,
            message: `${field} must be a non-empty string`,
          });
        }

        updates[field] = updates[field].trim();
      }
    }

    if (updates.isDefault !== undefined) {
      const defaultValue = parseBoolean(updates.isDefault);

      if (defaultValue === null) {
        return res.status(400).json({
          success: false,
          message: "isDefault must be true or false",
        });
      }

      updates.isDefault = defaultValue;
    }

    Object.assign(address, updates);
    await address.save();

    if (updates.isDefault === true) {
      await Address.updateMany(
        {
          user: req.user._id,
          _id: { $ne: address._id },
        },
        { $set: { isDefault: false } }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: address,
    });
  } catch (error) {
    console.error("Update address error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update address",
    });
  }
};

// DELETE ADDRESS
export const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID",
      });
    }

    const address = await Address.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Delete address error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete address",
    });
  }
};
