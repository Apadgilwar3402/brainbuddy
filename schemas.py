from datetime import datetime
from pydantic import BaseModel


class MessageOut(BaseModel):
    id:              int
    conversation_id: int
    role:            str
    content:         str
    ai_response:     str | None
    created_at:      datetime
    model_config = {"from_attributes": True}

class ConversationSummary(BaseModel):
    id:            int
    title:         str
    created_at:    datetime
    updated_at:    datetime
    message_count: int
    model_config = {"from_attributes": True}

class ConversationDetail(BaseModel):
    id:            int
    title:         str
    created_at:    datetime
    updated_at:    datetime
    message_count: int
    messages:      list[MessageOut]
    model_config = {"from_attributes": True}

class ExplainRequest(BaseModel):
    concept:         str
    conversation_id: int | None = None

class ExplainResponse(BaseModel):
    conversation_id:     int
    talk_id:             str | None
    video_requested:     bool
    explanation:         str
    analogy:             str
    video_script:        str | None
    follow_up_questions: list[str]
    has_more:            bool = False
