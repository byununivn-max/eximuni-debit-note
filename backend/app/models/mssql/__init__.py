"""MSSQL 레거시 테이블 모델 (UNI_DebitNote 데이터베이스 25개 테이블)

그룹 A: 핵심 비즈니스 — 고객, 통관, Debit Note
그룹 B: 운영 — Ops, CO, AN
그룹 C: 마스터/설정 — 회사, 계약, 고객설정, 원산지, NPL
그룹 D: 커뮤니케이션 — 이메일, 뉴스레터
그룹 E: 미팅/보상 — 미팅, 칭찬, 보상, 포인트
그룹 F: 시스템 — 토큰 캐시
"""
# 그룹 A: 핵심 비즈니스
from app.models.mssql.client import MssqlClient
from app.models.mssql.clearance import MssqlClearance
from app.models.mssql.debit_sharepoint import MssqlDebitSharepoint
from app.models.mssql.scheme_clearance import MssqlSchemeClearance

# 그룹 B: 운영
from app.models.mssql.scheme_ops import MssqlSchemeOps
from app.models.mssql.ops import MssqlOps
from app.models.mssql.scheme_co import MssqlSchemeCo
from app.models.mssql.co import MssqlCo
from app.models.mssql.an_sharepoint import MssqlAnSharepoint

# 그룹 C: 마스터/설정
from app.models.mssql.companies import MssqlCompany
from app.models.mssql.contract import MssqlContract
from app.models.mssql.customer_clearance import MssqlCustomerClearance
from app.models.mssql.customer_config import MssqlCustomerConfig
from app.models.mssql.origin import MssqlOrigin
from app.models.mssql.npl_code import MssqlNplCode

# 그룹 D: 커뮤니케이션
from app.models.mssql.email_job import MssqlEmailJob, MssqlEmailFail
from app.models.mssql.newsletter import MssqlNewsletter, MssqlArticleNewsletter

# 그룹 E: 미팅/보상
from app.models.mssql.meeting import MssqlMeetingSchedule, MssqlMeetingContact
from app.models.mssql.praise import MssqlPraise, MssqlReward, MssqlSummaryPoint

# 그룹 F: 시스템
from app.models.mssql.user_tokens import MssqlUserToken

__all__ = [
    # 그룹 A
    "MssqlClient",
    "MssqlClearance",
    "MssqlDebitSharepoint",
    "MssqlSchemeClearance",
    # 그룹 B
    "MssqlSchemeOps",
    "MssqlOps",
    "MssqlSchemeCo",
    "MssqlCo",
    "MssqlAnSharepoint",
    # 그룹 C
    "MssqlCompany",
    "MssqlContract",
    "MssqlCustomerClearance",
    "MssqlCustomerConfig",
    "MssqlOrigin",
    "MssqlNplCode",
    # 그룹 D
    "MssqlEmailJob",
    "MssqlEmailFail",
    "MssqlNewsletter",
    "MssqlArticleNewsletter",
    # 그룹 E
    "MssqlMeetingSchedule",
    "MssqlMeetingContact",
    "MssqlPraise",
    "MssqlReward",
    "MssqlSummaryPoint",
    # 그룹 F
    "MssqlUserToken",
]
