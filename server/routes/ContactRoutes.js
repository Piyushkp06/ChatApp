import {Router} from "express";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import { 
  getAllContacts, 
  getContactsForDMList, 
  searchContacts,
  searchUsersToAdd,
  getMyContacts,
  addContact,
  removeContact,
  updateContactNickname,
  getPendingRequests,
  sendContactRequest,
  acceptContactRequest,
  rejectContactRequest,
  blockContact,
  unblockContact
} from "../controllers/ContactsConntroller.js";
  
const contactsRoutes = Router();

// Search within user's contacts
contactsRoutes.post("/search", verifyToken, searchContacts);

// Search all users to add as contacts
contactsRoutes.post("/search-users", verifyToken, searchUsersToAdd);

// Get contacts for DM list (based on messages)
contactsRoutes.get("/get-contacts-for-dm", verifyToken, getContactsForDMList);

// Get all contacts (for channel creation, etc.)
contactsRoutes.get("/get-all-contacts", verifyToken, getAllContacts);

// Get my contact list
contactsRoutes.get("/my-contacts", verifyToken, getMyContacts);

// Add a contact directly
contactsRoutes.post("/add", verifyToken, addContact);

// Remove a contact
contactsRoutes.post("/remove", verifyToken, removeContact);

// Update contact nickname
contactsRoutes.post("/update-nickname", verifyToken, updateContactNickname);

// Contact request system (optional feature)
contactsRoutes.get("/pending-requests", verifyToken, getPendingRequests);
contactsRoutes.post("/send-request", verifyToken, sendContactRequest);
contactsRoutes.post("/accept-request", verifyToken, acceptContactRequest);
contactsRoutes.post("/reject-request", verifyToken, rejectContactRequest);

// Block/Unblock
contactsRoutes.post("/block", verifyToken, blockContact);
contactsRoutes.post("/unblock", verifyToken, unblockContact);

export default contactsRoutes;