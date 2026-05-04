import sys, os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Override settings BEFORE importing app
os.environ["DEBUG_MODE"] = "true"
os.environ["JWT_SECRET"] = "test-secret-key-for-unit-tests-only-32chars"
os.environ["DATABASE_URL"] = "sqlite:///./test_db.db"

from database import Base, get_db
from main import app

# Test DB
TEST_DB_URL = "sqlite:///./test_db.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    """Create tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def auth_headers(client):
    """Register a test user and return auth headers."""
    # Send code
    client.post("/api/auth/send-code", json={"phone": "+77001234567"})
    # Register with test OTP
    resp = client.post("/api/auth/register", json={
        "name": "Test User",
        "phone": "+77001234567",
        "code": "111111"
    })
    token = resp.json()["token"]
    return {"Authorization": f"Bearer {token}"}
