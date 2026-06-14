import os

from sqlalchemy import JSON, DateTime, String, Text, create_engine, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./autoforge.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class VehicleProject(Base):
    __tablename__ = "vehicle_projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    prompt: Mapped[str] = mapped_column(Text)
    generated_json: Mapped[dict] = mapped_column(JSON)
    selected_model: Mapped[str] = mapped_column(String(255))
    model_name: Mapped[str] = mapped_column(String(100))
    base_price: Mapped[int]
    extraction_mode: Mapped[str] = mapped_column(String(30))
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())


def init_db() -> None:
    Base.metadata.create_all(engine)

