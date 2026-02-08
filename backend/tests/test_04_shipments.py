"""거래 데이터 API 테스트"""
import httpx
from tests.conftest import auth_header


def test_list_shipments(client: httpx.Client, admin_token: str):
    res = client.get("/api/v1/shipments", headers=auth_header(admin_token))
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "items" in data


def test_create_shipment(client: httpx.Client, admin_token: str):
    res = client.post("/api/v1/shipments", headers=auth_header(admin_token), json={
        "client_id": 1,
        "shipment_type": "IMPORT",
        "delivery_date": "2026-04-01",
        "invoice_no": "STEP6-INV-001",
        "mbl": "STEP6-MBL-001",
        "hbl": "STEP6-HBL-001",
        "term": "FOB",
        "fee_details": [
            {"fee_item_id": 1, "amount_usd": 500.00, "currency": "USD"},
            {"fee_item_id": 14, "amount_usd": 200.00, "currency": "USD"},
        ],
    })
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "ACTIVE"
    assert data["shipment_type"] == "IMPORT"
    assert len(data["fee_details"]) == 2


def test_create_shipment_duplicate_detection(client: httpx.Client, admin_token: str):
    res = client.post("/api/v1/shipments", headers=auth_header(admin_token), json={
        "client_id": 1,
        "shipment_type": "IMPORT",
        "delivery_date": "2026-04-02",
        "invoice_no": "STEP6-INV-002",
        "hbl": "STEP6-HBL-001",  # 위에서 사용한 HBL
        "term": "FOB",
        "fee_details": [],
    })
    assert res.status_code == 201
    data = res.json()
    # duplicates 필드가 있거나 is_duplicate가 true
    assert data.get("duplicates") or data.get("is_duplicate")


def test_list_shipments_with_client_filter(client: httpx.Client, admin_token: str):
    res = client.get("/api/v1/shipments?client_id=1", headers=auth_header(admin_token))
    assert res.status_code == 200
    for item in res.json()["items"]:
        assert item["client_id"] == 1
