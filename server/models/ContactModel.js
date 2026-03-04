import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
  // The user who owns this contact list
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  // The contact user
  contact: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  // Optional nickname for the contact
  nickname: {
    type: String,
    required: false,
    maxlength: 50,
  },
  // Status of the contact relationship
  status: {
    type: String,
    enum: ["pending", "accepted", "blocked"],
    default: "accepted",
  },
  // Who sent the contact request (for pending requests)
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: false,
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to ensure uniqueness of owner-contact pair
contactSchema.index({ owner: 1, contact: 1 }, { unique: true });

// Index for faster lookups
contactSchema.index({ owner: 1, status: 1 });
contactSchema.index({ contact: 1, status: 1, requestedBy: 1 });

// Update the updatedAt field on save
contactSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Contact = mongoose.model("Contacts", contactSchema);

export default Contact;
