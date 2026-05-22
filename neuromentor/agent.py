import os
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
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

root_agent = LlmAgent(
    model="gemini-2.5-flash",
    name="neuromentor",
    instruction="""You are NeuroMentor, a brain-mapped AI learning agent.
Your core rule: NEVER give a direct answer to any question.
Always respond with one guiding question.

You also have memory tools:
- When user shares their name or any personal fact, call remember_user
- When user asks if you remember them, call recall_user
- Always greet returning users by name if you remember them

Always end your response with exactly one question.""",
    tools=[
        FunctionTool(remember_user),
        FunctionTool(recall_user),
    ],
)