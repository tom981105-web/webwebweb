# 배포 체크리스트

## 1. Railway Variables 입력

[RAILWAY_VARIABLES_TEMPLATE.txt](/C:/Users/tomem/Desktop/TEST1%20웹/RAILWAY_VARIABLES_TEMPLATE.txt) 내용을 Railway `Variables`에 붙여넣고 빈 값을 채웁니다.

## 2. R2 확인

- 버킷 생성
- API 키 생성
- 공개 URL 확보
- 아래 5개 값 입력
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET`
  - `R2_PUBLIC_BASE_URL`

## 3. 로컬 점검

```bash
npm run check:cloud
```

목표 결과:

- `R2 Ready: YES`

## 4. 로컬 백업 시험

```bash
npm run backup:r2
```

정상이라면 R2 `backup/` 경로에 백업 JSON이 올라갑니다.

## 5. Railway 배포 후 점검

1. `/api/admin/storage-status` 확인
2. 관리자 페이지 `클라우드 상태` 카드 확인
3. 로그인 배경 ZIP 업로드
4. 배너 이미지 업로드
5. 게시판 본문 이미지 업로드
6. `R2 백업 실행` 버튼 테스트

## 6. 성공 기준

- 관리자 페이지 저장소 공급자: `r2`
- R2 연결 준비: `준비됨`
- 백업 저장소: `준비됨`
- 업로드 이미지 URL이 R2 공개 주소로 저장되거나 제공됨
- 백업 JSON이 R2 `backup/` prefix에 생성됨
- 오래된 백업은 2개 초과 시 자동 삭제됨
- 자동 백업은 매일 밤 `11:00 PM (Asia/Seoul)`에 실행됨
