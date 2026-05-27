
import sys
import os
sys.path.append(r'd:\agent1.0\ai-legal-kz\backend')

from database import engine
from models import Base

# Create missing tables
Base.metadata.create_all(bind=engine)
print("AICache table created")
