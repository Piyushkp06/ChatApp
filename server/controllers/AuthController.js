import { ApiError } from "../utils/ApiError.js";
import { ApiResponse} from "../utils/ApiResponse.js";
import User from "../models/UserModel.js"
import jwt from "jsonwebtoken"
import { compare } from "bcrypt";
import {renameSync,unlinkSync} from "fs"

const maxAge=3*24*60*60*1000;


const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
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

        const user = await User.create({email, password});

        response.cookie("jwt",createToken(email,user._id),{
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
        throw new ApiError(500,"Internal Server Error");
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
        const user = await User.findOne({email});

        if(!user){
         throw new ApiError(400,"User with the given email not found");
        }

        const auth=await compare(password,user.password);
        if(!auth){
            throw new ApiError(400,"Password is incorrect");
        }

        response.cookie("jwt",createToken(email,user._id),{
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
             profileSetup:user.profileSetup ,
             firstName:user.firstName,
             lastName:user.lastName,
             image:user.image,
             color:user.color,
            },
        });

        
    }
    catch(error){
        console.log({error});
        throw new ApiError(500,"Internal Server Error");
    }
};

export const getUserInfo= async(request,response,next)=>{
    try{
       const userData=await User.findById(request.userId);
       if(!userData){
        throw new ApiError(404,"User with given id not found");
       }
  
        return response.status(200).json({
       
             id:userData._id,
             email:userData.email,
             profileSetup:userData.profileSetup ,
             firstName:userData.firstName,
             lastName:userData.lastName,
             image:userData.image,
             color:userData.color,
          
        });            
    }
    catch(error){
        console.log({error});
        throw new ApiError(500,"Internal Server Error");
    }
};

export const updateProfile= async(request,response,next)=>{
    try{
       const {userId}=request;
       const {firstName,lastName,color}=request.body;
       if(!firstName || !lastName){
        return response.status(404).send("Firstname,lastname and color is required")
       }    
       const userData =await User.findByIdAndUpdate(
        userId,{
            firstName,
            lastName,
            color,
            profileSetup:true,
        },
        {new:true,runValidators:true}
       );
        return response.status(200).json({
       
             id:userData._id,
             email:userData.email,
             profileSetup:userData.profileSetup ,
             firstName:userData.firstName,
             lastName:userData.lastName,
             image:userData.image,
             color:userData.color,
          
        });            
    }
    catch(error){
        console.log({error});
        throw new ApiError(500,"Internal Server Error");
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

        return response.status(200).json({
        image:updatedUser.image,
        });            
    }
        catch(error){
        console.log({error});
        throw new ApiError(500,"Internal Server Error");
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
      
        return response.status(200).send("Profile Image Removed Successfully");    
    }
        catch(error){
        console.log({error});
        throw new ApiError(500,"Internal Server Error");
    }
};

export const Logout= async(request,response,next)=>{
    try{
         response.cookie("jwt","",{maxAge:1,secure:true,sameSite:"None"})
        return response.status(200).send("Logout Successfully");    
    }
        catch(error){
        console.log({error});
        throw new ApiError(500,"Internal Server Error");
    }
};