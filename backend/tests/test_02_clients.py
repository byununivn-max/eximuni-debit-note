"""거래처 API 테스트"""
import time
import httpx
from tests.conftest import auth_header


def test_list_clients(client: httpx.Client, admin_token: str):
    res = client.get("/api/v1/clients", headers=auth_header(admin_token))
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "items" in data
    assert data["total"] >= 1


def test_create_client(client: httpx.Client, admin_token: str):
    unique_code = f"TC6_{int(time.time()) % 100000}"
    res = client.post("/api/v1/clients", headers=auth_header(admin_token), json={
        "client_code": unique_code,
        "client_name": "Test Client for Step6",
        "currency": "VND",
        "complexity": "Low",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["client_code"] == unique_code
    assert data["is_active"] is True


def test_update_client(client: httpx.Client, admin_token: str):
    # 먼저 test client 생성 후 수정
    unique_code = f"UPD_{int(time.time()) % 100000}"
    create_res = client.post("/api/v1/clients", headers=auth_header(admin_token), json={
        "client_code": unique_code,
        "client_name": "To Be Updated",
        "currency": "VND",
    })
    if create_res.status_code == 201:
        cid = create_res.json()["client_id"]
    else:
        # fallback: 기존 client 검색
        res = client.get("/api/v1/clients?search=TEST", headers=auth_header(admin_token))
        items = res.json()["items"]
        if not items:
            return
        cid = items[0]["client_id"]

    res = client.put(f"/api/v1/clients/{cid}", headers=auth_header(admin_token), json={
        "client_name": "Test Client Updated",
        "contact_person": "Tester",
    })
    assert res.status_code == 200
    assert res.json()["client_name"] == "Test Client Updated"


def test_pic_cannot_create_client(client: httpx.Client, pic_token: str):
    res = client.post("/api/v1/clients", headers=auth_header(pic_token), json={
        "client_code": "PICTEST",
        "client_name": "PIC Test",
    })
    assert res.status_code == 403
