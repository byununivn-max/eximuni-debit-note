"""인증 API 테스트"""
import httpx
from tests.conftest import auth_header


def test_login_success(client: httpx.Client):
    res = client.post("/api/v1/auth/login", json={
        "username": "admin", "password": "admin123",
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["username"] == "admin"
    assert data["role"] == "admin"


def test_login_wrong_password(client: httpx.Client):
    res = client.post("/api/v1/auth/login", json={
        "username": "admin", "password": "wrong",
    })
    assert res.status_code == 401


def test_login_unknown_user(client: httpx.Client):
    res = client.post("/api/v1/auth/login", json={
        "username": "nobody", "password": "test",
    })
    assert res.status_code == 401


def test_get_me(client: httpx.Client, admin_token: str):
    res = client.get("/api/v1/auth/me", headers=auth_header(admin_token))
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "admin"
    assert data["role_name"] == "admin"


def test_get_me_unauthorized(client: httpx.Client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_refresh_token(client: httpx.Client):
    login_res = client.post("/api/v1/auth/login", json={
        "username": "admin", "password": "admin123",
    })
    refresh = login_res.json()["refresh_token"]
    res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_refresh_token_invalid(client: httpx.Client):
    res = client.post("/api/v1/auth/refresh", json={"refresh_token": "invalid.token.here"})
    assert res.status_code == 401
