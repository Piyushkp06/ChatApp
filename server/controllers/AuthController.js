import { ApiError } from "../utils/ApiError.js";
import { ApiResponse} from "../utils/ApiResponse.js";
import User from "../models/UserModel.js"
import cacheService from "../services/cacheService.js";
import jwt from "jsonwebtoken"
import { compare } from "bcrypt";
import {renameSync,unlinkSync} from "fs"

const maxAge=3*24*60*60*1000;


const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

/**
 * Password validation
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character (@$!%*?&)
 */
const validatePassword = (password) => {
    const errors = [];
    
    if (!password || password.length < 8) {
        errors.push("Password must be at least 8 characters long");
    }
    if (!/[A-Z]/.test(password)) {
        errors.push("Password must contain at least 1 uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
        errors.push("Password must contain at least 1 lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
        errors.push("Password must contain at least 1 number");
    }
    if (!/[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/~`]/.test(password)) {
        errors.push("Password must contain at least 1 special character");
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

const createToken=(email,userId)=>{
    return jwt.sign({email,userId},process.env.JWT_KEY,{expiresIn:maxAge});
}
export const signup= async(request,response,next)=>{
    try{
        const {email,password}=request.body;
        if(!email || !password){
            throw new ApiError(400,"Email and Password are required");
        }

        if (!validateEmail(email)) {
            throw new ApiError(400,"Email is not valid");
        }

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            throw new ApiError(400, passwordValidation.errors[0]);
        }

        // Rate limiting
        const canProceed = await cacheService.checkRateLimit(`signup:${email}`, 3, 3600);
        if (!canProceed) {
            throw new ApiError(429, "Too many signup attempts. Try again later.");
        }

        const user = await User.create({email, password});
        const token = createToken(email, user._id);

        // Cache session and user
        await cacheService.setSession(user._id.toString(), token);
        await cacheService.setUser(user._id.toString(), {
            id: user._id,
            email: user.email,
            profileSetup: user.profileSetup
        });

        response.cookie("jwt", token, {
            maxAge:3*24*60*60*1000,
            secure:true,
            httpOnly:true,
            sameSite:"None",
        });
        console.log(response.cookie);
        return response.status(201).json({
            user:{
                id:user._id,
                email:user.email,
                profileSetup:user.profileSetup 
            },
        });
    }
    catch(error){
        console.log({error});
        if (error instanceof ApiError) {
            return response.status(error.statusCode).json({ message: error.message });
        }
        return response.status(500).json({ message: "Internal Server Error" });
    }
};

export const login= async(request,response,next)=>{
    try{
        const {email,password}=request.body;
        if(!email || !password){
            throw new ApiError(400,"Email and Password are required");
        }
        if (!validateEmail(email)) {
            throw new ApiError(400,"Email is not valid");
        }

        // Rate limiting
        const canProceed = await cacheService.checkRateLimit(`login:${email}`, 5, 900);
        if (!canProceed) {
            throw new ApiError(429, "Too many login attempts. Try again later.");
        }

        const user = await User.findOne({email});
        if(!user){
            return response.status(404).json({ message: "User with the given email not found" });
        }
        console.log("Login attempt for user:", user._id);

        const auth=await compare(password,user.password);
        if(!auth){
            return response.status(400).json({ message: "Password is incorrect" });
        }

        const token = createToken(email, user._id);

        // Cache session and user, set online
        await cacheService.setSession(user._id.toString(), token);
        await cacheService.setOnline(user._id.toString());
        await cacheService.setUser(user._id.toString(), {
            id: user._id,
            email: user.email,
            profileSetup: user.profileSetup,
            firstName: user.firstName,
            lastName: user.lastName,
            image: user.image,
            color: user.color,
            description: user.description,
        });

        response.cookie("jwt", token, {
            maxAge:3*24*60*60*1000,
            httpOnly:true,
            secure:true,
            sameSite:"None",
        });
        console.log(response.cookie);
        return response.status(200).json({
            user:{
                id:user._id,
                email:user.email,
                profileSetup:user.profileSetup,
                firstName:user.firstName,
                lastName:user.lastName,
                image:user.image,
                color:user.color,
                description:user.description,
            },
        });
    }
    catch(error){
        console.log({error});
        if (error instanceof ApiError) {
            return response.status(error.statusCode).json({ message: error.message });
        }
        return response.status(500).json({ message: "Internal Server Error" });
    }
};

export const getUserInfo= async(request,response,next)=>{
    try{
        // Check cache first
        const cached = await cacheService.getUser(request.userId);
        if (cached) {
            console.log('✅ Cache hit: user');
            return response.status(200).json(cached);
        }

        const userData=await User.findById(request.userId);
        if(!userData){
            throw new ApiError(404,"User with given id not found");
        }

        const userResponse = {
            id:userData._id,
            email:userData.email,
            profileSetup:userData.profileSetup,
            firstName:userData.firstName,
            lastName:userData.lastName,
            image:userData.image,
            color:userData.color,
            description:userData.description,
        };

        // Cache user
        await cacheService.setUser(request.userId, userResponse);
  
        return response.status(200).json(userResponse);            
    }
    catch(error){
        console.log({error});
        if (error instanceof ApiError) {
            return response.status(error.statusCode).json({ message: error.message });
        }
        return response.status(500).json({ message: "Internal Server Error" });
    }
};

export const updateProfile= async(request,response,next)=>{
    try{
        const {userId}=request;
        const {firstName,lastName,color,description}=request.body;
        if(!firstName || !lastName){
            return response.status(404).send("Firstname,lastname and color is required")
        }    
        const userData =await User.findByIdAndUpdate(
            userId,{
                firstName,
                lastName,
                color,
                description,
                profileSetup:true,
            },
            {new:true,runValidators:true}
        );

        const userResponse = {
            id:userData._id,
            email:userData.email,
            profileSetup:userData.profileSetup,
            firstName:userData.firstName,
            lastName:userData.lastName,
            image:userData.image,
            color:userData.color,
            description:userData.description,
        };

        // Update cache
        await cacheService.setUser(userId, userResponse);

        return response.status(200).json(userResponse);            
    }
    catch(error){
        console.log({error});
        if (error instanceof ApiError) {
            return response.status(error.statusCode).json({ message: error.message });
        }
        return response.status(500).json({ message: "Internal Server Error" });
    }
};

export const addProfileImage= async(request,response,next)=>{
    try{
        if(!request.file){
            throw new ApiError(400,"File is required");
        }
        const date=Date.now();
        let fileName="uploads/profiles/"+date+request.file.originalname;
        renameSync(request.file.path,fileName);

        const updatedUser=await User.findByIdAndUpdate(
            request.userId,
            {image:fileName},
            {new:true,runValidators:true}
        );

        // Invalidate cache
        await cacheService.deleteUser(request.userId);

        return response.status(200).json({
            image:updatedUser.image,
        });            
    }
    catch(error){
        console.log({error});
        if (error instanceof ApiError) {
            return response.status(error.statusCode).json({ message: error.message });
        }
        return response.status(500).json({ message: "Internal Server Error" });
    }
};

export const removeProfileImage= async(request,response,next)=>{
    try{
        const {userId}=request;
        const user=await User.findById(userId);
        if(!user){
            throw new ApiError(404,"User not found.")
        }

        if(user.image){
            unlinkSync(user.image);
        }
        user.image=null;
        await user.save();

        // Invalidate cache
        await cacheService.deleteUser(userId);
      
        return response.status(200).send("Profile Image Removed Successfully");    
    }
    catch(error){
        console.log({error});
        if (error instanceof ApiError) {
            return response.status(error.statusCode).json({ message: error.message });
        }
        return response.status(500).json({ message: "Internal Server Error" });
    }
};

export const Logout= async(request,response,next)=>{
    try{
        // Clear session and set offline
        await cacheService.setOffline(request.userId);
        await cacheService.deleteSession(request.userId);

        response.cookie("jwt","",{maxAge:1,secure:true,sameSite:"None"})
        return response.status(200).send("Logout Successfully");    
    }
    catch(error){
        console.log({error});
        if (error instanceof ApiError) {
            return response.status(error.statusCode).json({ message: error.message });
        }
        return response.status(500).json({ message: "Internal Server Error" });
    }
};