from sqlalchemy import Column, String, Boolean, Integer, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()

class Goal(Base):
    __tablename__ = "goals"
    
    id = Column(String, primary_key=True, index=True)
    goal = Column(String, nullable=False)
    goal_type = Column(String, nullable=False)  # daily, weekly, monthly
    category = Column(String, default="general")  # health, work, personal, learning, general
    priority = Column(String, default="medium")  # low, medium, high
    target_date = Column(DateTime, nullable=True)
    description = Column(Text, nullable=True)
    completed = Column(Boolean, default=False)
    progress = Column(Integer, default=0)  # 0-100
    streak = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_completed = Column(DateTime, nullable=True)

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    message = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    is_fallback = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
