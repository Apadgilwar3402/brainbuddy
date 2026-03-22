from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id            = Column(Integer, primary_key=True, index=True)
    title         = Column(String(200), nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    message_count = Column(Integer, default=0)

    messages = relationship(
        "Message", back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at"
    )


class Message(Base):
    __tablename__ = "messages"

    id              = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    role            = Column(String(20), nullable=False)
    content         = Column(Text, nullable=False)
    ai_response     = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")


class UserPreference(Base):
    """
    Stores persistent instructions the user wants injected into every prompt.
    e.g. "always include code examples", "keep answers brief", etc.
    Each row is one instruction — users can have multiple.
    """
    __tablename__ = "user_preferences"

    id         = Column(Integer, primary_key=True, index=True)
    instruction = Column(Text, nullable=False)    # The actual preference text
    created_at  = Column(DateTime, default=datetime.utcnow)