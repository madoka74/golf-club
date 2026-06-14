# ⛳ 동창 골프 모임 서비스

대학 동창회 골프 모임 관리를 위한 웹 서비스입니다.
GitHub Pages + JSONBin.io를 사용하며, **별도 서버 없이 완전 무료**로 운영됩니다.

---

## 🚀 배포 방법 (GitHub Pages)

### 1단계: GitHub 저장소 생성
```
1. github.com 접속 → 우측 상단 [+] → "New repository"
2. Repository name: golf-club (또는 원하는 이름)
3. Public 선택
4. "Create repository" 클릭
```

### 2단계: 파일 업로드
```
1. 생성된 저장소 페이지에서 "uploading an existing file" 클릭
2. 이 폴더의 모든 파일을 드래그 업로드:
   - index.html
   - css/style.css
   - js/db.js
   - js/app.js
3. "Commit changes" 클릭
```

### 3단계: GitHub Pages 활성화
```
1. 저장소 상단 "Settings" 탭 클릭
2. 좌측 메뉴 "Pages" 클릭
3. Branch: main, / (root) 선택 → Save
4. 약 1~2분 후 URL 확인:
   https://[내깃허브아이디].github.io/golf-club/
```

---

## 🗄 데이터 저장소 설정 (JSONBin.io)

서비스 최초 접속 시 설정 화면이 나타납니다.

### JSONBin.io 설정 순서
```
1. https://jsonbin.io 접속 → 무료 회원가입
2. 로그인 후 Dashboard → API Keys → Master Key 복사
3. 상단 메뉴 "Bins" → "Create Bin" 클릭
4. 아래 JSON을 붙여넣고 저장:

{
  "members": [],
  "meetings": [],
  "participants": {},
  "teamResults": {},
  "admin": {"id": "admin", "pw": "123456"}
}

5. 생성된 Bin의 URL에서 ID 복사
   (예: https://api.jsonbin.io/v3/b/64a1b2c3d4e5f6 → ID: 64a1b2c3d4e5f6)
6. 서비스 설정 화면에 Bin ID + Master Key 입력
```

---

## 🔑 관리자 기본 정보
- 아이디: `admin`
- 비밀번호: `123456`

> JSONBin에서 `admin` 필드를 직접 수정하면 비밀번호 변경 가능

---

## 📋 주요 기능

| 기능 | 설명 |
|------|------|
| 회원 등록 | 이름, 나이, 성별, 전화번호, 학과, 학번, 직장, 직책 |
| 회원 조회 | 전체 목록 + 이름/전화번호 검색 |
| 캘린더 | 월별 달력에 모임 표시 |
| 모임 생성 | 날짜, 장소, 시간, 메모 (관리자 전용) |
| 참가 신청/취소 | 이름+전화번호로 간단 신청 |
| 팀 매칭 | 4인 1팀 랜덤 구성, 나머지 인원 마지막 팀 배정 |

---

## ⚠️ 주의사항
- JSONBin 무료 플랜: 월 10,000건 API 요청 제한 (소규모 모임엔 충분)
- 데이터는 브라우저 LocalStorage에 설정값만 저장, 실제 데이터는 JSONBin 서버에 저장
- 비밀번호는 텍스트로 저장되므로 중요한 비밀번호 사용 금지
