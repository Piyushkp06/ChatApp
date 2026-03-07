"""
AI Controller - Handles AI-related API endpoints
"""
from datetime import datetime
from bson import ObjectId
from app.config.database import get_collection
from app.config.settings import settings
from app.services.ai_service import generate_response

AI_SYSTEM_ID = settings.AI_SYSTEM_ID

async def generate_ai_response(user_id: str, content: str) -> dict:
    """
    Generate AI response and save messages to database
    """
    messages_collection = get_collection("messages")
    users_collection = get_collection("users")
    
    if messages_collection is None or users_collection is None:
        raise RuntimeError("Database not connected")
    
    # Generate AI response
    ai_response_content = await generate_response(content)
    
    # Get AI user info (or create placeholder)
    ai_user = await users_collection.find_one({"_id": ObjectId(AI_SYSTEM_ID)})
    
    current_time = datetime.utcnow()
    
    # Save user message
    user_message = {
        "sender": ObjectId(user_id),
        "recipient": ObjectId(AI_SYSTEM_ID),
        "content": content,
        "messageType": "text",
        "timestamp": current_time,
        "createdAt": current_time,
        "updatedAt": current_time
    }
    user_msg_result = await messages_collection.insert_one(user_message)
    user_message["_id"] = user_msg_result.inserted_id
    
    # Save AI response
    ai_message = {
        "sender": ObjectId(AI_SYSTEM_ID),
        "recipient": ObjectId(user_id),
        "content": ai_response_content,
        "messageType": "text",
        "timestamp": current_time,
        "createdAt": current_time,
        "updatedAt": current_time
    }
    ai_msg_result = await messages_collection.insert_one(ai_message)
    ai_message["_id"] = ai_msg_result.inserted_id
    
    # Populate sender and recipient info
    user_info = await users_collection.find_one(
        {"_id": ObjectId(user_id)},
        {"email": 1, "firstName": 1, "lastName": 1, "image": 1, "color": 1}
    )
    
    ai_info = {
        "_id": AI_SYSTEM_ID,
        "email": "ai@chatapp.com",
        "firstName": "AI",
        "lastName": "Assistant",
        "color": 0
    }
    
    # Format response
    def format_message(msg, sender_info, recipient_info):
        return {
            "_id": str(msg["_id"]),
            "sender": {
                "_id": str(sender_info.get("_id", sender_info.get("_id"))),
                "email": sender_info.get("email", ""),
                "firstName": sender_info.get("firstName", ""),
                "lastName": sender_info.get("lastName", ""),
                "image": sender_info.get("image"),
                "color": sender_info.get("color", 0)
            },
            "recipient": {
                "_id": str(recipient_info.get("_id", recipient_info.get("_id"))),
                "email": recipient_info.get("email", ""),
                "firstName": recipient_info.get("firstName", ""),
                "lastName": recipient_info.get("lastName", ""),
                "image": recipient_info.get("image"),
                "color": recipient_info.get("color", 0)
            },
            "content": msg["content"],
            "messageType": msg["messageType"],
            "timestamp": msg["timestamp"].isoformat() if msg.get("timestamp") else None
        }
    
    return {
        "userMessage": format_message(user_message, user_info or {}, ai_info),
        "aiMessage": format_message(ai_message, ai_info, user_info or {})
    }
