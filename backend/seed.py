import random
from database import SessionLocal, engine
import models

# Ensure tables exist
models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

def seed_data():
    if db.query(models.Student).count() > 0:
        print("Database already seeded.")
        return

    # Create fake students
    student_names = ["Alice", "Bob", "Charlie", "Diana", "Ethan", "Fiona", "George", "Hannah", "Ian", "Julia"]
    students = []
    for name in student_names:
        s = models.Student(name=name)
        db.add(s)
        students.append(s)
    db.commit()

    concepts = ["Fractions", "Algebra", "Calculus (Chain Rule)", "Geometry", "Trigonometry"]

    for student in students:
        for concept in concepts:
            # Generate random mastery score
            score = round(random.uniform(0.3, 0.95), 2)
            mastery = models.ConceptMastery(student_id=student.id, concept_id=concept, score=score)
            db.add(mastery)

            # Generate fake session traces if score is low
            if score < 0.6:
                trace = models.SessionTrace(
                    student_id=student.id,
                    concept=concept,
                    struggle_description=f"{student.name} repeatedly forgot to multiply the inner derivative.",
                    breakthrough_description=f"Finally understood after visualizing the function as a nested box."
                )
                db.add(trace)

    db.commit()
    print("Database seeded with mock student data for the dashboard!")

if __name__ == "__main__":
    seed_data()
