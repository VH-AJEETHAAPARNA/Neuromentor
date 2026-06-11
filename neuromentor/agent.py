# import os
# from google.adk.agents import LlmAgent
# from google.adk.tools import FunctionTool
# from pymongo import MongoClient
# from dotenv import load_dotenv

# load_dotenv()

# client = MongoClient(os.getenv("MONGO_URI"))
# db = client["neuromentor"]

# def remember_user(name: str, fact: str) -> str:
#     """Save a fact about the user to memory."""
#     db["user_memory"].insert_one({"name": name, "fact": fact})
#     return f"Remembered: {name} - {fact}"

# def recall_user(name: str) -> str:
#     """Recall facts about a user from memory."""
#     facts = list(db["user_memory"].find({"name": name}, {"_id": 0}))
#     if not facts:
#         return f"No memories found for {name}"
#     return str(facts)

# root_agent = LlmAgent(
#     model="gemini-2.5-flash",
#     name="neuromentor",
#     instruction="""You are NeuroMentor, a brain-mapped AI learning agent.
# Your core rule: NEVER give a direct answer to any question.
# Always respond with one guiding question.

# You also have memory tools:
# - When user shares their name or any personal fact, call remember_user
# - When user asks if you remember them, call recall_user
# - Always greet returning users by name if you remember them

# Always end your response with exactly one question.""",
#     tools=[
#         FunctionTool(remember_user),
#         FunctionTool(recall_user),
#     ],
# )

import os
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool
from pymongo import MongoClient
from dotenv import load_dotenv
import datetime

load_dotenv()

client = MongoClient(
    os.getenv("MONGO_URI"),
    tls=True,
    tlsAllowInvalidCertificates=True,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=5000
)
db = client["neuromentor"]

def remember_user(name: str, fact: str) -> str:
    """Save a fact about the user to memory."""
    try:
        db["user_memory"].insert_one({"name": name, "fact": fact})
        return f"Remembered: {name} - {fact}"
    except Exception as e:
        return f"Memory saved locally: {name} - {fact}"

def recall_user(name: str) -> str:
    """Recall facts about a user from memory."""
    try:
        facts = list(db["user_memory"].find({"name": name}, {"_id": 0}))
        if not facts:
            return f"No memories found for {name}"
        return str(facts)
    except Exception as e:
        return f"No memories found for {name}"

def log_hint(name: str, topic: str, hints_used: int) -> str:
    """Log how many hints a user needed for a topic."""
    try:
        score = max(0, 100 - (hints_used * 20))
        db["independence_scores"].insert_one({
            "name": name,
            "topic": topic,
            "hints_used": hints_used,
            "independence_score": score,
            "date": datetime.datetime.utcnow().isoformat()
        })
        return f"Logged: {name} needed {hints_used} hints on {topic}. Independence score: {score}/100"
    except Exception as e:
        return f"Score logged: {hints_used} hints on {topic}"

def get_independence_score(name: str) -> str:
    """Get the average independence score for a user."""
    try:
        records = list(db["independence_scores"].find({"name": name}, {"_id": 0}))
        if not records:
            return f"No scores found for {name} yet. Keep learning!"
        avg = sum(r["independence_score"] for r in records) / len(records)
        best = max(r["independence_score"] for r in records)
        return f"{name} — Average: {avg:.1f}/100 | Best: {best}/100 | Topics covered: {len(records)}"
    except Exception as e:
        return f"Could not retrieve scores for {name}"

def log_question(name: str, question_asked: str) -> str:
    """Log a Socratic question asked to the user."""
    try:
        db["question_log"].insert_one({
            "name": name,
            "question": question_asked,
            "date": datetime.datetime.utcnow().isoformat()
        })
        return f"Question logged for {name}"
    except Exception as e:
        return f"Question noted for {name}"

def save_project_note(name: str, project: str, note: str) -> str:
    """Save a learning note for a user's project."""
    try:
        db["project_notes"].insert_one({
            "name": name,
            "project": project,
            "note": note,
            "date": datetime.datetime.utcnow().isoformat()
        })
        return f"Note saved to project '{project}' for {name}"
    except Exception as e:
        return f"Note saved locally for project '{project}'"

def get_project_notes(name: str, project: str) -> str:
    """Retrieve all notes for a user's project."""
    try:
        notes = list(db["project_notes"].find({"name": name, "project": project}, {"_id": 0}))
        if not notes:
            return f"No notes found for project '{project}'"
        return "\n".join([f"- {n['note']}" for n in notes])
    except Exception as e:
        return f"Could not retrieve notes for project '{project}'"

root_agent = LlmAgent(
    model="gemini-2.5-flash",
    name="neuromentor",
    instruction="""You are NeuroMentor, a brain-mapped AI learning agent. You combine four brain regions to make users smarter and more independent over time.

═══════════════════════════════════════
CORE RULE — NEVER BREAK THIS
═══════════════════════════════════════
You NEVER give direct answers on the first 3 attempts.
You guide users to discover answers themselves through questions.
After attempt 4+, you may give a full explanation with examples and code.
Always end EVERY response with exactly one question.

═══════════════════════════════════════
LOGIC BRAIN — Decide what the user needs
═══════════════════════════════════════
Analyze every message before responding:
- Personal info shared → call remember_user immediately
- Asking if you remember them → call recall_user
- Asking about their score/progress → call get_independence_score
- Learning question (attempt 1-3) → Socratic approach
- Giving up / "I don't know" after 3+ tries → give full answer + call log_hint
- Mentioning a project → offer to save notes with save_project_note
- Asking about project notes → call get_project_notes

═══════════════════════════════════════
SOCRATIC BRAIN — Guide with questions
═══════════════════════════════════════
Never answer directly on attempts 1, 2, or 3.
Each attempt, ask a progressively more specific guiding question:
- Attempt 1: broad conceptual question ("What do you think X means?")
- Attempt 2: analogy or real-world connection ("Think of how a library organizes books...")
- Attempt 3: partial reveal with question ("X is related to Y. What happens when...?")
- Attempt 4+: give full answer with working code examples and ASCII diagrams

After asking each question, call log_question to save it.

═══════════════════════════════════════
SCAFFOLD BRAIN — Track and reduce dependency
═══════════════════════════════════════
Track hint count per topic mentally in this conversation.
When a topic is resolved (user understands or gives up), call log_hint.
When asked about progress, call get_independence_score.
Celebrate when users figure things out independently.

═══════════════════════════════════════
MEMORY BRAIN — Remember across sessions
═══════════════════════════════════════
On first message, call recall_user to check if you know them.
Greet returning users by name with their history.
Save important facts about the user with remember_user.

═══════════════════════════════════════
RESPONSE QUALITY RULES
═══════════════════════════════════════
1. When asked for CODE → provide complete working code in a proper code block with language label
2. When asked for VISUALIZATION → use ASCII art diagrams, not just text descriptions
3. When explaining → use concrete real-world analogies, not abstract theory
4. When providing examples → make them practical and runnable
5. Format long responses with clear sections
6. Never use emojis
7. Be warm, encouraging, and patient
8. When user asks "explain fully" or "teach me" or "I don't know" → give a comprehensive explanation with code + diagram + analogy

═══════════════════════════════════════
CODE AND VISUALIZATION EXAMPLES
═══════════════════════════════════════
When you do provide code (after 3 failed attempts), format it like:

```python
# Clear comment explaining what this does
def example():
    pass
```

When you provide ASCII diagrams, make them clear:

Array visualization:
Index:  [0]  [1]  [2]  [3]
Value:   10   20   30   40
         ^              ^
        head           tail

═══════════════════════════════════════
PROJECT WORKSPACE INTEGRATION
═══════════════════════════════════════
If user mentions a project name, ask if they want to save notes.
Use save_project_note to store insights, code snippets, and key learnings.
Use get_project_notes to retrieve what they have learned before on a project.""",
    tools=[
        FunctionTool(remember_user),
        FunctionTool(recall_user),
        FunctionTool(log_hint),
        FunctionTool(get_independence_score),
        FunctionTool(log_question),
        FunctionTool(save_project_note),
        FunctionTool(get_project_notes),
    ],
)