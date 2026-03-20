from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os

# Use DATABASE_URL env var in production (e.g. Render PostgreSQL)
# Falls back to local SQLite for development
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./brainbuddy.db")

# SQLite needs this extra arg; PostgreSQL does not
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
