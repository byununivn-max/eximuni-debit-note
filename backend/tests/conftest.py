"""테스트 공통 설정 - 실행 중인 서버에 동기 HTTP 요청"""
import pytest
import httpx

BASE_URL = "http://localhost:8000"


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture
def client():
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as c:
        yield c


@pytest.fixture
def admin_token(client: httpx.Client):
    res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "admin123",
    })
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture
def accountant_token(client: httpx.Client):
    res = client.post("/api/v1/auth/login", json={
        "username": "accountant1",
        "password": "account123",
    })
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture
def pic_token(client: httpx.Client):
    res = client.post("/api/v1/auth/login", json={
        "username": "pic1",
        "password": "pic123",
    })
    assert res.status_code == 200
    return res.json()["access_token"]


def auth_header(token: str):
    return {"Authorization": f"Bearer {token}"}
