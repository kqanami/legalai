"""Tests for chat endpoints."""


class TestChatSessions:
    def test_create_session(self, client, auth_headers):
        resp = client.post("/api/chat/sessions", json={"title": "Тест"}, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["title"] == "Тест"

    def test_list_sessions(self, client, auth_headers):
        client.post("/api/chat/sessions", json={"title": "S1"}, headers=auth_headers)
        client.post("/api/chat/sessions", json={"title": "S2"}, headers=auth_headers)
        resp = client.get("/api/chat/sessions", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_list_sessions_pagination(self, client, auth_headers):
        for i in range(5):
            client.post("/api/chat/sessions", json={"title": f"S{i}"}, headers=auth_headers)
        resp = client.get("/api/chat/sessions?skip=2&limit=2", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_list_sessions_search(self, client, auth_headers):
        client.post("/api/chat/sessions", json={"title": "Алименты"}, headers=auth_headers)
        client.post("/api/chat/sessions", json={"title": "Налоги"}, headers=auth_headers)
        resp = client.get("/api/chat/sessions?q=алимент", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_delete_session(self, client, auth_headers):
        resp = client.post("/api/chat/sessions", json={"title": "Del"}, headers=auth_headers)
        sid = resp.json()["id"]
        resp = client.delete(f"/api/chat/sessions/{sid}", headers=auth_headers)
        assert resp.status_code == 200

    def test_delete_nonexistent_session(self, client, auth_headers):
        resp = client.delete("/api/chat/sessions/99999", headers=auth_headers)
        assert resp.status_code == 404

    def test_unauthenticated_access(self, client):
        resp = client.get("/api/chat/sessions")
        assert resp.status_code == 403
