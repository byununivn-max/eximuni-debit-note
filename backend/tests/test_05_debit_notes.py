"""Debit Note API 테스트 (워크플로우 포함)"""
import pytest
import httpx
from tests.conftest import auth_header


def _ensure_shipment_for_period(client: httpx.Client, token: str, period_from: str):
    """테스트용 shipment 생성 (이미 존재하면 skip)"""
    res = client.post("/api/v1/shipments", headers=auth_header(token), json={
        "client_id": 1,
        "shipment_type": "IMPORT",
        "delivery_date": period_from,
        "invoice_no": f"DN-TEST-INV-{period_from}",
        "mbl": f"DN-TEST-MBL-{period_from}",
        "hbl": f"DN-TEST-HBL-{period_from}",
        "term": "FOB",
        "fee_details": [
            {"fee_item_id": 1, "amount_usd": 500.00, "currency": "USD"},
            {"fee_item_id": 14, "amount_usd": 200.00, "currency": "USD"},
        ],
    })
    return res.status_code in (201, 200)


def test_create_debit_note(client: httpx.Client, admin_token: str):
    """DN 생성 (DRAFT) — 자체 shipment 생성 후 진행"""
    # 먼저 테스트용 shipment 보장
    _ensure_shipment_for_period(client, admin_token, "2026-06-01")

    res = client.post("/api/v1/debit-notes", headers=auth_header(admin_token), json={
        "client_id": 1,
        "period_from": "2026-06-01",
        "period_to": "2026-06-30",
        "exchange_rate": 26446,
        "sheet_type": "ALL",
        "notes": "Step6 테스트 DN",
    })
    assert res.status_code == 201, f"DN creation failed: {res.text}"
    data = res.json()
    assert data["status"] == "DRAFT"
    assert data["debit_note_number"].startswith("DN-")
    assert data["total_lines"] >= 1


def test_create_debit_note_no_shipments(client: httpx.Client, admin_token: str):
    """거래 없는 기간 → 400"""
    res = client.post("/api/v1/debit-notes", headers=auth_header(admin_token), json={
        "client_id": 1,
        "period_from": "2020-01-01",
        "period_to": "2020-01-31",
        "exchange_rate": 26446,
        "sheet_type": "ALL",
    })
    assert res.status_code == 400


def test_list_debit_notes(client: httpx.Client, admin_token: str):
    res = client.get("/api/v1/debit-notes", headers=auth_header(admin_token))
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "items" in data


def test_submit_for_review(client: httpx.Client, admin_token: str):
    """DRAFT → PENDING_REVIEW"""
    list_res = client.get("/api/v1/debit-notes?status=DRAFT", headers=auth_header(admin_token))
    drafts = list_res.json()["items"]
    if not drafts:
        pytest.skip("No DRAFT DN")
    dn_id = drafts[0]["debit_note_id"]
    res = client.post(
        f"/api/v1/debit-notes/{dn_id}/submit-for-review",
        headers=auth_header(admin_token),
        json={"comment": "검토 요청"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "PENDING_REVIEW"


def test_self_approve_rejected(client: httpx.Client, admin_token: str):
    """생성자 자가 승인 거부"""
    list_res = client.get("/api/v1/debit-notes?status=PENDING_REVIEW", headers=auth_header(admin_token))
    pending = list_res.json()["items"]
    if not pending:
        pytest.skip("No PENDING_REVIEW DN")
    dn = pending[0]
    res = client.post(
        f"/api/v1/debit-notes/{dn['debit_note_id']}/approve",
        headers=auth_header(admin_token),
        json={"comment": "자가승인 시도"},
    )
    # admin이 생성 + admin이 승인 → 거부 (400)
    assert res.status_code == 400
    assert "Creator cannot approve" in res.json()["detail"]


def test_approve_by_different_user(client: httpx.Client, accountant_token: str):
    """다른 사용자 승인"""
    list_res = client.get(
        "/api/v1/debit-notes?status=PENDING_REVIEW",
        headers=auth_header(accountant_token),
    )
    pending = list_res.json()["items"]
    if not pending:
        pytest.skip("No PENDING_REVIEW DN")
    dn_id = pending[0]["debit_note_id"]
    res = client.post(
        f"/api/v1/debit-notes/{dn_id}/approve",
        headers=auth_header(accountant_token),
        json={"comment": "승인 완료"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "APPROVED"


def test_workflow_history(client: httpx.Client, admin_token: str):
    list_res = client.get("/api/v1/debit-notes?limit=1", headers=auth_header(admin_token))
    items = list_res.json()["items"]
    if items:
        dn_id = items[0]["debit_note_id"]
        res = client.get(
            f"/api/v1/debit-notes/{dn_id}/workflows",
            headers=auth_header(admin_token),
        )
        assert res.status_code == 200
        assert len(res.json()) >= 1
