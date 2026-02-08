"""거래처 관리 API (설계서 3.4 - GET/POST/PUT /api/v1/clients)"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.client import Client
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse, ClientListResponse

router = APIRouter(prefix="/api/v1/clients", tags=["clients"])


@router.get("", response_model=ClientListResponse)
async def list_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str = Query(None),
    is_active: bool = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Client)
    count_query = select(func.count(Client.client_id))

    if search:
        query = query.where(
            (Client.client_code.ilike(f"%{search}%")) |
            (Client.client_name.ilike(f"%{search}%"))
        )
        count_query = count_query.where(
            (Client.client_code.ilike(f"%{search}%")) |
            (Client.client_name.ilike(f"%{search}%"))
        )
    if is_active is not None:
        query = query.where(Client.is_active == is_active)
        count_query = count_query.where(Client.is_active == is_active)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(query.order_by(Client.client_code).offset(skip).limit(limit))
    clients = result.scalars().all()

    return ClientListResponse(total=total, items=clients)


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Client).where(Client.client_id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.post("", response_model=ClientResponse, status_code=201)
async def create_client(
    data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant")),
):
    # Check duplicate code
    existing = await db.execute(select(Client).where(Client.client_code == data.client_code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Client code '{data.client_code}' already exists")

    client = Client(**data.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant")),
):
    result = await db.execute(select(Client).where(Client.client_id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(client, key, value)

    await db.commit()
    await db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=204)
async def delete_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    result = await db.execute(select(Client).where(Client.client_id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    client.is_active = False  # Soft delete
    await db.commit()
