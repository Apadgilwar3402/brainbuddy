"""
main.py — BrainBuddy (no auth, fully free)
History stored in browser localStorage on the frontend.
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

app = FastAPI(title="BrainBuddy API", version="4.0.0")

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", FRONTEND_URL],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# ─────────────────────────────────────────────
# Keyword detection (with word-boundary checks)
# ─────────────────────────────────────────────

VIDEO_KEYWORDS    = ["video", "watch", "show me", "visual", "animate", "clip", "make a video", "play"]
TABLE_KEYWORDS    = ["table", "tables", "compare", "comparison", "difference", "differences",
                     "similarities", "similarity", "vs", "versus", "side by side", "contrast"]
STEPWISE_KEYWORDS = ["step by step", "step-by-step", "stepwise", "roadmap", "how to learn",
                     "how do i learn", "how can i learn", "where to start", "getting started",
                     "from scratch", "best resources", "best way to learn"]
MEMORY_KEYWORDS   = ["next time", "from now on", "remember to", "remember that",
                     "keep in mind", "make sure to", "in future", "going forward",
                     "every time", "whenever you", "always remember"]
# These are PHRASE-only — no single short words that appear in normal questions
CONTINUE_KEYWORDS = ["continue from", "next steps", "more steps", "what's next",
                     "whats next", "keep going", "give me more steps", "continue the steps"]
SUMMARIZE_KEYWORDS = ["summarize", "summarise", "shorten", "shorter version", "make it shorter",
                      "condense", "compress", "brief version", "briefer", "trim this",
                      "regenerate shorter", "smaller version", "make smaller",
                      "too long", "tldr", "tl;dr", "in fewer words"]


def _word_match(text: str, keywords: list[str]) -> bool:
    """Match keywords using word boundaries so 'more' doesn't match 'more suitable'"""
    lowered = text.lower()
    for kw in keywords:
        if len(kw.split()) == 1:
            # Single word — require word boundary
            if re.search(r'\b' + re.escape(kw) + r'\b', lowered):
                return True
        else:
            # Multi-word phrase — substring match is fine
            if kw in lowered:
                return True
    return False

def wants_video(c):    return _word_match(c, VIDEO_KEYWORDS)
def wants_table(c):    return _word_match(c, TABLE_KEYWORDS)
def wants_steps(c):    return _word_match(c, STEPWISE_KEYWORDS)
def wants_memory(c):   return _word_match(c, MEMORY_KEYWORDS)
def wants_continue(c): return _word_match(c, CONTINUE_KEYWORDS)
def wants_summary(c):  return _word_match(c, SUMMARIZE_KEYWORDS)


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def make_title(t):
    t = t.strip()
    return t[:57] + "..." if len(t) > 60 else t

def clean_topic(concept: str) -> str:
    """Extract a clean short topic from the question for use in follow-up questions"""
    # Remove question words and filler
    topic = re.sub(r'^(what is|what are|how does|how do|explain|tell me about|describe|'
                   r'why is|why does|which one is|which is|can you explain)\s+', '',
                   concept.strip().lower(), flags=re.IGNORECASE)
    topic = topic.rstrip('?').strip()
    # Capitalize first letter
    return topic[:60] if topic else concept[:60]

def clean_json(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r'^```(?:json)?\s*\n?', '', raw)
    raw = re.sub(r'\n?```\s*$', '', raw)
    raw = raw.strip()
    start, end = raw.find('{'), raw.rfind('}')
    if start != -1 and end != -1 and end > start:
        raw = raw[start:end+1]
    return raw

def normalize_explanation(value) -> str:
    if isinstance(value, list):
        text = "\n".join(item if isinstance(item, str) else json.dumps(item) for item in value)
    elif isinstance(value, str):
        text = value
    else:
        text = str(value) if value else ""
    lines, new_lines, row_count, in_table = text.split('\n'), [], 0, False
    for line in lines:
        is_sep = '---' in line and line.strip().startswith('|')
        is_row = line.strip().startswith('|') and '---' not in line
        if is_sep:
            in_table = True; row_count = 0; new_lines.append(line)
        elif in_table and is_row:
            row_count += 1
            if row_count <= 8: new_lines.append(line)
            elif row_count == 9: new_lines.append('| ... | ... |')
        else:
            in_table = False; new_lines.append(line)
    return '\n'.join(new_lines)

def is_just_intro(text: str) -> bool:
    text = normalize_explanation(text)
    if not text or len(text.strip()) < 30: return True
    lowered = text.strip().lower()
    return any(re.match(p, lowered) for p in [
        r"^here'?s? (a |an )?(detailed |complete )?(roadmap|guide|list|overview)",
        r"^(let me|i will|i'll|i can) (explain|show|give|provide)",
        r"^(great question|good question|sure|of course|absolutely)",
    ])

def normalize_questions(raw, concept: str) -> list[str]:
    """Normalize follow-up questions and fall back to topic-specific ones"""
    topic = clean_topic(concept)
    result = []
    if isinstance(raw, list):
        for q in raw:
            if isinstance(q, str) and len(q) > 10:
                result.append(q)
            elif isinstance(q, dict):
                v = next(iter(q.values()), "")
                if v and len(str(v)) > 10:
                    result.append(str(v))
    # Filter out questions that just echo the raw concept awkwardly
    result = [q for q in result if concept[:20].lower() not in q.lower()]
    if not result:
        result = [
            f"Can you give a real-world example of {topic}?",
            f"What are the main advantages of {topic}?",
            f"How does {topic} compare to alternatives?",
        ]
    return result[:3]

def get_history(conv_id: int, db: Session) -> list[dict]:
    msgs = db.query(Message).filter(Message.conversation_id == conv_id).order_by(Message.created_at).all()
    return [{"role": m.role, "content": m.content} for m in msgs]


# ─────────────────────────────────────────────
# System prompts
# ─────────────────────────────────────────────

SUMMARIZE_PROMPT = """
You are a precise text summarizer. Shorten the provided text to 50-70% of its original length.
Keep ALL key points. Remove filler and repetition. Keep same structure and order.
Do NOT add new information. Output ONLY raw JSON — no markdown fences.
{
  "explanation": "The shortened version as a plain string.",
  "analogy": "",
  "video_script": null,
  "follow_up_questions": ["Can you shorten it even more?", "Can you bullet-point the key ideas?", "What are the 3 most important points?"]
}
"""

BASE_RULES = """
You are BrainBuddy, a friendly and knowledgeable teacher.

CRITICAL RULES:
1. "explanation" MUST be a plain STRING — never a JSON object or dict.
2. NEVER write intro phrases. Start directly with the content.
3. ANSWER THE ACTUAL QUESTION ASKED. Do not give unrelated steps.
4. QUESTION TYPES:
   - "What is X?" / "Why?" / "Which is better?" → clear direct answer
   - "Compare X and Y" → markdown tables (max 8 rows)
   - "How to learn X?" / "Roadmap for X" → EXACTLY 6 numbered steps
5. STEPS FORMAT — EXACTLY 6, plain string with \\n, stop at 6:
   1. **Title** — One sentence.
6. TABLE FORMAT — max 8 rows:
   | Feature | A | B |
   |---------|---|---|
7. ANALOGY: 2-4 full sentences. Never a one-word label.
8. follow_up_questions: 3 SHORT questions directly about THIS topic.
   BAD: "What are the limitations of Which one is more suitable for NLP?"
   GOOD: "What are the limitations of RNNs for NLP?"

STRICT JSON — no markdown fences, explanation is a plain string:
"""

def build_system_prompt(with_video: bool = False) -> str:
    json_fmt = """
{
  "explanation": "Plain string. Direct answer. Tables/steps as text using \\n.",
  "analogy": "2-4 full descriptive sentences.",
  "video_script": null,
  "follow_up_questions": ["Short question about THIS specific topic", "Another short question", "Third short question"]
}
"""
    if with_video:
        json_fmt = json_fmt.replace('"video_script": null,', '"video_script": "30-second spoken script.",')
    return BASE_RULES + json_fmt


def extract_text_to_summarize(concept: str) -> str:
    for kw in SUMMARIZE_KEYWORDS:
        lowered = concept.lower()
        idx = lowered.find(kw)
        if idx != -1:
            after = concept[idx + len(kw):].lstrip(' :-\n')
            if len(after) > 20:
                return after
    return concept


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "running", "version": "4.0.0"}

@app.get("/video/{talk_id}")
def check_video(talk_id: str):
    if not os.environ.get("DID_API_KEY"):
        return {"status": "not_configured", "result_url": None}
    return get_talk_status(talk_id)

@app.get("/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Not found")
    return conv

@app.delete("/conversations/{conversation_id}", status_code=204)
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(conv); db.commit()


@app.post("/explain", response_model=ExplainResponse)
async def explain_concept(request: ExplainRequest, db: Session = Depends(get_db)):
    if not request.concept.strip():
        raise HTTPException(status_code=400, detail="Concept cannot be empty.")

    video_req    = wants_video(request.concept)
    table_req    = wants_table(request.concept)
    step_req     = wants_steps(request.concept)
    continue_req = wants_continue(request.concept)
    summary_req  = wants_summary(request.concept)

    # ── Summarize path ───────────────────────────────────
    if summary_req:
        text_to_summarize = extract_text_to_summarize(request.concept)
        if len(text_to_summarize.split()) < 50 and request.conversation_id:
            for m in reversed(get_history(request.conversation_id, db)):
                if m["role"] == "assistant":
                    text_to_summarize = m["content"]; break

        word_count   = len(text_to_summarize.split())
        target_words = int(word_count * 0.6)

        if request.conversation_id:
            conv = db.get(Conversation, request.conversation_id)
        else:
            conv = Conversation(title=f"Summary: {make_title(request.concept)}")
            db.add(conv); db.flush()

        db.add(Message(conversation_id=conv.id, role="user", content=request.concept))

        try:
            resp = client.chat.completions.create(
                model="llama-3.1-8b-instant", max_tokens=1200, temperature=0.3,
                messages=[
                    {"role": "system", "content": SUMMARIZE_PROMPT},
                    {"role": "user", "content": f"Summarize to ~{target_words} words (50-70% of {word_count}). Keep ALL key points.\n\nTEXT:\n{text_to_summarize}"},
                ],
                response_format={"type": "json_object"},
            )
            parsed = json.loads(clean_json(resp.choices[0].message.content))
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=502, detail=f"AI API error: {str(e)}")

        parsed["explanation"] = normalize_explanation(parsed.get("explanation", ""))
        new_wc = len(parsed["explanation"].split())
        parsed["analogy"] = ""
        parsed["video_script"] = None
        parsed["follow_up_questions"] = [
            f"Shorten it further to ~{int(new_wc*0.6)} words?",
            "Bullet-point the key ideas?",
            "What are the 3 most important points?",
        ]
        db.add(Message(conversation_id=conv.id, role="assistant", content=parsed["explanation"], ai_response=json.dumps(parsed)))
        conv.updated_at = datetime.utcnow(); conv.message_count += 2; db.commit()
        return ExplainResponse(conversation_id=conv.id, talk_id=None, video_requested=False, has_more=False, **parsed)

    # ── Normal ELI5 path ─────────────────────────────────
    system_prompt = build_system_prompt(with_video=video_req)

    if request.conversation_id:
        conv = db.get(Conversation, request.conversation_id)
        if not conv:
            raise HTTPException(status_code=404, detail="Not found")
        history = get_history(conv.id, db)
    else:
        conv = Conversation(title=make_title(request.concept))
        db.add(conv); db.flush()
        history = []

    db.add(Message(conversation_id=conv.id, role="user", content=request.concept))

    if continue_req:
        user_msg = "Continue from previous response. Give NEXT 6 steps. No repeats. Continue numbering. Plain string with \\n."
    elif step_req:
        user_msg = f"EXACTLY 6 numbered steps, bold titles, plain string with \\n, start '1.' immediately, each under 25 words. Question: {request.concept}"
    elif table_req:
        user_msg = f"Use markdown tables (max 8 rows). Start directly with table. Question: {request.concept}"
    else:
        user_msg = f"Answer this question directly and fully. No intro sentence. Question: {request.concept}"

    history.append({"role": "user", "content": user_msg})
    groq_messages = [{"role": "system", "content": system_prompt}] + history

    def call_groq(msgs, temp=0.7):
        return client.chat.completions.create(
            model="llama-3.1-8b-instant", max_tokens=800, temperature=temp,
            messages=msgs, response_format={"type": "json_object"},
        )

    try:
        response = call_groq(groq_messages)
        parsed   = json.loads(clean_json(response.choices[0].message.content))
    except json.JSONDecodeError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=502, detail=f"AI API error: {str(e)}")

    parsed["explanation"] = normalize_explanation(parsed.get("explanation", ""))
    parsed["follow_up_questions"] = normalize_questions(parsed.get("follow_up_questions", []), request.concept)
    parsed.setdefault("analogy", "")
    parsed.setdefault("video_script", None)

    if is_just_intro(parsed.get("explanation", "")):
        try:
            rp = json.loads(clean_json(call_groq([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Answer directly — no intro. Question: {request.concept}"}
            ], temp=0.5).choices[0].message.content))
            rp["explanation"] = normalize_explanation(rp.get("explanation", ""))
            if not is_just_intro(rp.get("explanation", "")):
                rp["follow_up_questions"] = normalize_questions(rp.get("follow_up_questions", []), request.concept)
                rp.setdefault("analogy", ""); rp.setdefault("video_script", None)
                parsed = rp
        except: pass

    talk_id  = None
    if video_req and parsed.get("video_script") and os.environ.get("DID_API_KEY"):
        talk_id = create_talk(parsed["video_script"])

    explanation_text = parsed.get("explanation", "")
    has_more = bool((step_req or continue_req) and re.search(r'^\s*[456]\.\s', explanation_text, re.MULTILINE))

    db.add(Message(conversation_id=conv.id, role="assistant", content=explanation_text, ai_response=json.dumps(parsed)))
    conv.updated_at = datetime.utcnow(); conv.message_count += 2; db.commit()

    return ExplainResponse(
        conversation_id=conv.id, talk_id=talk_id,
        video_requested=video_req, has_more=has_more,
        **parsed,
    )
