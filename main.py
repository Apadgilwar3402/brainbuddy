"""
main.py — BrainBuddy ELI5 Chatbot (Production)
Set these environment variables on Render:
  GROQ_API_KEY   = gsk_...
  FRONTEND_URL   = https://your-app.vercel.app
  DID_API_KEY    = (optional) for video generation
"""

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from groq import Groq
import os, json, re
from datetime import datetime

from database import engine, get_db, Base
from models import Conversation, Message
from schemas import (
    ExplainRequest, ExplainResponse,
    ConversationSummary, ConversationDetail,
)
from video import create_talk, get_talk_status

Base.metadata.create_all(bind=engine)

app = FastAPI(title="BrainBuddy API", version="1.0.0")

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# ─────────────────────────────────────────────
# Keyword detection
# ─────────────────────────────────────────────

VIDEO_KEYWORDS = [
    "video", "watch", "show me", "visual", "animate",
    "clip", "make a video", "play",
]

TABLE_KEYWORDS = [
    "table", "tables", "compare", "comparison", "difference",
    "differences", "similarities", "similarity", "vs", "versus",
    "side by side", "contrast",
]

STEPWISE_KEYWORDS = [
    "step", "steps", "stepwise", "step by step", "step-by-step",
    "how to learn", "how do i learn", "how can i learn",
    "roadmap", "guide", "path", "pathway", "plan",
    "where to start", "how to start", "getting started",
    "beginner", "from scratch", "learn", "resources", "best way",
]

def wants_video(concept: str) -> bool:
    return any(kw in concept.lower() for kw in VIDEO_KEYWORDS)

def wants_table(concept: str) -> bool:
    return any(kw in concept.lower() for kw in TABLE_KEYWORDS)

def wants_steps(concept: str) -> bool:
    return any(kw in concept.lower() for kw in STEPWISE_KEYWORDS)


# ─────────────────────────────────────────────
# System prompts
# ─────────────────────────────────────────────

BASE_RULES = """
You are BrainBuddy, a friendly and knowledgeable teacher.

CRITICAL RULES:

1. The "explanation" field must contain the FULL answer — not an intro sentence.
   WRONG: "Here's a roadmap to learn R."
   WRONG: "Here are some resources for learning R."
   CORRECT: Start directly with the actual content — steps, list items, or explanation.

2. NEVER write intro phrases like:
   - "Here's a roadmap..."
   - "Here are some resources..."
   - "Let me explain..."
   - "Great question!"
   Just start with the actual answer immediately.

3. QUESTION TYPE RULES:
   - "What are some X?" or "List X"  → bullet list of items, each with 1-2 sentence explanation
   - "How does X work?"              → clear step-by-step or paragraph explanation
   - "What is X?"                    → short clear definition
   - "How to learn X?" or "Stepwise approach to X" or "Best resources for X"
                                     → numbered steps, each with bold title and 1-2 sentences
   - "Compare X and Y"               → markdown tables

4. FOR LEARNING / RESOURCE / ROADMAP QUESTIONS — use this exact format in explanation:
   1. **Title of step** — What to do. Why it matters.
   2. **Title of step** — What to do. Mention specific tools or resources.
   3. **Title of step** — What to do. Be concrete and actionable.
   (give at least 6 steps, mention real tools like books, websites, packages)

5. TABLE FORMAT for comparisons:
   | Feature | Option A | Option B |
   |---------|----------|----------|
   | value   | value    | value    |

6. ANALOGY: 2-4 full sentences. Never just a label or single phrase.

7. NEVER return an empty or one-sentence explanation for a detailed question.
"""

ELI5_SYSTEM_PROMPT = BASE_RULES + """
Respond ONLY with raw JSON — no markdown fences, no extra text outside the JSON:
{
  "explanation": "The FULL answer starting immediately — no intro sentence. Use numbered steps for roadmaps, bullet lists for resource questions.",
  "analogy": "2-4 full descriptive sentences with a vivid comparison.",
  "video_script": null,
  "follow_up_questions": ["question 1", "question 2", "question 3"]
}
"""

ELI5_WITH_VIDEO_PROMPT = BASE_RULES + """
The user wants a VIDEO — include a spoken script.
Respond ONLY with raw JSON — no markdown fences, no extra text outside the JSON:
{
  "explanation": "The FULL answer starting immediately — no intro sentence.",
  "analogy": "2-4 full descriptive sentences with a vivid comparison.",
  "video_script": "A 30-second natural spoken script. No bullet points.",
  "follow_up_questions": ["question 1", "question 2", "question 3"]
}
"""

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def make_title(concept: str) -> str:
    t = concept.strip()
    return t[:57] + "..." if len(t) > 60 else t

def clean_json(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return raw.strip()

def is_just_intro(text: str) -> bool:
    """Detects if the explanation is just an intro sentence with no real content"""
    if not text or len(text.strip()) < 30:
        return True
    intro_patterns = [
        r"^here'?s? (a |an )?(detailed |step[- ]by[- ]step |complete )?(roadmap|guide|list|overview|breakdown|approach)",
        r"^(let me|i will|i'll|i can) (explain|show|give|provide|walk)",
        r"^(great question|good question|sure|of course|absolutely)",
        r"^(below (is|are)|here (is|are) (some|the|a))",
    ]
    lowered = text.strip().lower()
    for pattern in intro_patterns:
        if re.match(pattern, lowered):
            return True
    return False

def get_history_from_db(conversation_id: int, db: Session) -> list[dict]:
    msgs = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
        .all()
    )
    return [{"role": m.role, "content": m.content} for m in msgs]


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "running", "version": "1.0.0"}

@app.get("/video/{talk_id}")
def check_video_status(talk_id: str):
    if not os.environ.get("DID_API_KEY"):
        return {"status": "not_configured", "result_url": None}
    return get_talk_status(talk_id)

@app.get("/conversations", response_model=list[ConversationSummary])
def list_conversations(db: Session = Depends(get_db)):
    return db.query(Conversation).order_by(Conversation.updated_at.desc()).all()

@app.get("/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv

@app.delete("/conversations/{conversation_id}", status_code=204)
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()

@app.post("/explain", response_model=ExplainResponse)
async def explain_concept(request: ExplainRequest, db: Session = Depends(get_db)):
    if not request.concept.strip():
        raise HTTPException(status_code=400, detail="Concept cannot be empty.")

    video_requested = wants_video(request.concept)
    table_requested = wants_table(request.concept)
    step_requested  = wants_steps(request.concept)
    system_prompt   = ELI5_WITH_VIDEO_PROMPT if video_requested else ELI5_SYSTEM_PROMPT

    if request.conversation_id:
        conv = db.get(Conversation, request.conversation_id)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        history = get_history_from_db(conv.id, db)
    else:
        conv = Conversation(title=make_title(request.concept))
        db.add(conv)
        db.flush()
        history = []

    db.add(Message(conversation_id=conv.id, role="user", content=request.concept))

    # Build specific user message based on question type
    if step_requested:
        user_msg = (
            f"Give at least 6 numbered steps with bold titles. "
            f"Start DIRECTLY with '1.' — do NOT write any intro sentence first. "
            f"Mention specific real tools, websites, books, or packages in each step. "
            f"Question: {request.concept}"
        )
    elif table_requested:
        user_msg = (
            f"Answer using markdown tables. "
            f"Start directly with the table — no intro sentence. "
            f"Question: {request.concept}"
        )
    else:
        user_msg = (
            f"Answer directly and fully. "
            f"Do NOT write an intro sentence — start immediately with the answer. "
            f"Question: {request.concept}"
        )

    history.append({"role": "user", "content": user_msg})
    groq_messages = [{"role": "system", "content": system_prompt}] + history

    def call_groq(messages, temp=0.7):
        return client.chat.completions.create(
            model="llama-3.1-8b-instant",
            max_tokens=2000,           # More tokens so steps don't get cut off
            temperature=temp,
            messages=messages,
            response_format={"type": "json_object"},
        )

    try:
        response = call_groq(groq_messages)
        raw_text = clean_json(response.choices[0].message.content)
        parsed   = json.loads(raw_text)

    except json.JSONDecodeError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=502, detail=f"AI API error: {str(e)}")

    parsed.setdefault("analogy",             "")
    parsed.setdefault("video_script",        None)
    parsed.setdefault("follow_up_questions", [])

    # Retry if explanation is empty or just an intro sentence
    if is_just_intro(parsed.get("explanation", "")):
        try:
            retry_msg = (
                f"IMPORTANT: Your previous answer only had an intro sentence with no actual content. "
                f"This time, start your explanation field DIRECTLY with the numbered steps or content. "
                f"No intro. Begin with '1.' immediately. "
                f"Question: {request.concept}"
            )
            retry_response = call_groq(
                [{"role": "system", "content": system_prompt},
                 {"role": "user",   "content": retry_msg}],
                temp=0.5
            )
            retry_parsed = json.loads(clean_json(retry_response.choices[0].message.content))
            if not is_just_intro(retry_parsed.get("explanation", "")):
                parsed = retry_parsed
                parsed.setdefault("analogy",             "")
                parsed.setdefault("video_script",        None)
                parsed.setdefault("follow_up_questions", [])
        except Exception:
            pass

    talk_id = None
    if video_requested and parsed.get("video_script") and os.environ.get("DID_API_KEY"):
        talk_id = create_talk(parsed["video_script"])

    db.add(Message(
        conversation_id=conv.id,
        role="assistant",
        content=parsed.get("explanation", ""),
        ai_response=json.dumps(parsed),
    ))
    conv.updated_at    = datetime.utcnow()
    conv.message_count = conv.message_count + 2
    db.commit()

    return ExplainResponse(
        conversation_id=conv.id,
        talk_id=talk_id,
        video_requested=video_requested,
        **parsed,
    )
