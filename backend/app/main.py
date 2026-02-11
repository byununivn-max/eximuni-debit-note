import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.clients import router as clients_router
from app.api.shipments import router as shipments_router
from app.api.debit_notes import router as debit_notes_router
from app.api.exchange_rates import router as exchange_rates_router
from app.api.fees import router as fees_router
from app.api.excel_export import router as excel_export_router
from app.api.mssql import router as mssql_router
from app.api.suppliers import router as suppliers_router
from app.api.purchase_orders import router as purchase_orders_router
from app.api.selling_records import router as selling_records_router
from app.api.workflows import router as workflows_router
from app.api.dashboard import router as dashboard_router
from app.api.chart_of_accounts import router as coa_router
from app.api.fiscal_periods import router as fiscal_router
from app.api.journal_entries import router as journal_router
from app.api.accounting_vendors import router as acc_vendor_router
from app.api.accounting_customers import router as acc_customer_router
from app.api.account_balances import router as acc_balance_router
from app.api.cost_classifications import router as cost_router
from app.api.pnl import router as pnl_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    description="EXIMUNI ERP System API — Dual DB (PostgreSQL + MSSQL) + Microsoft SSO",
    version="2.0.0",
    debug=settings.DEBUG,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# API Routers
app.include_router(health_router, prefix="/api", tags=["health"])
app.include_router(auth_router)
app.include_router(clients_router)
app.include_router(shipments_router)
app.include_router(debit_notes_router)
app.include_router(exchange_rates_router)
app.include_router(fees_router)
app.include_router(excel_export_router)
app.include_router(mssql_router)
app.include_router(suppliers_router)
app.include_router(purchase_orders_router)
app.include_router(selling_records_router)
app.include_router(workflows_router)
app.include_router(dashboard_router)
app.include_router(coa_router)
app.include_router(fiscal_router)
app.include_router(journal_router)
app.include_router(acc_vendor_router)
app.include_router(acc_customer_router)
app.include_router(acc_balance_router)
app.include_router(cost_router)
app.include_router(pnl_router)


@app.get("/")
async def root():
    return {
        "message": f"{settings.APP_NAME} API is running",
        "version": "2.0.0",
        "auth_mode": "MSAL" if settings.AZURE_CLIENT_ID else "JWT",
        "dual_db": bool(settings.MSSQL_USER),
    }


@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting {settings.APP_NAME} v2.0.0")
    logger.info(f"Auth mode: {'MSAL (Azure AD SSO)' if settings.AZURE_CLIENT_ID else 'JWT (Development)'}")
    logger.info(f"PostgreSQL: Connected (async)")
    if settings.MSSQL_USER:
        logger.info(f"MSSQL: {settings.MSSQL_SERVER}/{settings.MSSQL_DATABASE} (sync)")
    else:
        logger.info("MSSQL: Not configured (MSSQL_USER empty)")
    logger.info("Startup complete")
