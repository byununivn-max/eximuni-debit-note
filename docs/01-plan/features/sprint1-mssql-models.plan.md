# Plan: Sprint 1 - MSSQL 25개 테이블 모델 매핑

## 개요
- **기능명**: sprint1-mssql-models
- **목표**: 기존 MSSQL UNI_DebitNote DB의 25개 테이블을 SQLAlchemy 모델로 매핑
- **원칙**: 기존 테이블 스키마 절대 수정 안 함, Alembic 마이그레이션 대상 아님

## 배경
- MSSQL 54.180.220.143 UNI_DebitNote DB에 25개 운영 테이블 존재
- Copilot Studio 챗봇과 공존 (같은 데이터 공유)
- Sprint 0에서 3개 모델만 매핑됨 (MssqlClient, MssqlClearance, MssqlShipment)
- 나머지 테이블을 모두 매핑하여 ERP 웹앱에서 활용

## 작업 범위

### 신규 모델 파일 (backend/app/models/mssql/)

| # | 파일 | 매핑 테이블 | 행 수 | 설명 |
|---|------|-----------|------:|------|
| 1 | `debit_sharepoint.py` | debit_sharepoint | 6,273 | Debit Note SharePoint 연동 |
| 2 | `scheme_clearance.py` | scheme_clearance | 2,905 | 통관 스킴 |
| 3 | `scheme_ops.py` | scheme_ops | - | Ops 스킴 |
| 4 | `ops.py` | ops | 1,823 | 운영 데이터 |
| 5 | `scheme_co.py` | scheme_co | - | CO 스킴 |
| 6 | `co.py` | co | 2,132 | CO 데이터 |
| 7 | `an_sharepoint.py` | an_sharepoint | 388 | AN SharePoint 연동 |
| 8 | `companies.py` | companies | 6 | 회사 정보 |
| 9 | `contract.py` | contract | 13 | 계약 정보 |
| 10 | `customer_clearance.py` | customer_clearance | 19 | 고객별 통관 설정 |
| 11 | `customer_config.py` | customer_config | 38 | 고객별 설정 |

### 기존 모델 업데이트
- `client.py` - 이미 완료 (MssqlClient)
- `clearance.py` - 이미 완료 (MssqlClearance)
- `shipment.py` - 이미 완료 (MssqlShipment) → 실제 테이블명 확인 필요

### __init__.py 업데이트
- 모든 신규 모델 import/export 추가

## 기술 규격

### 모델 패턴 (기존 코드 기반)
```python
from sqlalchemy import Column, Integer, String, DateTime, Numeric, Boolean, Text
from app.core.database import MSSQLBase

class MssqlXxx(MSSQLBase):
    """테이블 설명 (MSSQL UNI_DebitNote.dbo.테이블명)"""
    __tablename__ = "실제_테이블명"
    __table_args__ = {"schema": "dbo"}

    # Column("실제DB컬럼명", 타입, ...)
```

### 주의사항
- 테이블명, 컬럼명은 MSSQL 실제 스키마와 정확히 일치해야 함
- MSSQL에 실제 접속하여 스키마를 확인한 후 매핑
- `MSSQLBase` 사용 (Alembic 대상 아님)
- `__table_args__ = {"schema": "dbo"}` 필수

## 검증 기준
- [ ] 모든 25개 테이블에 대한 SQLAlchemy 모델 존재
- [ ] 각 모델의 __tablename__이 실제 MSSQL 테이블명과 일치
- [ ] __init__.py에서 모든 모델 export
- [ ] MSSQL 연결 후 기본 쿼리 동작 확인
- [ ] 기존 3개 모델과 일관된 패턴 유지

## 의존성
- Sprint 0 완료 (Dual DB 설정, MSSQLBase 정의) ✅
- MSSQL 서버 접근 가능 (54.180.220.143)

## 일정
- 예상 작업: 모델 파일 11개 신규 생성 + __init__.py 업데이트
