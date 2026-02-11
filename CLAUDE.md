# CLAUDE.md - 프로젝트 가이드

> 이 파일은 프로젝트 루트에 `CLAUDE.md`로 위치시킵니다.
> 프로젝트별로 내용을 수정하여 사용하세요.

## 프로젝트 개요

- **프로젝트명**: [프로젝트명 입력]
- **설명**: [한 줄 설명]
- **기술 스택**: React + TypeScript (프론트) / FastAPI + Python (백엔드)

## 프로젝트 구조

```
├── frontend/              # React + TypeScript 프론트엔드
│   ├── src/
│   │   ├── components/    # 재사용 가능한 UI 컴포넌트
│   │   ├── pages/         # 페이지 컴포넌트 (라우팅 단위)
│   │   ├── hooks/         # 커스텀 React 훅
│   │   ├── services/      # API 호출 로직
│   │   ├── stores/        # 상태 관리 (Zustand 등)
│   │   ├── types/         # TypeScript 타입 정의
│   │   └── utils/         # 유틸리티 함수
│   └── package.json
├── backend/               # FastAPI 백엔드
│   ├── app/
│   │   ├── api/           # API 라우터 (엔드포인트 정의)
│   │   ├── models/        # SQLAlchemy 모델
│   │   ├── schemas/       # Pydantic 스키마
│   │   ├── services/      # 비즈니스 로직
│   │   ├── core/          # 설정, 보안, 의존성
│   │   └── utils/         # 유틸리티
│   ├── tests/             # 테스트 코드
│   └── requirements.txt
├── docs/                  # 프로젝트 문서
└── docker-compose.yml     # 개발 환경 설정
```

## 자주 사용하는 명령어

### 프론트엔드
```bash
cd frontend
npm install          # 의존성 설치
npm run dev          # 개발 서버 실행 (기본 포트: 5173)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint 검사
npm run test         # 테스트 실행
npm run type-check   # TypeScript 타입 검사
```

### 백엔드
```bash
cd backend
python -m venv venv && source venv/bin/activate  # 가상환경 생성/활성화
pip install -r requirements.txt                   # 의존성 설치
uvicorn app.main:app --reload --port 8000         # 개발 서버 실행
pytest                                            # 테스트 실행
pytest --cov=app                                  # 커버리지 포함 테스트
```

### 공통
```bash
docker-compose up -d       # 전체 개발 환경 실행
docker-compose down        # 환경 종료
```

## 아키텍처 원칙

### 프론트엔드
- **컴포넌트 설계**: 프레젠테이션 컴포넌트와 컨테이너 컴포넌트를 분리한다.
- **상태 관리**: 서버 상태는 React Query(TanStack Query), 클라이언트 상태는 Zustand를 사용한다.
- **API 통신**: `services/` 디렉토리에서 axios 인스턴스를 통해 일관되게 관리한다.
- **에러 처리**: Error Boundary를 활용하고, API 에러는 공통 인터셉터에서 처리한다.

### 백엔드
- **계층 분리**: Router → Service → Repository 패턴을 따른다.
- **의존성 주입**: FastAPI의 Depends를 활용하여 테스트 가능한 구조를 유지한다.
- **응답 형식**: 모든 API 응답은 Pydantic 스키마를 통해 직렬화한다.
- **에러 처리**: 커스텀 예외 클래스를 정의하고, 전역 예외 핸들러에서 일관된 에러 응답을 반환한다.

## 코딩 컨벤션

### 네이밍
| 대상 | 프론트엔드 | 백엔드 |
|------|-----------|--------|
| 파일명 | PascalCase (컴포넌트), camelCase (유틸) | snake_case |
| 컴포넌트 | PascalCase | - |
| 함수/변수 | camelCase | snake_case |
| 상수 | UPPER_SNAKE_CASE | UPPER_SNAKE_CASE |
| 타입/인터페이스 | PascalCase (I 접두사 없이) | PascalCase |

### import 순서 (프론트엔드)
1. React 및 외부 라이브러리
2. 내부 컴포넌트
3. 훅, 서비스, 유틸
4. 타입
5. 스타일

### 테스트 컨벤션
- 테스트 파일: `*.test.ts(x)` (프론트), `test_*.py` (백엔드)
- 테스트 구조: Given-When-Then 또는 Arrange-Act-Assert 패턴
- 테스트 설명은 한국어로 작성: `it("로그인 성공 시 토큰을 저장해야 한다")`

## 중요 경고

- `backend/app/core/config.py`의 환경변수 설정을 임의로 변경하지 않는다.
- DB 마이그레이션(`alembic`)은 반드시 확인 후 실행한다.
- `frontend/src/services/api.ts`의 base URL 설정을 하드코딩하지 않는다.
- `.env.example`을 수정하면 팀원에게 반드시 공유한다.

## Git 워크플로우

- 브랜치 전략: `main` ← `develop` ← `feature/*`, `fix/*`, `refactor/*`
- PR 생성 시 관련 이슈 번호를 연결한다.
- 머지 전 최소 1명의 리뷰를 받는다.
- CI 통과 후에만 머지한다.
