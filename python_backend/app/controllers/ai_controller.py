"""
AI Controller - Handles AI-related API endpoints
"""
from datetime import datetime
from bson import ObjectId
from app.config.database import get_collection
from app.config.settings import settings
from app.services.ai_service import generate_response, summarize_conversation
from app.services.cache_service import cache_service

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

async def summarize_chat(user_id: str, chat_id: str, chat_type: str) -> dict:
    """
    Summarize chat messages
    """
    messages_collection = get_collection("messages")
    
    if messages_collection is None:
        raise RuntimeError("Database not connected")
    
    if chat_type == "channel":
        # Get channel messages
        cursor = messages_collection.find(
            {"channelId": ObjectId(chat_id)}
        ).sort("timestamp", 1).limit(100)
        messages = await cursor.to_list(length=100)
    else:
        # Get DM messages between two users
        cursor = messages_collection.find({
            "$or": [
                {"sender": ObjectId(user_id), "recipient": ObjectId(chat_id)},
                {"sender": ObjectId(chat_id), "recipient": ObjectId(user_id)}
            ]
        }).sort("timestamp", 1).limit(100)
        messages = await cursor.to_list(length=100)
    
    if not messages:
        return {
            "summary": "No messages to summarize.",
            "messageCount": 0,
            "textMessageCount": 0
        }
    
    # Get user info for message formatting
    users_collection = get_collection("users")
    
    if users_collection is None:
        raise RuntimeError("Database not connected")
    
    user_cache = {}
    
    async def get_user_name(uid):
        uid_str = str(uid)
        if uid_str in user_cache:
            return user_cache[uid_str]
        
        user = await users_collection.find_one(
            {"_id": ObjectId(uid_str)},
            {"firstName": 1, "lastName": 1, "email": 1}
        )
        
        if user:
            name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip()
            if not name:
                name = user.get('email', 'Unknown')
        else:
            name = "Unknown"
        
        user_cache[uid_str] = name
        return name
    
    # Format messages for summarization
    formatted_messages = []
    text_count = 0
    
    for msg in messages:
        if msg.get("messageType") == "text" and msg.get("content"):
            sender_name = await get_user_name(msg.get("sender"))
            formatted_messages.append(f"{sender_name}: {msg['content']}")
            text_count += 1
    
    if not formatted_messages:
        return {
            "summary": "No text messages to summarize. The chat contains only files or media.",
            "messageCount": len(messages),
            "textMessageCount": 0
        }
    
    # Generate summary
    summary = await summarize_conversation(formatted_messages)
    
    # Clear unread count after summarization
    await cache_service.clear_unread(user_id, chat_id)
    
    return {
        "summary": summary,
        "messageCount": len(messages),
        "textMessageCount": text_count
    }
