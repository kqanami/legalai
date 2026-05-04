"""Tests for authentication endpoints."""


class TestSendCode:
    def test_send_code_valid_phone(self, client):
        resp = client.post("/api/auth/send-code", json={"phone": "+77001234567"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        # debug_code should NOT be in response
        assert "debug_code" not in data

    def test_send_code_invalid_phone(self, client):
        resp = client.post("/api/auth/send-code", json={"phone": "12345"})
        assert resp.status_code == 400

    def test_send_code_empty_phone(self, client):
        resp = client.post("/api/auth/send-code", json={"phone": ""})
        assert resp.status_code == 400


class TestVerify:
    def test_verify_with_test_code(self, client):
        client.post("/api/auth/send-code", json={"phone": "+77001234567"})
        resp = client.post("/api/auth/verify", json={"phone": "+77001234567", "code": "111111"})
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data["user"]["phone"] == "+77001234567"

    def test_verify_wrong_code(self, client):
        client.post("/api/auth/send-code", json={"phone": "+77001234567"})
        resp = client.post("/api/auth/verify", json={"phone": "+77001234567", "code": "000000"})
        assert resp.status_code == 400


class TestRegister:
    def test_register_new_user(self, client):
        client.post("/api/auth/send-code", json={"phone": "+77009876543"})
        resp = client.post("/api/auth/register", json={
            "name": "Тест Юзер",
            "phone": "+77009876543",
            "code": "111111"
        })
        assert resp.status_code == 200
        assert resp.json()["user"]["name"] == "Тест Юзер"


class TestMe:
    def test_get_me_authenticated(self, client, auth_headers):
        resp = client.get("/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Test User"

    def test_get_me_unauthenticated(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 403
