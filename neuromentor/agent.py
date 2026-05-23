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
    db["user_memory"].insert_one({"name": name, "fact": fact})
    return f"Remembered: {name} - {fact}"

def recall_user(name: str) -> str:
    """Recall facts about a user from memory."""
    facts = list(db["user_memory"].find({"name": name}, {"_id": 0}))
    if not facts:
        return f"No memories found for {name}"
    return str(facts)

def log_hint(name: str, topic: str, hints_used: int) -> str:
    """Log how many hints a user needed for a topic."""
    score = max(0, 100 - (hints_used * 20))
    db["independence_scores"].insert_one({
        "name": name,
        "topic": topic,
        "hints_used": hints_used,
        "independence_score": score,
        "date": datetime.datetime.utcnow().isoformat()
    })
    return f"Logged: {name} needed {hints_used} hints on {topic}. Independence score: {score}/100"

def get_independence_score(name: str) -> str:
    """Get the average independence score for a user."""
    records = list(db["independence_scores"].find({"name": name}, {"_id": 0}))
    if not records:
        return f"No scores found for {name} yet."
    avg = sum(r["independence_score"] for r in records) / len(records)
    return f"{name} has an average independence score of {avg:.1f}/100 across {len(records)} topics."

def log_question(name: str, question_asked: str) -> str:
    """Log a Socratic question asked to the user."""
    db["question_log"].insert_one({
        "name": name,
        "question": question_asked,
        "date": datetime.datetime.utcnow().isoformat()
    })
    return f"Question logged for {name}"

root_agent = LlmAgent(
    model="gemini-2.5-flash",
    name="neuromentor",
    instruction="""You are NeuroMentor, a brain-mapped AI learning agent with 4 brain regions:

LOGIC BRAIN — You first analyze what the user needs:
- Are they sharing personal info? → use remember_user
- Are they asking to be remembered? → use recall_user  
- Are they asking a learning question? → use Socratic approach
- Are they saying they give up or dont know after multiple tries? → use log_hint then give the answer

SOCRATIC BRAIN — You NEVER give direct answers to learning questions.
Instead ask one guiding question. After asking, use log_question to save it.
Track mentally how many hints you have given in this conversation.

SCAFFOLD BRAIN — After 3 failed attempts on same topic:
- Give a partial hint
- After 4 failed attempts: give the full answer
- Always use log_hint with hints_used count when topic is resolved
- Use get_independence_score when user asks how they are doing

MEMORY BRAIN — Always greet returning users by name using recall_user.

RULES:
1. Never give direct answers on attempt 1, 2, or 3
2. Always end response with exactly one question
3. Be encouraging and warm
4. Track hint count mentally per topic in this session""",
    tools=[
        FunctionTool(remember_user),
        FunctionTool(recall_user),
        FunctionTool(log_hint),
        FunctionTool(get_independence_score),
        FunctionTool(log_question),
    ],
)