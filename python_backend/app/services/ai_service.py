"""
AI Service - Handles AI generation using Google Gemini
"""
import google.generativeai as genai
from app.config.settings import settings

# Configure Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY)

# Initialize the model
model = genai.GenerativeModel('gemini-1.5-flash')

async def generate_response(content: str) -> str:
    """
    Generate AI response using Gemini
    """
    try:
        response = model.generate_content(content)
        
        if response and response.text:
            return response.text
        
        return "Sorry, I couldn't process that request."
        
    except Exception as e:
        print(f"AI Generation Error: {e}")
        return f"Sorry, there was an error processing your request: {str(e)}"

async def summarize_conversation(messages: list[str]) -> str:
    """
    Summarize a conversation using AI
    """
    if not messages:
        return "No messages to summarize."
    
    formatted_messages = "\n".join(messages)
    
    prompt = f"""You are a helpful assistant that summarizes chat conversations. 
Please provide a concise and informative summary of the following conversation. 
Highlight key points, decisions made, action items, and important topics discussed.
Keep the summary clear and organized with bullet points if needed.

Conversation:
{formatted_messages}

Summary:"""

    try:
        response = model.generate_content(prompt)
        
        if response and response.text:
            return response.text
        
        return "Unable to generate summary at this time."
        
    except Exception as e:
        print(f"Summarization Error: {e}")
        return f"Error generating summary: {str(e)}"
