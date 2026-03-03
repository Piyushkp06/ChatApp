import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../models/UserModel.js";

/**
 * Update user's public key
 */
export const updatePublicKey = async (request, response, next) => {
  try {
    const userId = request.userId;
    const { publicKey } = request.body;

    if (!publicKey) {
      throw new ApiError(400, "Public key is required");
    }

    // Validate public key format (should be base64)
    if (!/^[A-Za-z0-9+/=]+$/.test(publicKey)) {
      throw new ApiError(400, "Invalid public key format");
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        publicKey,
        publicKeyUpdatedAt: new Date(),
      },
      { new: true }
    );

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return response.status(200).json(
      new ApiResponse(200, { publicKey: user.publicKey }, "Public key updated successfully")
    );
  } catch (error) {
    console.error("Error updating public key:", error);
    next(error);
  }
};

/**
 * Get a user's public key by their ID
 */
export const getPublicKey = async (request, response, next) => {
  try {
    const { userId } = request.params;

    if (!userId) {
      throw new ApiError(400, "User ID is required");
    }

    const user = await User.findById(userId).select("publicKey publicKeyUpdatedAt");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (!user.publicKey) {
      return response.status(200).json(
        new ApiResponse(200, { publicKey: null }, "User has no public key")
      );
    }

    return response.status(200).json(
      new ApiResponse(200, {
        publicKey: user.publicKey,
        updatedAt: user.publicKeyUpdatedAt,
      }, "Public key retrieved successfully")
    );
  } catch (error) {
    console.error("Error getting public key:", error);
    next(error);
  }
};

/**
 * Get multiple users' public keys
 */
export const getPublicKeys = async (request, response, next) => {
  try {
    const { userIds } = request.body;

    if (!userIds || !Array.isArray(userIds)) {
      throw new ApiError(400, "User IDs array is required");
    }

    const users = await User.find({ _id: { $in: userIds } })
      .select("_id publicKey publicKeyUpdatedAt");

    const publicKeys = {};
    users.forEach((user) => {
      publicKeys[user._id.toString()] = {
        publicKey: user.publicKey || null,
        updatedAt: user.publicKeyUpdatedAt || null,
      };
    });

    return response.status(200).json(
      new ApiResponse(200, { publicKeys }, "Public keys retrieved successfully")
    );
  } catch (error) {
    console.error("Error getting public keys:", error);
    next(error);
  }
};

/**
 * Get current user's public key
 */
export const getMyPublicKey = async (request, response, next) => {
  try {
    const userId = request.userId;

    const user = await User.findById(userId).select("publicKey publicKeyUpdatedAt");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return response.status(200).json(
      new ApiResponse(200, {
        publicKey: user.publicKey || null,
        updatedAt: user.publicKeyUpdatedAt || null,
      }, "Public key retrieved successfully")
    );
  } catch (error) {
    console.error("Error getting own public key:", error);
    next(error);
  }
};
