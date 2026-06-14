from contextlib import asynccontextmanager
from uuid import uuid4
import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import SessionLocal, VehicleProject, init_db
from .schemas import GenerateRequest, VehicleProjectResponse, VehicleUpdateRequest
from .services import extract_vehicle, select_asset


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="AutoForge AI API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def serialize(project: VehicleProject) -> VehicleProjectResponse:
    return VehicleProjectResponse(
        id=project.id,
        prompt=project.prompt,
        model=project.selected_model,
        model_name=project.model_name,
        base_price=project.base_price,
        configuration=project.generated_json,
        extraction_mode=project.extraction_mode,
    )


@app.get("/")
def read_root():
    return {"service": "AutoForge AI API"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/generate", response_model=VehicleProjectResponse)
def generate(payload: GenerateRequest, db: Session = Depends(get_db)):
    configuration, extraction_mode = extract_vehicle(payload.prompt)
    asset = select_asset(configuration)
    project = VehicleProject(
        id=str(uuid4()),
        prompt=payload.prompt,
        generated_json=configuration.model_dump(mode="json"),
        selected_model=asset["public_model"],
        model_name=asset["name"],
        base_price=asset["base_price"],
        extraction_mode=extraction_mode,
    )
    db.add(project)
    db.commit()
    return serialize(project)


@app.get("/vehicle/{project_id}", response_model=VehicleProjectResponse)
def get_vehicle(project_id: str, db: Session = Depends(get_db)):
    project = db.get(VehicleProject, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Vehicle project not found")
    return serialize(project)


@app.post("/vehicle/update", response_model=VehicleProjectResponse)
def update_vehicle(payload: VehicleUpdateRequest, db: Session = Depends(get_db)):
    project = db.get(VehicleProject, payload.id)
    if not project:
        raise HTTPException(status_code=404, detail="Vehicle project not found")
    project.generated_json = payload.configuration.model_dump(mode="json")
    db.commit()
    return serialize(project)

