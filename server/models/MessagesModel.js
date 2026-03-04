import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
sender:{
   type:mongoose.Schema.Types.ObjectId,
   ref:"Users",
   required:true,
},
recipient:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Users",
    required:false,
 },
 messageType:{
    type:String,
    enum:["text","file","encrypted","key-exchange"],
    required:true,
 },
 content:{
    type:String,
    required: function(){
        return this.messageType === "text";
    },
},
// Reply to another message
replyTo:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Messages",
    default:null,
},
// Deletion tracking
deletedForEveryone:{
    type:Boolean,
    default:false,
},
deletedFor:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Users",
}],
// View once media
viewOnce:{
    type:Boolean,
    default:false,
},
viewedBy:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Users",
}],
// Encrypted message fields
encrypted:{
    type:Boolean,
    default:false,
},
encryptedContent:{
    // Base64 encoded ciphertext
    ciphertext: String,
    // Base64 encoded nonce
    nonce: String,
    // Base64 encoded sender's ephemeral public key
    publicKey: String,
    // Message number in the ratchet chain
    messageNumber: Number,
    // Previous chain length for ratchet sync
    previousChainLength: Number,
},
// Key exchange data
keyExchange:{
    // Type: 'init' or 'response'
    type: String,
    // Sender's identity public key
    identityKey: String,
    // Sender's ephemeral public key
    ephemeralKey: String,
},
fileUrl:{
    type:String,
    required: function(){
        return this.messageType === "file";
    },
},
channelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Channel", 
    default: null 
    },
timestamp:{
    type:Date,
    default:Date.now,
},
});

const Message = mongoose.model("Messages",messageSchema);

export default Message;