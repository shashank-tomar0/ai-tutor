from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
import datetime
from database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    sessions = relationship("SessionTrace", back_populates="student")
    mastery = relationship("ConceptMastery", back_populates="student")

class SessionTrace(Base):
    """Tracks a specific interaction where a student struggled or succeeded."""
    __tablename__ = "session_traces"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    concept = Column(String, index=True)
    struggle_description = Column(Text)
    breakthrough_description = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("Student", back_populates="sessions")

class ConceptMastery(Base):
    """Tracks the score of a concept from 0.0 to 1.0"""
    __tablename__ = "concept_mastery"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    concept_id = Column(String, index=True)
    score = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("Student", back_populates="mastery")
