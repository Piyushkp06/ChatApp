import { ApiError } from "../utils/ApiError.js";
import { ApiResponse} from "../utils/ApiResponse.js";
import {User} from "../models/UserModel.js"
import jwt from "jsonwebtoken"
import { compare } from "bcrypt";

const maxAge=3*24*60*60*1000;

const createToken=(email,userId)=>{
    return jwt.sign({email,userId},process.env.JWT_KEY,{expiresIn:maxAge});
}
export const signup= async(request,response,next)=>{
    try{
        const {email,password}=request.body;
        if(!email || !password){
            throw new ApiError(400,"Email and Password are required");
        }
        const user = await User.create({email, password});

        response.cookie("jwt",createToken(email,user.id),{
            maxAge:maxAge*1000,
            secure:true,
            sameSite:"None",

        });
        return response.status(201).json({
            user:{
                id:user.id,
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
        const user = await User.findOne({email});

        if(!user){
         throw new ApiError(400,"User with the given email not found");
        }

        const auth=await compare(password,user.password);
        if(!auth){
            throw new ApiError(400,"Password is incorrect");
        }

        response.cookie("jwt",createToken(email,user.id),{
            maxAge,
            secure:true,
            sameSite:"None",

        });
        return response.status(200).json({
            user:{
             id:user.id,
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
       
             id:userData.id,
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
