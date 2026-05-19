import os
import json
import pytest
from models import User
from config import settings

@pytest.fixture
def admin_headers(client, setup_db):
    """Register an admin user and return auth headers."""
    # 1. Register a user
    client.post("/api/auth/send-code", json={"phone": "+77476523346"})
    resp = client.post("/api/auth/register", json={
        "name": "Admin User",
        "phone": "+77476523346",
        "code": "111111"
    })
    token = resp.json()["token"]
    
    # 2. Directly set role to admin in the test DB
    from database import get_db
    db = next(get_db())
    try:
        user = db.query(User).filter(User.phone == "+77476523346").first()
        user.role = "admin"
        db.commit()
    finally:
        db.close()
        
    return {"Authorization": f"Bearer {token}"}

class TestAdminSettings:
    def test_get_settings_unauthorized(self, client):
        resp = client.get("/api/admin/settings")
        # Forbidden or Unauthorized
        assert resp.status_code in (401, 403)

    def test_get_settings_authorized_admin(self, client, admin_headers):
        resp = client.get("/api/admin/settings", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "maintenanceMode" in data
        assert "activeRouting" in data
        assert "ragMinSimilarity" in data
        assert "llmTemperature" in data

    def test_update_settings_authorized_admin(self, client, admin_headers):
        # Update settings values
        new_settings = {
            "maintenanceMode": True,
            "activeRouting": "groq",
            "ragMinSimilarity": 0.45,
            "llmTemperature": 0.7
        }
        resp = client.post("/api/admin/settings", json=new_settings, headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["maintenanceMode"] is True
        assert data["activeRouting"] == "groq"
        assert data["ragMinSimilarity"] == 0.45
        assert data["llmTemperature"] == 0.7

        # Verify settings updated on singleton
        assert settings.MAINTENANCE_MODE is True
        assert settings.LLM_PROVIDER == "groq"
        assert settings.RAG_MIN_SIMILARITY == 0.45
        assert settings.LLM_TEMPERATURE == 0.7

        # Verify settings persisted to file
        admin_settings_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "db", "admin_settings.json")
        assert os.path.exists(admin_settings_path)
        with open(admin_settings_path, 'r', encoding='utf-8') as f:
            persisted = json.load(f)
            assert persisted["maintenanceMode"] is True
            assert persisted["activeRouting"] == "groq"
            assert persisted["ragMinSimilarity"] == 0.45
            assert persisted["llmTemperature"] == 0.7

        # Clean up config state
        settings.MAINTENANCE_MODE = False
        settings.LLM_PROVIDER = "gemini"
        if os.path.exists(admin_settings_path):
            os.remove(admin_settings_path)

    def test_maintenance_mode_enforcement(self, client, admin_headers, auth_headers):
        # 1. Enable Maintenance Mode using admin account
        resp = client.post("/api/admin/settings", json={
            "maintenanceMode": True,
            "activeRouting": "gemini",
            "ragMinSimilarity": 0.35,
            "llmTemperature": 0.1
        }, headers=admin_headers)
        assert resp.status_code == 200
        assert settings.MAINTENANCE_MODE is True

        try:
            # 2. Request a regular user endpoint using non-admin client
            resp = client.get("/api/auth/me", headers=auth_headers)
            # Should be blocked with 503
            assert resp.status_code == 503
            assert resp.json()["detail"] == "MAINTENANCE_MODE"

            # 3. Request a regular user endpoint using admin client
            resp = client.get("/api/auth/me", headers=admin_headers)
            # Admin should bypass maintenance mode
            assert resp.status_code == 200

            # 4. Request the public health-check endpoint
            resp = client.get("/health")
            # Should not be blocked by maintenance mode
            assert resp.status_code == 200
        finally:
            # Clean up maintenance mode setting
            client.post("/api/admin/settings", json={
                "maintenanceMode": False,
                "activeRouting": "gemini",
                "ragMinSimilarity": 0.35,
                "llmTemperature": 0.1
            }, headers=admin_headers)
            assert settings.MAINTENANCE_MODE is False
            admin_settings_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "db", "admin_settings.json")
            if os.path.exists(admin_settings_path):
                os.remove(admin_settings_path)
