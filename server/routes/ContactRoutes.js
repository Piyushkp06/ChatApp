import {Router} from "express";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import { searchContacts } from "../controllers/ContactsConntroller.js";
  
const contactsRoutes = Router();

contactsRoutes.post("/search",verifyToken,searchContacts);

export  default contactsRoutes;