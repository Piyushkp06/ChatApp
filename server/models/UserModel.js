import mongoose from "mongoose";
import { genSalt,hash } from "bcrypt";

const userSchema=new mongoose.Schema({
    email:{
        type:String,
        required:true,
        unique:true,
    },
    password:{
        type:String,
        required:true,
    },
    firstName:{
        type:String,
        required:false,
    },
    lastName:{
        type:String,
        required:false,
    },
    image:{
        type:String,
        required:false,
    },
    color:{
        type:Number,
        required:false,

    },
    description:{
        type:String,
        required:false,
        maxlength:200,
    },
    profileSetup:{
        type:Boolean,
        default:false,
    },
    // E2E Encryption public key
    publicKey:{
        type:String,
        required:false,
    },
    // Timestamp when public key was last updated
    publicKeyUpdatedAt:{
        type:Date,
        required:false,
    },


});
userSchema.pre("save",async function(next){
    const salt=await genSalt();
    this.password=await hash(this.password,salt);
    next();
});

 const User=mongoose.model("Users",userSchema);

 export default User;


