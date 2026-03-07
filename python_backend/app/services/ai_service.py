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
