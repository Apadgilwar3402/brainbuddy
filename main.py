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
    "beginner", "from scratch", "learn",
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
You are BrainBuddy, a friendly teacher who explains engineering, science,
and technology topics simply and clearly. Adjust your language to suit
the question — simple for 5-year-olds, more detailed for learning guides.

CRITICAL RULES — read carefully:

1. DIRECTLY ANSWER THE QUESTION. Never restate or redefine it.
   - "What are some X?"         → LIST actual X items, explain each briefly
   - "How does X work?"         → EXPLAIN the mechanism step by step
   - "What is X?"               → DEFINE X clearly and simply
   - "How to learn X?"          → GIVE A NUMBERED STEP-BY-STEP ROADMAP
   - "Compare X and Y"          → USE MARKDOWN TABLES
   - "Stepwise approach to X"   → NUMBERED LIST of concrete steps

2. STEPWISE / ROADMAP RULE — when asked for steps, a plan, or how to learn:
   - Give a NUMBERED list of concrete, actionable steps
   - Each step should have a title and 1-2 sentences explaining what to do
   - Format like this inside the explanation field:
     1. **Step title** — what to do and why.
     2. **Step title** — what to do and why.
     3. **Step title** — what to do and why.
   - Give at least 5-7 steps for learning roadmaps
   - Be specific — mention actual tools, resources, or concepts to study

3. TABLE RULE — for comparisons use markdown tables:
   | Column 1 | Column 2 |
   |----------|----------|
   | value    | value    |
   For separate tables label them **Similarities** and **Differences**

4. ANALOGY RULE — write 2-4 full descriptive sentences, never just a label.
   BAD:  "Like building blocks"
   GOOD: "Think of learning R like building with LEGO. First you learn what
          each brick does. Then you start snapping them together to make
          small things. Eventually you can build entire cities — that is
          what writing full R programs feels like."

5. NEVER return an empty explanation. If unsure, give your best answer.
"""

ELI5_SYSTEM_PROMPT = BASE_RULES + """
Respond ONLY with a raw JSON object — no markdown fences, no extra text:
{
  "explanation": "Direct answer. Numbered steps for how-to questions. Tables for comparisons.",
  "analogy": "2-4 full descriptive sentences.",
  "video_script": null,
  "follow_up_questions": ["question 1", "question 2", "question 3"]
}
"""

ELI5_WITH_VIDEO_PROMPT = BASE_RULES + """
The user wants a VIDEO — include a spoken script.
Respond ONLY with a raw JSON object — no markdown fences, no extra text:
{
  "explanation": "Direct answer. Numbered steps for how-to questions. Tables for comparisons.",
  "analogy": "2-4 full descriptive sentences.",
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

    # Build user message with explicit instruction based on question type
    if step_requested:
        user_msg = (
            f"Give a detailed numbered step-by-step roadmap or guide. "
            f"Be specific and actionable — mention real tools, resources, or concepts. "
            f"Do NOT give a vague answer. Directly answer: {request.concept}"
        )
    elif table_requested:
        user_msg = (
            f"Answer using markdown tables. Simple language. "
            f"Directly answer without restating: {request.concept}"
        )
    else:
        user_msg = (
            f"Directly answer this using simple, clear language. "
            f"Do not restate the question — just answer it: {request.concept}"
        )

    history.append({"role": "user", "content": user_msg})
    groq_messages = [{"role": "system", "content": system_prompt}] + history

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            max_tokens=1500,
            temperature=0.7,
            messages=groq_messages,
            response_format={"type": "json_object"},
        )
        raw_text = clean_json(response.choices[0].message.content)
        parsed   = json.loads(raw_text)

    except json.JSONDecodeError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=502, detail=f"AI API error: {str(e)}")

    # Ensure all fields exist and explanation is never empty
    parsed.setdefault("analogy",             "")
    parsed.setdefault("video_script",        None)
    parsed.setdefault("follow_up_questions", [])

    # If explanation is empty or missing, retry once with a stricter prompt
    if not parsed.get("explanation", "").strip():
        try:
            retry = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                max_tokens=1500,
                temperature=0.5,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"You MUST provide a detailed answer. Do not return empty fields. Answer this fully: {request.concept}"}
                ],
                response_format={"type": "json_object"},
            )
            retry_text   = clean_json(retry.choices[0].message.content)
            retry_parsed = json.loads(retry_text)
            if retry_parsed.get("explanation", "").strip():
                parsed = retry_parsed
                parsed.setdefault("analogy",             "")
                parsed.setdefault("video_script",        None)
                parsed.setdefault("follow_up_questions", [])
        except Exception:
            pass  # Keep original response if retry also fails

    # Final fallback so we never show "Sorry, I couldn't generate"
    if not parsed.get("explanation", "").strip():
        parsed["explanation"] = f"Here is a guide for: {request.concept}. Please try asking again — sometimes the AI needs a slightly different phrasing."

    talk_id = None
    if video_requested and parsed.get("video_script") and os.environ.get("DID_API_KEY"):
        talk_id = create_talk(parsed["video_script"])

    db.add(Message(
        conversation_id=conv.id,
        role="assistant",
        content=parsed["explanation"],
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
