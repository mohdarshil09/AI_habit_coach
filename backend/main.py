from fastapi import FastAPI, Request, Depends
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import os
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import get_db, create_tables
from models import Goal, Conversation

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_tables()
    yield
    # Shutdown (if needed)

app = FastAPI(title="AI Habit Coach API", version="1.0.0", lifespan=lifespan)

# CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MessageRequest(BaseModel):
    message: str
    conversation_history: Optional[List[dict]] = []

class GoalRequest(BaseModel):
    goal: str
    goal_type: str  # "daily", "weekly", "monthly"
    category: str = "general"  # "health", "work", "personal", "learning", "general"
    priority: str = "medium"  # "low", "medium", "high"
    target_date: Optional[str] = None
    description: Optional[str] = None

class GoalCompletionRequest(BaseModel):
    goal_id: str
    completed: bool

class GoalProgressRequest(BaseModel):
    goal_id: str
    progress: int  # 0-100

class GoalUpdateRequest(BaseModel):
    goal_id: str
    goal: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    target_date: Optional[str] = None
    description: Optional[str] = None


@app.get("/")
async def root():
    return {"message": "AI Habit Coach API is running!"}

@app.post("/coach")
async def coach(request: MessageRequest, db: Session = Depends(get_db)):
    """Main chat endpoint for AI habit coaching"""
    is_fallback = False
    
    try:
        # Build conversation context
        messages = [
            {
                "role": "system", 
                "content": """You are a friendly and motivational AI habit coach. Your role is to:
                1. Help users set realistic and achievable goals
                2. Provide encouragement and motivation
                3. Offer practical tips for building good habits
                4. Analyze their progress and suggest improvements
                5. Be supportive, understanding, and non-judgmental
                
                Always respond in a warm, encouraging tone. Ask follow-up questions to better understand their needs.
                If they mention specific habits or goals, help them break them down into actionable steps."""
            }
        ]
        
        # Add conversation history if provided
        if request.conversation_history:
            messages.extend(request.conversation_history[-10:])  # Keep last 10 messages for context
        
        # Add current user message
        messages.append({"role": "user", "content": request.message})
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=500,
            temperature=0.7
        )
        
        reply = response.choices[0].message.content
        
    except Exception as e:
        # Fallback responses when OpenAI API is unavailable
        is_fallback = True
        fallback_responses = {
            "hello": "Hello! I'm your AI habit coach. I'm here to help you build better habits and achieve your goals. What would you like to work on today?",
            "habit": "Great! Building habits is all about consistency. Start small - even 5 minutes a day can make a big difference. What specific habit would you like to develop?",
            "goal": "Setting goals is the first step to success! Make sure your goals are SMART: Specific, Measurable, Achievable, Relevant, and Time-bound. What goal are you working towards?",
            "exercise": "Exercise is fantastic for both physical and mental health! Start with just 10-15 minutes a day. You could try walking, stretching, or simple bodyweight exercises. What type of exercise interests you?",
            "morning": "A good morning routine sets the tone for the entire day! Try waking up 15 minutes earlier and doing something positive like stretching, journaling, or having a healthy breakfast. What would you like to include in your morning routine?",
            "motivation": "You've got this! Remember, every expert was once a beginner. Progress, not perfection, is the key. What's one small step you can take today towards your goal?"
        }
        
        # Simple keyword matching for fallback responses
        user_message = request.message.lower()
        reply = "I'm here to help you build better habits! 💪 While I'm having some technical difficulties, here are some general tips: Start small, be consistent, and celebrate your progress. What specific habit or goal would you like to work on?"
        
        for keyword, response in fallback_responses.items():
            if keyword in user_message:
                reply = response
                break
    
    # Save conversation to database
    try:
        conversation = Conversation(
            message=request.message,
            response=reply,
            is_fallback=is_fallback
        )
        db.add(conversation)
        db.commit()
    except Exception as e:
        print(f"Failed to save conversation: {e}")
    
    return {
        "reply": reply,
        "success": True,
        "fallback": is_fallback
    }

@app.post("/goals")
async def create_goal(request: GoalRequest, db: Session = Depends(get_db)):
    """Create a new goal"""
    goal_id = str(uuid.uuid4())
    
    # Parse target_date if provided
    target_date = None
    if request.target_date:
        try:
            target_date = datetime.fromisoformat(request.target_date.replace('Z', '+00:00'))
        except:
            target_date = None
    
    goal = Goal(
        id=goal_id,
        goal=request.goal,
        goal_type=request.goal_type,
        category=request.category,
        priority=request.priority,
        target_date=target_date,
        description=request.description,
        completed=False,
        progress=0,
        streak=0
    )
    
    db.add(goal)
    db.commit()
    db.refresh(goal)
    
    # Convert to dict for response
    goal_data = {
        "id": goal.id,
        "goal": goal.goal,
        "type": goal.goal_type,
        "category": goal.category,
        "priority": goal.priority,
        "target_date": goal.target_date.isoformat() if goal.target_date else None,
        "description": goal.description,
        "completed": goal.completed,
        "created_at": goal.created_at.isoformat(),
        "updated_at": goal.updated_at.isoformat(),
        "progress": goal.progress,
        "streak": goal.streak,
        "last_completed": goal.last_completed.isoformat() if goal.last_completed else None
    }
    
    return {
        "goal": goal_data,
        "success": True
    }

@app.get("/goals")
async def get_goals(db: Session = Depends(get_db)):
    """Get all goals"""
    goals = db.query(Goal).all()
    
    goals_data = []
    for goal in goals:
        goal_data = {
            "id": goal.id,
            "goal": goal.goal,
            "type": goal.goal_type,
            "category": goal.category,
            "priority": goal.priority,
            "target_date": goal.target_date.isoformat() if goal.target_date else None,
            "description": goal.description,
            "completed": goal.completed,
            "created_at": goal.created_at.isoformat(),
            "updated_at": goal.updated_at.isoformat(),
            "progress": goal.progress,
            "streak": goal.streak,
            "last_completed": goal.last_completed.isoformat() if goal.last_completed else None
        }
        goals_data.append(goal_data)
    
    return {
        "goals": goals_data,
        "success": True
    }

@app.put("/goals/{goal_id}")
async def update_goal(goal_id: str, request: GoalCompletionRequest, db: Session = Depends(get_db)):
    """Update goal completion status"""
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    
    if not goal:
        return {
            "error": "Goal not found",
            "success": False
        }
    
    goal.completed = request.completed
    goal.updated_at = datetime.now(timezone.utc)
    
    if request.completed:
        goal.progress = 100
        goal.last_completed = datetime.now(timezone.utc)
        # Simple streak calculation
        if goal.goal_type == "daily":
            goal.streak = goal.streak + 1
    else:
        goal.progress = 0
    
    db.commit()
    db.refresh(goal)
    
    # Convert to dict for response
    goal_data = {
        "id": goal.id,
        "goal": goal.goal,
        "type": goal.goal_type,
        "category": goal.category,
        "priority": goal.priority,
        "target_date": goal.target_date.isoformat() if goal.target_date else None,
        "description": goal.description,
        "completed": goal.completed,
        "created_at": goal.created_at.isoformat(),
        "updated_at": goal.updated_at.isoformat(),
        "progress": goal.progress,
        "streak": goal.streak,
        "last_completed": goal.last_completed.isoformat() if goal.last_completed else None
    }
    
    return {
        "goal": goal_data,
        "success": True
    }

@app.put("/goals/{goal_id}/progress")
async def update_goal_progress(goal_id: str, request: GoalProgressRequest, db: Session = Depends(get_db)):
    """Update goal progress (0-100)"""
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    
    if not goal:
        return {
            "error": "Goal not found",
            "success": False
        }
    
    goal.progress = max(0, min(100, request.progress))
    goal.updated_at = datetime.now(timezone.utc)
    goal.completed = goal.progress == 100
    
    if goal.completed:
        goal.last_completed = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(goal)
    
    # Convert to dict for response
    goal_data = {
        "id": goal.id,
        "goal": goal.goal,
        "type": goal.goal_type,
        "category": goal.category,
        "priority": goal.priority,
        "target_date": goal.target_date.isoformat() if goal.target_date else None,
        "description": goal.description,
        "completed": goal.completed,
        "created_at": goal.created_at.isoformat(),
        "updated_at": goal.updated_at.isoformat(),
        "progress": goal.progress,
        "streak": goal.streak,
        "last_completed": goal.last_completed.isoformat() if goal.last_completed else None
    }
    
    return {
        "goal": goal_data,
        "success": True
    }

@app.put("/goals/{goal_id}/update")
async def update_goal_details(goal_id: str, request: GoalUpdateRequest, db: Session = Depends(get_db)):
    """Update goal details"""
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    
    if not goal:
        return {
            "error": "Goal not found",
            "success": False
        }
    
    if request.goal is not None:
        goal.goal = request.goal
    if request.category is not None:
        goal.category = request.category
    if request.priority is not None:
        goal.priority = request.priority
    if request.target_date is not None:
        try:
            goal.target_date = datetime.fromisoformat(request.target_date.replace('Z', '+00:00'))
        except:
            pass
    if request.description is not None:
        goal.description = request.description
        
    goal.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(goal)
    
    # Convert to dict for response
    goal_data = {
        "id": goal.id,
        "goal": goal.goal,
        "type": goal.goal_type,
        "category": goal.category,
        "priority": goal.priority,
        "target_date": goal.target_date.isoformat() if goal.target_date else None,
        "description": goal.description,
        "completed": goal.completed,
        "created_at": goal.created_at.isoformat(),
        "updated_at": goal.updated_at.isoformat(),
        "progress": goal.progress,
        "streak": goal.streak,
        "last_completed": goal.last_completed.isoformat() if goal.last_completed else None
    }
    
    return {
        "goal": goal_data,
        "success": True
    }

@app.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, db: Session = Depends(get_db)):
    """Delete a goal"""
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    
    if not goal:
        return {
            "error": "Goal not found",
            "success": False
        }
    
    db.delete(goal)
    db.commit()
    
    return {
        "message": "Goal deleted successfully",
        "success": True
    }

@app.get("/goals/categories")
async def get_goal_categories(db: Session = Depends(get_db)):
    """Get all goal categories with counts"""
    goals = db.query(Goal).all()
    
    categories = {}
    for goal in goals:
        category = goal.category or "general"
        if category not in categories:
            categories[category] = {"total": 0, "completed": 0}
        categories[category]["total"] += 1
        if goal.completed:
            categories[category]["completed"] += 1
    
    return {
        "categories": categories,
        "success": True
    }

@app.get("/goals/stats")
async def get_goal_stats(db: Session = Depends(get_db)):
    """Get goal statistics"""
    goals = db.query(Goal).all()
    
    total_goals = len(goals)
    completed_goals = sum(1 for goal in goals if goal.completed)
    total_progress = sum(goal.progress for goal in goals)
    avg_progress = total_progress / total_goals if total_goals > 0 else 0
    
    # Calculate streaks
    total_streak = sum(goal.streak for goal in goals)
    
    return {
        "total_goals": total_goals,
        "completed_goals": completed_goals,
        "completion_rate": (completed_goals / total_goals * 100) if total_goals > 0 else 0,
        "average_progress": round(avg_progress, 1),
        "total_streak": total_streak,
        "success": True
    }

@app.get("/motivation")
async def get_motivation():
    """Get a motivational quote"""
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "You are a motivational coach. Provide a short, inspiring quote about building habits, achieving goals, or personal growth. Keep it under 100 characters and include an emoji."
                },
                {
                    "role": "user",
                    "content": "Give me a motivational quote for someone working on building good habits."
                }
            ],
            max_tokens=100,
            temperature=0.8
        )
        
        quote = response.choices[0].message.content
        
        return {
            "quote": quote,
            "success": True
        }
        
    except Exception as e:
        # Fallback motivational quotes
        fallback_quotes = [
            "Every small step counts! 💪",
            "Progress, not perfection! 🌟",
            "You're stronger than you think! 💪",
            "Today is a new beginning! 🌅",
            "Consistency is the key! 🔑",
            "Believe in yourself! ✨",
            "Small steps, big changes! 🚀",
            "You've got this! 💪",
            "Every day is a fresh start! 🌱",
            "Success starts with action! 🎯"
        ]
        
        import random
        quote = random.choice(fallback_quotes)
        
        return {
            "quote": quote,
            "success": True,
            "fallback": True
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)