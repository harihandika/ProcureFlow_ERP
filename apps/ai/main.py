import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import PORT
from db.connection import close_pool
from routers import audit_pr

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    close_pool()

app = FastAPI(
    title="ProcureFlow AI Engine", 
    version="1.0.0", 
    description="AI microservice for ProcureFlow ERP", 
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "procureflow-ai"}

app.include_router(audit_pr.router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
