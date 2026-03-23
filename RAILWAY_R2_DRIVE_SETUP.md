# Railway + R2 설정 가이드

이 문서는 현재 프로젝트를 `Railway + Cloudflare R2 + R2 백업` 구조로 올리기 위한 실제 입력 순서를 정리한 문서입니다.

## 1. Railway 프로젝트 생성

1. Railway에서 `New Project`를 누릅니다.
2. 이 프로젝트 폴더를 GitHub에 올린 뒤 `Deploy from GitHub repo`로 연결합니다.
3. 서비스가 생성되면 `Variables` 탭으로 이동합니다.

## 2. Railway Variables에 넣을 값

아래 값을 Railway `Variables`에 추가합니다.

### 기본

- `PORT=3000`
- `STORAGE_PROVIDER=r2`

### Cloudflare R2

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_BASE_URL`

`R2_PUBLIC_BASE_URL` 예시:

```text
https://pub-xxxxxxxxxxxxxxxx.r2.dev
```

## 3. R2에서 준비할 것

1. Cloudflare R2에서 버킷 1개를 만듭니다.
2. API 토큰을 생성합니다.
3. 버킷 공개 주소를 준비합니다.
4. 위 값을 Railway Variables에 입력합니다.

현재 코드 기준 업로드 대상은 아래처럼 나뉩니다.

- 로그인 배경: `login-hero/`
- 배너: `banner/`
- 게시판 본문 이미지: `board-inline/`
- 백업 스냅샷: `backup/`

## 4. 로컬에서 먼저 확인하는 방법

### 환경변수 점검

```bash
npm run check:cloud
```

정상 준비가 되면 아래 줄이 `YES`가 되어야 합니다.

- `R2 Ready: YES`

### 수동 R2 백업 시험

```bash
npm run backup:r2
```

정상이라면 업로드된 백업 파일 정보가 JSON으로 출력됩니다.

## 5. 관리자 페이지에서 확인할 것

관리자 페이지에 들어가면 `클라우드 상태` 카드가 보입니다.

확인 포인트:

- 저장소 공급자: `r2`
- R2 연결 준비: `준비됨`
- 백업 저장소: `준비됨`

그리고 `R2 백업 실행` 버튼으로 실제 백업 시험이 가능합니다.

## 6. 배포 후 실제 확인 순서

1. Railway 배포 완료
2. 관리자 페이지 접속
3. `클라우드 상태` 카드 확인
4. 로그인 배경 ZIP 업로드 시험
5. 배너 이미지 업로드 시험
6. 게시판 본문 이미지 업로드 시험
7. `R2 백업 실행` 버튼 시험

## 7. 백업 보관 정책

- 매일 `Asia/Seoul` 기준 `23:00` 자동 백업
- 최근 2개 백업만 유지
- 더 오래된 백업은 자동 삭제

## 8. 현재 구조에서 저장 위치

- 계정 / 게시글 / 댓글 / 포인트 / 설정: Railway 서버 DB(JSON 기반)
- 업로드 이미지: R2
- 복구용 스냅샷 백업: R2 `backup/`

## 9. 다음 확장 후보

- `database.json`을 SQLite 또는 Postgres로 이전
- Railway cron 또는 외부 스케줄러로 하루 1회 자동 백업
- 관리자 페이지에 최근 백업 시간 표시
- R2 업로드 실패 시 재시도 로직 추가
