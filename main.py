"""
NeuroMentor Backend — Clean FastAPI + Gemini Direct API
No ADK dependency, works reliably for hackathon demo
"""
import os
import uuid
import json
import base64
import datetime
import asyncio
from typing import Optional, Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel

# ─── Load environment ──────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "neuromentor", ".env"))
except Exception:
    pass

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
MONGO_URI = os.getenv("MONGO_URI", "")

# ─── App Setup ─────────────────────────────────────────────────────────────────
app = FastAPI(title="NeuroMentor API", version="2.0")

#app.add_middleware(
   # CORSMiddleware,
    #allow_origins=[
        #"http://localhost:3000",
        #"http://127.0.0.1:3000"
    #],
#     allow_credentials=True,
#     allow_methods=["GET", "POST", "OPTIONS"],
#     allow_headers=["*"],
# )



app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://neuromentor-bcca5.web.app",
        "https://neuromentor-bcca5.firebaseapp.com",
        "*"  # temporarily allow all for testing
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




# ─── MongoDB (optional, non-blocking) ──────────────────────────────────────────
db = None
try:
    from pymongo import MongoClient
    import certifi
    if MONGO_URI:
        mongo_client = MongoClient(
            MONGO_URI,
            tls=True,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=3000,
            connectTimeoutMS=3000
        )
        db = mongo_client["neuromentor"]
        db.command("ping")
        print("[MongoDB] Connected successfully")
except Exception as e:
    print(f"[MongoDB] Not connected (non-fatal): {type(e).__name__}")

# ─── Gemini setup (new google-genai SDK) ──────────────────────────────────────
GEMINI_CLIENT = None
SYSTEM_PROMPT = """You are NeuroMentor, a Socratic AI learning assistant.

CORE RULE — NEVER BREAK THIS:
You NEVER give direct answers on the first 3 attempts.
You guide users to discover answers themselves through questions.
After attempt 4+, you may give a full explanation with code.
Always end EVERY response with exactly one question.

SOCRATIC APPROACH:
- Attempt 1: broad conceptual question
- Attempt 2: analogy or real-world connection
- Attempt 3: partial reveal with question
- Attempt 4+: full answer with working code examples and ASCII diagrams

FORMATTING:
- Use **bold** for key concepts
- Use code blocks for code
- Be warm, encouraging, patient
- Never use emojis"""

try:
    from google import genai as google_genai
    from google.genai import types as genai_types
    GEMINI_CLIENT = google_genai.Client(api_key=GOOGLE_API_KEY)
    print("[Gemini] Client initialized (google-genai SDK)")
except ImportError:
    try:
        import google.generativeai as genai_legacy
        genai_legacy.configure(api_key=GOOGLE_API_KEY)
        GEMINI_CLIENT = genai_legacy.GenerativeModel("gemini-2.5-flash", system_instruction=SYSTEM_PROMPT)
        print("[Gemini] Fallback to legacy google-generativeai SDK")
    except Exception as e2:
        print(f"[Gemini] Init failed: {e2}")
except Exception as e:
    print(f"[Gemini] Init failed: {e}")

# ─── In-memory session store ────────────────────────────────────────────────────
# sessions: { session_id: [{"role": "user"|"model", "parts": [{"text": "..."}]}] }
sessions: Dict[str, list] = {}
task_results: Dict[str, Any] = {}

# ─── MODELS ────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    user_id: str = "user"
    session_id: str
    message: str

class TTSRequest(BaseModel):
    text: str
    language_code: str = "en-US"

class TranslateRequest(BaseModel):
    text: str
    target_language: str

# ─── HEALTH CHECK ──────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"status": "NeuroMentor API running", "version": "2.0"}

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "gemini": GEMINI_CLIENT is not None,
        "mongodb": db is not None,
        "api_key_set": bool(GOOGLE_API_KEY)
    }

# ─── SESSION MANAGEMENT ─────────────────────────────────────────────────────────
@app.options("/apps/neuromentor/users/{user_id}/sessions/{session_id}")
async def create_session_options(user_id: str, session_id: str):
    return JSONResponse(status_code=200)

@app.post("/apps/neuromentor/users/{user_id}/sessions/{session_id}")
async def create_session(user_id: str, session_id: str):
    """Create or reset a chat session."""
    if session_id not in sessions:
        sessions[session_id] = []
    return {"session_id": session_id, "status": "ready"}

@app.get("/apps/neuromentor/users/{user_id}/sessions/{session_id}")
async def get_session(user_id: str, session_id: str):
    history = sessions.get(session_id, [])
    return {"session_id": session_id, "messages": history}

# ─── PROFILE ENDPOINTS ─────────────────────────────────────────────────────────
@app.post("/api/profile")
async def save_profile(profile: dict):
    if db is not None:
        try:
            db.profiles.update_one({"uid": profile["uid"]}, {"$set": profile}, upsert=True)
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    return {"status": "local_success"}

@app.get("/api/profile/{uid}")
async def get_profile(uid: str):
    if db is not None:
        try:
            profile = db.profiles.find_one({"uid": uid}, {"_id": 0})
            if profile:
                return {"status": "found", "profile": profile}
            return {"status": "not_found"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    return {"status": "not_found"}



def call_gemini(user_text: str, history: list) -> str:
    """Call Gemini and return the reply text. Handles both SDK versions."""
    if GEMINI_CLIENT is None:
        return "Backend not configured. Please set GOOGLE_API_KEY in neuromentor/.env"
    try:
        # Try new google-genai SDK
        from google import genai as google_genai
        from google.genai import types as genai_types
        
        # Build conversation contents
        contents = []
        for h in history:
            role = h.get("role", "user")
            text = ""
            parts = h.get("parts", [])
            if parts:
                text = parts[0].get("text", "") if isinstance(parts[0], dict) else str(parts[0])
            contents.append(genai_types.Content(role=role, parts=[genai_types.Part(text=text)]))
        contents.append(genai_types.Content(role="user", parts=[genai_types.Part(text=user_text)]))
        
        response = GEMINI_CLIENT.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=genai_types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT)
        )
        return response.text
    except (ImportError, AttributeError):
        # Fallback: legacy google-generativeai SDK
        chat = GEMINI_CLIENT.start_chat(history=history)
        response = chat.send_message(user_text)
        return response.text
    except Exception as e:
        print(f"[Gemini call error] {e}")
        return "What do you think is the core concept behind your question?"

# ─── MAIN CHAT ENDPOINT ─────────────────────────────────────────────────────────
@app.options("/run_sse")
async def run_sse_options():
    return JSONResponse(status_code=200)

@app.post("/run_sse")
async def run_sse(req: dict):
    """Main chat endpoint. Compatible with ADK-style frontend format."""
    try:
        session_id = req.get("session_id", str(uuid.uuid4()))
        new_message = req.get("new_message", {})
        user_text = ""
        
        if isinstance(new_message, dict):
            parts = new_message.get("parts", [])
            if parts and isinstance(parts[0], dict):
                user_text = parts[0].get("text", "")
        
        if not user_text:
            user_text = req.get("message", "")
        if not user_text:
            return JSONResponse({"error": "No message"}, status_code=400)
        
        if session_id not in sessions:
            sessions[session_id] = []
        
        history = sessions[session_id]
        reply = call_gemini(user_text, history)
        
        # Update history (simplified format for both SDK versions)
        sessions[session_id] = history + [
            {"role": "user", "parts": [{"text": user_text}]},
            {"role": "model", "parts": [{"text": reply}]}
        ]
        
        return JSONResponse({"text": reply, "author": "neuromentor"})
        
    except Exception as e:
        print(f"[run_sse error] {e}")
        return JSONResponse({"text": "What aspect of your question do you think is most fundamental?", "author": "neuromentor"}, status_code=200)

# ─── SIMPLER DIRECT CHAT ENDPOINT ──────────────────────────────────────────────
@app.post("/api/chat")
async def chat(req: ChatRequest):
    """Direct simplified chat endpoint."""
    session_id = req.session_id
    if session_id not in sessions:
        sessions[session_id] = []
    reply = call_gemini(req.message, sessions[session_id])
    sessions[session_id] = sessions[session_id] + [
        {"role": "user", "parts": [{"text": req.message}]},
        {"role": "model", "parts": [{"text": reply}]}
    ]
    return {"reply": reply, "session_id": session_id}

# ─── TEXT-TO-SPEECH (Gemini-powered TTS via new SDK, fallback browser) ──────────
@app.post("/api/tts")
async def text_to_speech(req: TTSRequest):
    """TTS: tries Cloud TTS, falls back to Gemini TTS, then browser."""
    # Try Google Cloud TTS
    try:
        from google.cloud import texttospeech
        client = texttospeech.TextToSpeechClient()
        synthesis_input = texttospeech.SynthesisInput(text=req.text[:500])
        voice = texttospeech.VoiceSelectionParams(
            language_code=req.language_code,
            ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
        )
        audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)
        response = client.synthesize_speech(input=synthesis_input, voice=voice, audio_config=audio_config)
        audio_b64 = base64.b64encode(response.audio_content).decode("utf-8")
        return {"audioContent": audio_b64}
    except Exception:
        pass
    # Fallback: let browser handle TTS natively
    return {"audioContent": "", "fallback": True}

# ─── SPEECH-TO-TEXT ─────────────────────────────────────────────────────────────
@app.post("/api/stt")
async def speech_to_text(file: UploadFile = File(...)):
    """STT with Google Cloud, fallback to empty string."""
    try:
        from google.cloud import speech
        content = await file.read()
        client = speech.SpeechClient()
        audio = speech.RecognitionAudio(content=content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            sample_rate_hertz=48000,
            language_code="en-US",
        )
        response = client.recognize(config=config, audio=audio)
        transcript = "".join(r.alternatives[0].transcript for r in response.results)
        return {"text": transcript}
    except Exception as e:
        return {"text": "", "fallback": True, "error": str(e)}

# ─── TRANSLATION ────────────────────────────────────────────────────────────────
@app.post("/api/translate")
async def translate_text(req: TranslateRequest):
    """Translation with Gemini fallback."""
    try:
        from google.cloud import translate_v2 as translate
        translate_client = translate.Client()
        result = translate_client.translate(req.text, target_language=req.target_language)
        return {"translatedText": result["translatedText"]}
    except Exception:
        # Gemini translation fallback
        try:
            if GEMINI_MODEL:
                import google.generativeai as genai
                model = genai.GenerativeModel("gemini-2.5-flash")
                prompt = f"Translate to '{req.target_language}'. Return ONLY the translated text:\n{req.text}"
                res = model.generate_content(prompt)
                return {"translatedText": res.text.strip()}
        except Exception as e2:
            pass
        return {"translatedText": req.text, "fallback": True}

# ─── VISION OCR ─────────────────────────────────────────────────────────────────
@app.post("/api/vision-ocr")
async def vision_ocr(file: UploadFile = File(...)):
    """OCR using Cloud Vision API or Gemini multimodal fallback."""
    content = await file.read()
    mime_type = file.content_type or "image/jpeg"
    
    # Try Cloud Vision first
    try:
        from google.cloud import vision
        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=content)
        response = client.document_text_detection(image=image)
        text = response.full_text_annotation.text
        if text:
            return {"text": text}
    except Exception:
        pass
    
    # Gemini multimodal fallback (new SDK)
    try:
        from google import genai as google_genai
        from google.genai import types as genai_types
        img_b64 = base64.b64encode(content).decode()
        response = GEMINI_CLIENT.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                genai_types.Content(parts=[
                    genai_types.Part(text="Extract all text, handwriting, pseudocode and diagrams. Return extracted text only."),
                    genai_types.Part(inline_data=genai_types.Blob(mime_type=mime_type, data=content))
                ])
            ]
        )
        return {"text": response.text.strip()}
    except Exception as e:
        return {"text": "", "error": str(e)}

# ─── ROADMAP GENERATION (Background Task) ──────────────────────────────────────
async def generate_roadmap_bg(task_id: str, project_name: str, session_id: str):
    """Generate a 6-step Socratic roadmap in background."""
    try:
        prompt = f"""Generate a 6-step learning roadmap for building "{project_name}".
Return ONLY a valid JSON array. Each item must have:
- "title": short step name
- "goal": what to accomplish
- "hint": a Socratic guiding question (no direct answers)
- "starter": starter code comment/skeleton

Example:
[{{"title": "Step 1: Setup", "goal": "Initialize project", "hint": "What is the entry point of a Python program?", "starter": "# Step 1\\n"}}]"""
        
        text = call_gemini(prompt, [])
        
        # Clean markdown wrappers
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:]).strip()
        
        import re
        m = re.search(r"\[[\s\S]*\]", text)
        roadmap = json.loads(m.group(0) if m else text)
        
        if isinstance(roadmap, list) and len(roadmap) > 0:
            task_results[task_id] = {"status": "SUCCESS", "roadmap": roadmap}
        else:
            raise ValueError("Invalid roadmap format")
            
    except Exception as e:
        task_results[task_id] = {
            "status": "SUCCESS",
            "roadmap": [
                {"title": "Project Setup", "goal": "Set up your file structure", "hint": "What core files does every project need?", "starter": "# Step 1: Project Setup\n"},
                {"title": "Core Logic", "goal": "Build main functionality", "hint": "Can you break it into smaller functions?", "starter": "def main():\n    # Your code here\n    pass\n"},
                {"title": "User Input", "goal": "Handle user input/CLI", "hint": "How do you read values from users dynamically?", "starter": "# Handle input\n"},
                {"title": "Data Storage", "goal": "Store session state", "hint": "Where should data persist between runs?", "starter": "# Data storage\n"},
                {"title": "Testing", "goal": "Write validation tests", "hint": "What edge cases could break your code?", "starter": "# Tests\n"},
                {"title": "Polish & Document", "goal": "Refine and document", "hint": "What would make this easy to share?", "starter": "# Documentation\n"},
            ],
            "note": str(e)
        }

@app.post("/api/roadmap-task")
async def create_roadmap_task(req: dict, background_tasks: BackgroundTasks):
    """Queue async roadmap generation."""
    project_name = req.get("projectName", "New Project")
    session_id = req.get("sessionId", "session-1")
    task_id = str(uuid.uuid4())
    task_results[task_id] = {"status": "PENDING"}
    background_tasks.add_task(generate_roadmap_bg, task_id, project_name, session_id)
    return {"taskId": task_id, "status": "PENDING"}

@app.get("/api/roadmap-task/{task_id}")
async def get_roadmap_status(task_id: str):
    return task_results.get(task_id, {"status": "NOT_FOUND"})

# ─── INSIGHTS / EMBEDDINGS ──────────────────────────────────────────────────────
@app.post("/api/insights/embeddings")
async def save_embeddings(req: dict):
    """Generate embeddings and optionally save to MongoDB."""
    text = req.get("text", "")
    session_id = req.get("sessionId", "")
    if not text or len(text.strip()) < 5:
        return {"status": "ok", "skipped": True}
    try:
        from google import genai as google_genai
        result = GEMINI_CLIENT.models.embed_content(
            model="text-embedding-004",
            contents=text
        )
        embedding = result.embeddings[0].values if hasattr(result, 'embeddings') else []
        if db is not None and embedding:
            try:
                db["pinned_insights"].update_one(
                    {"text": text, "sessionId": session_id},
                    {"$set": {"embedding": embedding, "updatedAt": datetime.datetime.utcnow().isoformat()}},
                    upsert=True
                )
            except Exception:
                pass
        return {"status": "success"}
    except Exception as e:
        return {"status": "ok", "note": str(e)}

@app.post("/api/insights/search")
async def search_insights(req: dict):
    """Semantic search through pinned insights."""
    query = req.get("query", "")
    if not query:
        return {"results": []}
    if db is not None:
        try:
            results = list(db["pinned_insights"].find(
                {"text": {"$regex": query, "$options": "i"}}, {"_id": 0, "embedding": 0}
            ).limit(5))
            return {"results": results}
        except Exception:
            pass
    return {"results": []}

# ─── WEBSOCKET TERMINAL ─────────────────────────────────────────────────────────
@app.websocket("/terminal")
async def terminal_websocket(websocket: WebSocket):
    """Interactive PowerShell terminal via WebSocket."""
    await websocket.accept()
    proc = None
    try:
        proc = await asyncio.create_subprocess_shell(
            "powershell.exe -NoLogo -NoExit -Command \"$Host.UI.RawUI.WindowTitle = 'NeuroMentor Terminal'\"",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=os.path.expanduser("~")
        )
    except Exception as e:
        await websocket.send_text(f"\r\n[NeuroMentor] Terminal error: {e}\r\n")
        await websocket.close()
        return

    async def stream_output(stream, ws):
        try:
            while True:
                data = await stream.read(512)
                if not data:
                    break
                try:
                    text = data.decode("utf-8")
                except Exception:
                    text = data.decode("cp1252", errors="replace")
                await ws.send_text(text)
        except Exception:
            pass

    stdout_task = asyncio.create_task(stream_output(proc.stdout, websocket))
    stderr_task = asyncio.create_task(stream_output(proc.stderr, websocket))

    try:
        while True:
            msg = await websocket.receive_text()
            if proc.stdin and not proc.stdin.is_closing():
                proc.stdin.write(msg.encode("utf-8"))
                await proc.stdin.drain()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        stdout_task.cancel()
        stderr_task.cancel()
        try:
            proc.terminate()
        except Exception:
            pass

# ─── ENTRY POINT ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("  NeuroMentor Backend v2.0")
    print(f"  Gemini: {'Ready' if GEMINI_CLIENT is not None else 'CHECK GOOGLE_API_KEY'}")
    print(f"  MongoDB: {'Connected' if db is not None else 'Offline (non-fatal)'}")
    print("API: https://neuromentor.onrender.com")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000)
