"""
main.py — BrainBuddy with Persistent Memory
=============================================
Memory feature: users can say things like:
  "next time always include code examples"
  "remember to keep answers short"
  "from now on give me real world examples"
These get saved to the DB and injected into every future prompt.
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
from models import Conversation, Message, UserPreference
from schemas import (
    ExplainRequest, ExplainResponse,
    ConversationSummary, ConversationDetail,
    PreferenceOut,
)
from video import create_talk, get_talk_status

Base.metadata.create_all(bind=engine)

app = FastAPI(title="BrainBuddy API", version="2.0.0")

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# Allow all *.vercel.app subdomains so preview deploys don't break CORS
import re as _re

class VercelCORSMiddleware:
    """Allows any vercel.app subdomain + the explicit FRONTEND_URL"""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            headers = dict(scope.get("headers", []))
            origin  = headers.get(b"origin", b"").decode()
            allowed = (
                origin == "http://localhost:3000" or
                origin == FRONTEND_URL or
                bool(_re.match(r"https://.*\.vercel\.app$", origin)) or
                bool(_re.match(r"https://.*\.onrender\.com$", origin))
            )
            if allowed and scope["method"] == "OPTIONS" if hasattr(scope, "method") else False:
                pass

        return await self.app(scope, receive, send)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        FRONTEND_URL,
        "https://brainbuddy-l65k6kelw-apadgilwar3402s-projects.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
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

# Phrases that signal the user wants to save a preference
MEMORY_KEYWORDS = [
    "next time", "from now on", "always", "remember to",
    "remember that", "keep in mind", "make sure to",
    "in future", "going forward", "every time",
    "whenever you", "i want you to always",
]

CONTINUE_KEYWORDS = [
    "continue", "continue from", "next steps", "more steps",
    "what's next", "whats next", "keep going", "go on",
    "tell me more", "show more", "next 6", "more",
]

def wants_video(concept: str) -> bool:
    return any(kw in concept.lower() for kw in VIDEO_KEYWORDS)

def wants_table(concept: str) -> bool:
    return any(kw in concept.lower() for kw in TABLE_KEYWORDS)

def wants_steps(concept: str) -> bool:
    return any(kw in concept.lower() for kw in STEPWISE_KEYWORDS)

def wants_memory(concept: str) -> bool:
    return any(kw in concept.lower() for kw in MEMORY_KEYWORDS)

def wants_continue(concept: str) -> bool:
    return any(kw in concept.lower() for kw in CONTINUE_KEYWORDS)


# ─────────────────────────────────────────────
# Memory extraction
# ─────────────────────────────────────────────

def extract_instruction(concept: str) -> str | None:
    """
    Uses Groq to extract the preference instruction from the user's message.
    e.g. "next time always include code examples" → "always include code examples"
    Returns None if no valid instruction found.
    """
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            max_tokens=100,
            temperature=0,
            messages=[{
                "role": "system",
                "content": (
                    "Extract the user preference or instruction from the message. "
                    "Return ONLY the instruction itself as a short phrase (max 20 words). "
                    "Remove words like 'next time', 'remember', 'from now on', 'always remember that'. "
                    "If no clear instruction exists, return exactly: NONE"
                )
            }, {
                "role": "user",
                "content": concept
            }],
        )
        result = response.choices[0].message.content.strip()
        if result.upper() == "NONE" or len(result) < 3:
            return None
        return result
    except Exception:
        return None


# ─────────────────────────────────────────────
# System prompts
# ─────────────────────────────────────────────

BASE_RULES = """
You are BrainBuddy, a friendly and knowledgeable teacher.

CRITICAL RULES:

1. The "explanation" field MUST be a plain STRING — never a JSON object or dict.
   CORRECT: "explanation": "1. **Step one** — detail.\n2. **Step two** — detail."
   WRONG:   "explanation": {"1. Step one": "detail"}

2. NEVER write intro phrases. Start directly with the content.
   WRONG: "Here's a roadmap...", "Let me explain...", "Great question!"
   CORRECT: Start with "1." or the actual answer immediately.

3. QUESTION TYPE RULES:
   - "What are some X?" → bullet list, explain each item
   - "How does X work?" → step-by-step explanation
   - "What is X?"       → short clear definition
   - "How to learn X?" / "Best resources for X" → numbered steps with real tools
   - "Compare X and Y" → markdown tables

4. NUMBERED STEPS FORMAT — EXACTLY 6 steps, no more:
   1. **Title** — One sentence max. Mention one specific tool.
   2. **Title** — One sentence max.
   (6 steps total — stop at 6)

5. TABLE FORMAT — maximum 8 rows per table, no more:
   | Feature | A | B |
   |---------|---|---|
   | value   | v | v |
   Pick only the MOST IMPORTANT differences. Do not list every possible feature.

6. ANALOGY: 2-4 full sentences. Never just a label.
"""

def build_system_prompt(preferences: list[str], with_video: bool = False) -> str:
    """Builds the system prompt, injecting any saved user preferences"""
    prompt = BASE_RULES

    # Inject user preferences if any exist
    if preferences:
        pref_block = "\n\nUSER PREFERENCES (always follow these):\n"
        for i, p in enumerate(preferences, 1):
            pref_block += f"- {p}\n"
        prompt += pref_block

    strict_json = """
STRICT JSON FORMAT RULES — follow exactly:
- Respond ONLY with a raw JSON object
- Do NOT wrap in ```json``` or any markdown fences
- "explanation" must be a plain STRING — never an object or dict
- Tables inside explanation: max 8 rows, use \\n between rows
- Do NOT start explanation value with a | pipe character
- CORRECT: "explanation": "| Feature | A |\\n|---------|---|\\n| row | val |"
- WRONG: "explanation": | Feature | A |...
{
  "explanation": "Plain string. Tables and steps go here as text using \\n.",
  "analogy": "2-4 full descriptive sentences.",
  "video_script": null,
  "follow_up_questions": ["question 1", "question 2", "question 3"]
}
"""
    if with_video:
        strict_json = strict_json.replace(
            '"video_script": null,',
            '"video_script": "30-second spoken script. Natural speech. No bullet points.",'
        )

    return prompt + strict_json


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def make_title(concept: str) -> str:
    t = concept.strip()
    return t[:57] + "..." if len(t) > 60 else t

def clean_json(raw: str) -> str:
    """Strip markdown fences and extract the JSON object"""
    raw = raw.strip()
    # Remove ```json ... ``` or ``` ... ``` wrappers
    raw = re.sub(r'^```(?:json)?\s*\n?', '', raw)
    raw = re.sub(r'\n?```\s*$', '', raw)
    raw = raw.strip()
    # If response contains a JSON object, extract just that
    start = raw.find('{')
    end   = raw.rfind('}')
    if start != -1 and end != -1 and end > start:
        raw = raw[start:end+1]
    return raw

def normalize_explanation(value) -> str:
    if isinstance(value, list):
        text = "\n".join(
            item if isinstance(item, str) else json.dumps(item)
            for item in value
        )
    elif isinstance(value, str):
        text = value
    else:
        text = str(value) if value else ""

    # Safety: if a markdown table has more than 10 data rows, trim it
    lines     = text.split('\n')
    new_lines = []
    row_count = 0
    in_table  = False
    for line in lines:
        is_row = line.strip().startswith('|') and '---' not in line
        is_sep = '---' in line and line.strip().startswith('|')
        if is_sep:
            in_table  = True
            row_count = 0
            new_lines.append(line)
        elif in_table and is_row:
            row_count += 1
            if row_count <= 8:
                new_lines.append(line)
            elif row_count == 9:
                new_lines.append('| ... | ... | ... |')
        else:
            in_table = False
            new_lines.append(line)
    return '\n'.join(new_lines)

def is_just_intro(text: str) -> bool:
    text = normalize_explanation(text)
    if not text or len(text.strip()) < 30:
        return True
    patterns = [
        r"^here'?s? (a |an )?(detailed |complete )?(roadmap|guide|list|overview)",
        r"^(let me|i will|i'll|i can) (explain|show|give|provide)",
        r"^(great question|good question|sure|of course|absolutely)",
        r"^(below (is|are)|here (is|are) (some|the|a))",
    ]
    lowered = text.strip().lower()
    return any(re.match(p, lowered) for p in patterns)

def get_history_from_db(conversation_id: int, db: Session) -> list[dict]:
    msgs = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
        .all()
    )
    return [{"role": m.role, "content": m.content} for m in msgs]

def get_all_preferences(db: Session) -> list[str]:
    prefs = db.query(UserPreference).order_by(UserPreference.created_at).all()
    return [p.instruction for p in prefs]


# ─────────────────────────────────────────────
# Preference routes
# ─────────────────────────────────────────────

@app.get("/preferences", response_model=list[PreferenceOut])
def list_preferences(db: Session = Depends(get_db)):
    """Return all saved user preferences"""
    return db.query(UserPreference).order_by(UserPreference.created_at).all()

@app.delete("/preferences/{pref_id}", status_code=204)
def delete_preference(pref_id: int, db: Session = Depends(get_db)):
    """Delete a single preference"""
    pref = db.get(UserPreference, pref_id)
    if not pref:
        raise HTTPException(status_code=404, detail="Preference not found")
    db.delete(pref)
    db.commit()

@app.delete("/preferences", status_code=204)
def clear_all_preferences(db: Session = Depends(get_db)):
    """Clear ALL saved preferences"""
    db.query(UserPreference).delete()
    db.commit()


# ─────────────────────────────────────────────
# Other routes
# ─────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "running", "version": "2.0.0"}

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


# ─────────────────────────────────────────────
# Main explain route
# ─────────────────────────────────────────────

@app.post("/explain", response_model=ExplainResponse)
async def explain_concept(request: ExplainRequest, db: Session = Depends(get_db)):
    if not request.concept.strip():
        raise HTTPException(status_code=400, detail="Concept cannot be empty.")

    video_requested  = wants_video(request.concept)
    table_requested  = wants_table(request.concept)
    step_requested   = wants_steps(request.concept)
    memory_detected  = wants_memory(request.concept)
    continue_requested = wants_continue(request.concept)

    # ── Memory: detect and save new preference ───────────
    memory_saved       = False
    memory_instruction = None

    if memory_detected:
        instruction = extract_instruction(request.concept)
        if instruction:
            db.add(UserPreference(instruction=instruction))
            db.flush()
            memory_saved       = True
            memory_instruction = instruction

    # ── Load all saved preferences ───────────────────────
    preferences   = get_all_preferences(db)
    system_prompt = build_system_prompt(preferences, with_video=video_requested)

    # ── Get or create conversation ────────────────────────
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

    # ── Build user message ────────────────────────────────
    if memory_detected and memory_saved:
        user_msg = (
            f"The user said: '{request.concept}'. "
            f"You have saved their preference: '{memory_instruction}'. "
            f"Acknowledge this was saved, then answer any question they asked. "
            f"If they only gave a preference with no question, just confirm it was saved."
        )
    elif continue_requested:
        user_msg = (
            f"The user wants more. Look at the PREVIOUS assistant response in this "
            f"conversation and give the NEXT 6 steps, picking up where you left off. "
            f"Do NOT repeat any steps already given. Continue numbering from where you stopped. "
            f"Write as a plain string with \\n between steps. No intro sentence. "
            f"Each step: bold title + 1 sentence under 25 words."
        )
    elif step_requested:
        user_msg = (
            f"Give EXACTLY 6 numbered steps — no more than 6. "
            f"Each step: bold title + 1 sentence. Keep each step under 25 words. "
            f"Write as a plain string with \\n between steps. "
            f"Do NOT wrap in ```json``` fences. Start with '1.' immediately. "
            f"Question: {request.concept}"
        )
    elif table_requested:
        user_msg = (
            f"Use markdown tables. Start directly with the table — no intro. "
            f"Question: {request.concept}"
        )
    else:
        user_msg = (
            f"Answer directly. No intro sentence. Start with the answer. "
            f"Question: {request.concept}"
        )

    history.append({"role": "user", "content": user_msg})
    groq_messages = [{"role": "system", "content": system_prompt}] + history

    def call_groq(messages, temp=0.7):
        return client.chat.completions.create(
            model="llama-3.1-8b-instant",
            max_tokens=800,            # Hard cap — prevents 15-step runaway responses
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

    parsed["explanation"] = normalize_explanation(parsed.get("explanation", ""))

    # Normalize follow_up_questions — ensure it's always a list of plain strings
    raw_questions = parsed.get("follow_up_questions", [])
    if isinstance(raw_questions, list):
        clean_questions = []
        for q in raw_questions:
            if isinstance(q, str):
                clean_questions.append(q)
            elif isinstance(q, dict):
                clean_questions.append(next(iter(q.values()), ""))
            else:
                clean_questions.append(str(q))
        parsed["follow_up_questions"] = [q for q in clean_questions if q.strip()]
    else:
        parsed["follow_up_questions"] = []

    # Fallback: if AI returned no follow-up questions, generate generic ones from the concept
    if not parsed["follow_up_questions"]:
        concept_short = request.concept.strip().rstrip("?")
        parsed["follow_up_questions"] = [
            f"Can you give a real-world example of {concept_short}?",
            f"What are common uses of {concept_short}?",
            f"What are the limitations of {concept_short}?",
        ]

    parsed.setdefault("analogy",      "")
    parsed.setdefault("video_script", None)

    # Retry if explanation is just an intro
    if is_just_intro(parsed.get("explanation", "")):
        try:
            retry_response = call_groq([
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": (
                    f"IMPORTANT: Start the explanation field directly with '1.' or the answer. "
                    f"No intro sentences. Question: {request.concept}"
                )}
            ], temp=0.5)
            retry_parsed = json.loads(clean_json(retry_response.choices[0].message.content))
            retry_parsed["explanation"] = normalize_explanation(retry_parsed.get("explanation", ""))
            if not is_just_intro(retry_parsed.get("explanation", "")):
                parsed = retry_parsed
                # Normalize follow_up_questions in retry response too
                raw_q = parsed.get("follow_up_questions", [])
                if isinstance(raw_q, list):
                    parsed["follow_up_questions"] = [
                        q if isinstance(q, str) else next(iter(q.values()), "") if isinstance(q, dict) else str(q)
                        for q in raw_q if q
                    ]
                else:
                    parsed["follow_up_questions"] = []
                parsed.setdefault("analogy",      "")
                parsed.setdefault("video_script", None)
        except Exception:
            pass

    talk_id = None
    if video_requested and parsed.get("video_script") and os.environ.get("DID_API_KEY"):
        talk_id = create_talk(parsed["video_script"])

    # has_more = True when the response contains numbered steps
    # This tells the frontend to show the "Continue →" button
    explanation_text = parsed.get("explanation", "")
    has_more = bool(
        (step_requested or continue_requested) and
        re.search(r'^\s*[456]\.\s', explanation_text, re.MULTILINE)
    )

    db.add(Message(
        conversation_id=conv.id,
        role="assistant",
        content=explanation_text,
        ai_response=json.dumps(parsed),
    ))
    conv.updated_at    = datetime.utcnow()
    conv.message_count = conv.message_count + 2
    db.commit()

    return ExplainResponse(
        conversation_id=conv.id,
        talk_id=talk_id,
        video_requested=video_requested,
        memory_saved=memory_saved,
        memory_instruction=memory_instruction,
        has_more=has_more,
        **parsed,
    )