"""비용 항목 및 환율 API 테스트"""
import httpx
from tests.conftest import auth_header


def test_list_fee_categories(client: httpx.Client, admin_token: str):
    res = client.get("/api/v1/fee-categories", headers=auth_header(admin_token))
    assert res.status_code == 200
    cats = res.json()
    assert isinstance(cats, list)
    assert len(cats) >= 1
    for cat in cats:
        assert "fee_items" in cat


def test_list_fee_items(client: httpx.Client, admin_token: str):
    res = client.get("/api/v1/fee-items", headers=auth_header(admin_token))
    assert res.status_code == 200
    items = res.json()
    assert isinstance(items, list)
    assert len(items) >= 1


def test_get_latest_exchange_rate(client: httpx.Client, admin_token: str):
    res = client.get("/api/v1/exchange-rates/latest", headers=auth_header(admin_token))
    assert res.status_code == 200
    data = res.json()
    assert "rate" in data
    assert float(data["rate"]) > 0


def test_list_exchange_rates(client: httpx.Client, admin_token: str):
    res = client.get("/api/v1/exchange-rates", headers=auth_header(admin_token))
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_create_exchange_rate(client: httpx.Client, admin_token: str):
    res = client.post("/api/v1/exchange-rates", headers=auth_header(admin_token), json={
        "rate": 26600,
        "rate_date": "2026-04-01",
        "source": "pytest",
    })
    assert res.status_code == 201
    assert float(res.json()["rate"]) == 26600


def test_pic_cannot_create_rate(client: httpx.Client, pic_token: str):
    res = client.post("/api/v1/exchange-rates", headers=auth_header(pic_token), json={
        "rate": 99999,
        "rate_date": "2026-04-02",
    })
    assert res.status_code == 403
