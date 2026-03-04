import mongoose from "mongoose";
import User from "../models/UserModel.js";
import Message from "../models/MessagesModel.js";
import Contact from "../models/ContactModel.js";

// Search for users to add as contacts (searches all users, but marks existing contacts)
export const searchUsersToAdd = async (request, response, next) => {
  try {
    const { searchTerm } = request.body;
    const userId = request.userId;

    if (searchTerm === undefined || searchTerm === null) {
      return response.status(400).send("searchTerm is required.");
    }

    if (typeof searchTerm !== 'string' || searchTerm.length > 100) {
      return response.status(400).send("Invalid search term.");
    }

    const sanitizedSearchTerm = searchTerm.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const regex = new RegExp(sanitizedSearchTerm, "i");

    // Find users matching the search term
    const users = await User.find({
      _id: { $ne: userId },
      $or: [{ firstName: regex }, { lastName: regex }, { email: regex }]
    }).select("firstName lastName email image color");

    // Get existing contacts for this user
    const existingContacts = await Contact.find({
      owner: userId
    }).select("contact status");

    const existingContactMap = {};
    existingContacts.forEach(c => {
      existingContactMap[c.contact.toString()] = c.status;
    });

    // Mark each user with their contact status
    const usersWithStatus = users.map(user => ({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      image: user.image,
      color: user.color,
      isContact: existingContactMap[user._id.toString()] === "accepted",
      isPending: existingContactMap[user._id.toString()] === "pending",
      contactStatus: existingContactMap[user._id.toString()] || null,
    }));

    return response.status(200).json({ users: usersWithStatus });

  } catch (error) {
    console.log({ error });
    return response.status(500).send("Internal Server Error");
  }
};

// Search within user's contacts only
export const searchContacts = async (request, response, next) => {
  try {
    const { searchTerm } = request.body;
    const userId = request.userId;

    if (searchTerm === undefined || searchTerm === null) {
      return response.status(400).send("searchTerm is required.");
    }

    if (typeof searchTerm !== 'string' || searchTerm.length > 100) {
      return response.status(400).send("Invalid search term.");
    }

    const sanitizedSearchTerm = searchTerm.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const regex = new RegExp(sanitizedSearchTerm, "i");

    // Get accepted contacts for this user with user details
    const contacts = await Contact.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(userId),
          status: "accepted"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "contact",
          foreignField: "_id",
          as: "contactInfo"
        }
      },
      { $unwind: "$contactInfo" },
      {
        $match: {
          $or: [
            { "contactInfo.firstName": regex },
            { "contactInfo.lastName": regex },
            { "contactInfo.email": regex }
          ]
        }
      },
      {
        $project: {
          _id: "$contactInfo._id",
          firstName: "$contactInfo.firstName",
          lastName: "$contactInfo.lastName",
          email: "$contactInfo.email",
          image: "$contactInfo.image",
          color: "$contactInfo.color",
          nickname: 1
        }
      }
    ]);

    return response.status(200).json({ contacts });

  } catch (error) {
    console.log({ error });
    return response.status(500).send("Internal Server Error");
  }
};

export const getContactsForDMList = async (request, response, next) => {
  try {
    let {userId}=request;
      userId=new mongoose.Types.ObjectId(userId);

      const contacts= await Message.aggregate([
        {
          $match:{
            $or:[{sender:userId},{recipient:userId}],
          },
        },
        {
          $sort:{timestamp:-1},
        },
        {
          $group:{
            _id:{
              $cond:{
                if:{$eq:["$sender",userId]},
                then:"$recipient",
                else:"$sender",
              }
            },
            lastMessageTime:{$first:"$timestamp"},
          }
        },
        {
          $lookup:{
            from:"users",
            localField:"_id",
            foreignField:"_id",
            as:"contactInfo"
          }
        },
        {
          $unwind:"$contactInfo",
        },
        {
          $project:{
           _id:1,
           lastMessageTime:1,
           email:"$contactInfo.email", 
           firstName:"$contactInfo.firstName", 
           lastName:"$contactInfo.lastName", 
           color:"$contactInfo.color", 
           image:"$contactInfo.image", 
          }
        },
        {
          $sort:{lastMessageTime:-1},
        }
      ])
    
    return response.status(200).json({contacts});

  } catch (error) {
    console.log({ error });
    return response.status(500).send("Internal Server Error");
  }
};

export const getAllContacts = async (request, response, next) => {
  try {
    const userId = request.userId;

    // Get all accepted contacts for the user
    const userContacts = await Contact.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(userId),
          status: "accepted"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "contact",
          foreignField: "_id",
          as: "contactInfo"
        }
      },
      { $unwind: "$contactInfo" },
      {
        $project: {
          label: {
            $cond: {
              if: { $and: [{ $ifNull: ["$contactInfo.firstName", false] }] },
              then: { 
                $concat: [
                  { $ifNull: ["$contactInfo.firstName", ""] }, 
                  " ", 
                  { $ifNull: ["$contactInfo.lastName", ""] }
                ] 
              },
              else: "$contactInfo.email"
            }
          },
          value: "$contactInfo._id"
        }
      }
    ]);

    return response.status(200).json({ contacts: userContacts });
  } catch (error) {
    console.log({ error });
    return response.status(500).send("Internal Server Error");
  }
};

// Get all contacts for current user
export const getMyContacts = async (request, response, next) => {
  try {
    const userId = request.userId;

    const contacts = await Contact.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(userId),
          status: "accepted"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "contact",
          foreignField: "_id",
          as: "contactInfo"
        }
      },
      { $unwind: "$contactInfo" },
      {
        $project: {
          _id: "$contactInfo._id",
          firstName: "$contactInfo.firstName",
          lastName: "$contactInfo.lastName",
          email: "$contactInfo.email",
          image: "$contactInfo.image",
          color: "$contactInfo.color",
          nickname: 1,
          addedAt: "$createdAt"
        }
      },
      { $sort: { firstName: 1, email: 1 } }
    ]);

    return response.status(200).json({ contacts });
  } catch (error) {
    console.log({ error });
    return response.status(500).send("Internal Server Error");
  }
};

// Add a new contact
export const addContact = async (request, response, next) => {
  try {
    const userId = request.userId;
    const { contactId, nickname } = request.body;

    if (!contactId) {
      return response.status(400).json({ message: "contactId is required." });
    }

    // Check if contact user exists
    const contactUser = await User.findById(contactId);
    if (!contactUser) {
      return response.status(404).json({ message: "User not found." });
    }

    // Cannot add yourself
    if (contactId === userId) {
      return response.status(400).json({ message: "Cannot add yourself as a contact." });
    }

    // Check if already a contact
    const existingContact = await Contact.findOne({
      owner: userId,
      contact: contactId
    });

    if (existingContact) {
      if (existingContact.status === "accepted") {
        return response.status(400).json({ message: "Already in your contacts." });
      }
      if (existingContact.status === "pending") {
        return response.status(400).json({ message: "Contact request already pending." });
      }
      if (existingContact.status === "blocked") {
        return response.status(400).json({ message: "This user is blocked." });
      }
    }

    // Create the contact - direct add (status: accepted)
    const newContact = new Contact({
      owner: userId,
      contact: contactId,
      nickname: nickname || undefined,
      status: "accepted",
      requestedBy: userId
    });

    await newContact.save();

    // Return the contact info
    return response.status(201).json({
      message: "Contact added successfully.",
      contact: {
        _id: contactUser._id,
        firstName: contactUser.firstName,
        lastName: contactUser.lastName,
        email: contactUser.email,
        image: contactUser.image,
        color: contactUser.color,
        nickname: nickname || null
      }
    });

  } catch (error) {
    console.log({ error });
    if (error.code === 11000) {
      return response.status(400).json({ message: "Contact already exists." });
    }
    return response.status(500).send("Internal Server Error");
  }
};

// Remove a contact
export const removeContact = async (request, response, next) => {
  try {
    const userId = request.userId;
    const { contactId } = request.body;

    if (!contactId) {
      return response.status(400).json({ message: "contactId is required." });
    }

    const result = await Contact.findOneAndDelete({
      owner: userId,
      contact: contactId
    });

    if (!result) {
      return response.status(404).json({ message: "Contact not found." });
    }

    return response.status(200).json({ message: "Contact removed successfully." });

  } catch (error) {
    console.log({ error });
    return response.status(500).send("Internal Server Error");
  }
};

// Update contact nickname
export const updateContactNickname = async (request, response, next) => {
  try {
    const userId = request.userId;
    const { contactId, nickname } = request.body;

    if (!contactId) {
      return response.status(400).json({ message: "contactId is required." });
    }

    const contact = await Contact.findOneAndUpdate(
      { owner: userId, contact: contactId },
      { nickname: nickname || null, updatedAt: Date.now() },
      { new: true }
    );

    if (!contact) {
      return response.status(404).json({ message: "Contact not found." });
    }

    return response.status(200).json({ message: "Nickname updated successfully." });

  } catch (error) {
    console.log({ error });
    return response.status(500).send("Internal Server Error");
  }
};

// Get pending contact requests received by user
export const getPendingRequests = async (request, response, next) => {
  try {
    const userId = request.userId;

    // Find contacts where user is the contact and status is pending
    // (meaning someone else added them and it's pending)
    const pendingRequests = await Contact.aggregate([
      {
        $match: {
          contact: new mongoose.Types.ObjectId(userId),
          status: "pending"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "requesterInfo"
        }
      },
      { $unwind: "$requesterInfo" },
      {
        $project: {
          requestId: "$_id",
          requesterId: "$owner",
          firstName: "$requesterInfo.firstName",
          lastName: "$requesterInfo.lastName",
          email: "$requesterInfo.email",
          image: "$requesterInfo.image",
          color: "$requesterInfo.color",
          requestedAt: "$createdAt"
        }
      }
    ]);

    return response.status(200).json({ requests: pendingRequests });

  } catch (error) {
    console.log({ error });
    return response.status(500).send("Internal Server Error");
  }
};

// Send a contact request (for systems that require acceptance)
export const sendContactRequest = async (request, response, next) => {
  try {
    const userId = request.userId;
    const { contactId } = request.body;

    if (!contactId) {
      return response.status(400).json({ message: "contactId is required." });
    }

    const contactUser = await User.findById(contactId);
    if (!contactUser) {
      return response.status(404).json({ message: "User not found." });
    }

    if (contactId === userId) {
      return response.status(400).json({ message: "Cannot send request to yourself." });
    }

    // Check existing relationship
    const existingContact = await Contact.findOne({
      owner: userId,
      contact: contactId
    });

    if (existingContact) {
      return response.status(400).json({ 
        message: existingContact.status === "accepted" 
          ? "Already in your contacts." 
          : "Request already sent or user is blocked." 
      });
    }

    // Create pending contact request (both directions)
    const newContact = new Contact({
      owner: userId,
      contact: contactId,
      status: "pending",
      requestedBy: userId
    });

    await newContact.save();

    return response.status(201).json({ message: "Contact request sent." });

  } catch (error) {
    console.log({ error });
    return response.status(500).send("Internal Server Error");
  }
};

// Accept a contact request
export const acceptContactRequest = async (request, response, next) => {
  try {
    const userId = request.userId;
    const { requesterId } = request.body;

    if (!requesterId) {
      return response.status(400).json({ message: "requesterId is required." });
    }

    // Find and update the pending request
    const contact = await Contact.findOneAndUpdate(
      {
        owner: requesterId,
        contact: userId,
        status: "pending"
      },
      { status: "accepted", updatedAt: Date.now() },
      { new: true }
    );

    if (!contact) {
      return response.status(404).json({ message: "Pending request not found." });
    }

    // Also add the reverse relationship
    const reverseContact = await Contact.findOne({
      owner: userId,
      contact: requesterId
    });

    if (!reverseContact) {
      const newReverseContact = new Contact({
        owner: userId,
        contact: requesterId,
        status: "accepted",
        requestedBy: requesterId
      });
      await newReverseContact.save();
    } else if (reverseContact.status !== "accepted") {
      reverseContact.status = "accepted";
      await reverseContact.save();
    }

    // Get requester info
    const requester = await User.findById(requesterId).select("firstName lastName email image color");

    return response.status(200).json({ 
      message: "Contact request accepted.",
      contact: requester
    });

  } catch (error) {
    console.log({ error });
    return response.status(500).send("Internal Server Error");
  }
};

// Reject a contact request
export const rejectContactRequest = async (request, response, next) => {
  try {
    const userId = request.userId;
    const { requesterId } = request.body;

    if (!requesterId) {
      return response.status(400).json({ message: "requesterId is required." });
    }

    const result = await Contact.findOneAndDelete({
      owner: requesterId,
      contact: userId,
      status: "pending"
    });

    if (!result) {
      return response.status(404).json({ message: "Pending request not found." });
    }

    return response.status(200).json({ message: "Contact request rejected." });

  } catch (error) {
    console.log({ error });
    return response.status(500).send("Internal Server Error");
  }
};

// Block a contact
export const blockContact = async (request, response, next) => {
  try {
    const userId = request.userId;
    const { contactId } = request.body;

    if (!contactId) {
      return response.status(400).json({ message: "contactId is required." });
    }

    // Check if exists
    const existingContact = await Contact.findOne({
      owner: userId,
      contact: contactId
    });

    if (existingContact) {
      existingContact.status = "blocked";
      existingContact.updatedAt = Date.now();
      await existingContact.save();
    } else {
      const newContact = new Contact({
        owner: userId,
        contact: contactId,
        status: "blocked"
      });
      await newContact.save();
    }

    return response.status(200).json({ message: "User blocked successfully." });

  } catch (error) {
    console.log({ error });
    return response.status(500).send("Internal Server Error");
  }
};

// Unblock a contact
export const unblockContact = async (request, response, next) => {
  try {
    const userId = request.userId;
    const { contactId } = request.body;

    if (!contactId) {
      return response.status(400).json({ message: "contactId is required." });
    }

    const result = await Contact.findOneAndDelete({
      owner: userId,
      contact: contactId,
      status: "blocked"
    });

    if (!result) {
      return response.status(404).json({ message: "Blocked user not found." });
    }

    return response.status(200).json({ message: "User unblocked successfully." });

  } catch (error) {
    console.log({ error });
    return response.status(500).send("Internal Server Error");
  }
};
