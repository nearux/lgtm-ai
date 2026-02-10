# LGTM AI 기획서

PR 리뷰를 Claude Code로 자동 반영하는 바이브 코딩 도구

## 1. 프로젝트 개요

### 배경

- 바이브 코딩으로 빠르게 개발 후 PR을 올리는 워크플로우가 증가
- PR 리뷰 피드백을 수동으로 반영하는 과정이 반복적이고 번거로움
- 자주 발생하는 리뷰 패턴을 학습해서 미리 Rule로써 방지할 수 있다면 효율적

### 목표

- PR 리뷰 반영 과정을 자동화하여 개발 생산성 향상
- 리뷰 패턴 분석을 통한 코드 품질 개선

---

## 2. 핵심 기능

### 2.1 PR 리스트 조회

- GitHub API를 통해 현재 레포지토리의 PR 목록 표시
- PR 상태, 리뷰 현황, 코멘트 수 등 로컬 웹에서 한눈에 확인

### 2.2 리뷰 코멘트 확인

- 선택한 PR의 모든 리뷰 코멘트 조회
- 리뷰어별, 파일별 그룹핑
- AI 리뷰 vs 사람 리뷰 구분 표시

### 2.3 Claude Code 자동 반영

- 버튼 클릭으로 리뷰 내용을 Claude Code에 전달
- Claude Code가 코드 수정 자동 수행
- 반영 결과 실시간 확인 및 커밋, 푸쉬

### 2.4 리뷰 패턴 분석 & Rule 생성 (부가 기능)

- 과거 리뷰 데이터 수집 및 분석
- 자주 지적되는 패턴 추출
- `.claude/code-review-rules.json` 에 룰 자동 추가

---

## 3. 사용자 플로우

```

1. npx lgtmai 실행
        ↓
2. 브라우저에서 localhost:5000 열림
        ↓
3. 키체인에서 깃헙 토큰 가져옴 (keytar로 인증 UI)
        ↓
4. PR 리스트 확인 → PR 선택
        ↓
5. 리뷰 코멘트 확인 → 반영할 항목 선택
        ↓
6. "Claude Code로 반영" 버튼 클릭
        ↓
7. 자동으로 코드 수정 / 커밋 & 푸시 (유저 or 에이전트)
        ↓
8. 완료! PR에서 결과 확인
```

---

## 4. 화면 구성

#### 4.1 메인 화면 (PR 리스트)

#### 4.2 PR 상세 화면 (리뷰 코멘트)

#### 4.3 반영 진행 화면 (progress)

#### 4.4 설정 화면

---

## 5. 기술 스택

### Frontend

- React 19 + TypeScript

### Backend (로컬 서버)

-

### 배포

- **npm** 패키지로 배포
- `npx lgtmai`로 실행

---

## 6. 프로젝트 구조

```
lgtmai/
├── package.json
├── tsconfig.json
├── vite.config.ts
│
├── src/
│   ├── cli.ts                 # CLI 엔트리포인트
│   │
│   ├── server/                # 로컬 서버
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   ├── github.ts      # GitHub API 프록시 (선택적)
│   │   │   └── claude.ts      # Claude Code 실행
│   │   └── services/
│   │       ├── github.ts      # GitHub 서비스
│   │       └── claude.ts      # Claude CLI 실행
│   │
│   └── web/                   # 프론트엔드
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── PRList.tsx
│       │   ├── PRDetail.tsx
│       │   ├── ReviewComment.tsx
│       │   └── Settings.tsx
│       ├── hooks/
│       │   ├── useGitHub.ts
│       │   └── useClaude.ts
│       └── styles/
│           └── globals.css
│
├── bin/
│   └── lgtmai.js              # npx 엔트리포인트
│
└── README.md
```

---

## 7. API 설계

### 7.1 로컬 서버 API

#### Claude Code 실행

```
POST /api/claude/run
Content-Type: application/json

{
  "prompt": "다음 리뷰 내용을 반영해주세요: ...",
  "workingDirectory": "/path/to/repo"
}

Response:
{
  "success": true,
  "output": "..."
}
```

#### 설정 저장/조회

```
GET /api/config
POST /api/config

{
  "githubToken": "ghp_...",
  "autoCommit": true,
  "autoPush": true
}
```

### 7.2 GitHub API (프론트엔드에서 직접 호출)

- `GET /repos/{owner}/{repo}/pulls` - PR 리스트
- `GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews` - 리뷰 목록
- `GET /repos/{owner}/{repo}/pulls/{pull_number}/comments` - 코멘트 목록

---

## 8. 데이터 저장

### 로컬 설정 파일

```
~/.lgtmai/
├── config.json          # 설정 (토큰, 옵션 등)
└── review-patterns.json # 분석된 리뷰 패턴
```

### config.json 예시

```json
{
  "githubToken": "ghp_xxxxxxxxxxxx",
  "defaultRepo": "owner/repo",
  "autoCommit": true,
  "autoPush": true,
  "confirmBeforePush": false
}
```

---

## 9. Claude Code 연동

### 실행 방식

```typescript
import { spawn } from "child_process";

function runClaude(prompt: string, cwd: string) {
  return new Promise((resolve, reject) => {
    const process = spawn("claude", ["-p", prompt], { cwd });

    let output = "";
    process.stdout.on("data", (data) => {
      output += data.toString();
      // 실시간 스트리밍 가능
    });

    process.on("close", (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`Exit code: ${code}`));
    });
  });
}
```

### 프롬프트 템플릿

```
다음 PR 리뷰 코멘트들을 반영해서 코드를 수정해주세요.

## 리뷰 코멘트

### 파일: {파일경로}:{라인번호}
리뷰어: {리뷰어}
내용: {코멘트 내용}

### 파일: {파일경로}:{라인번호}
리뷰어: {리뷰어}
내용: {코멘트 내용}

## 요청사항
1. 위 리뷰 내용을 모두 반영해주세요
2. 수정이 완료되면 커밋해주세요
3. 커밋 메시지: "refactor: PR #{PR번호} 리뷰 반영"
4. 커밋 후 푸시해주세요
```

---

## 10. 리뷰 패턴 분석 (부가 기능)

### 분석 대상

- 최근 N개 PR의 리뷰 코멘트
- 코멘트 내용에서 키워드/패턴 추출

### 패턴 예시

```json
{
  "patterns": [
    {
      "keyword": "에러 핸들링",
      "count": 15,
      "suggestion": "try-catch 블록을 사용하여 에러를 처리하세요"
    },
    {
      "keyword": "타입 명시",
      "count": 12,
      "suggestion": "함수 반환 타입을 명시적으로 선언하세요"
    }
  ]
}
```

### .claude 룰 생성

```markdown
# .claude/settings.json 또는 CLAUDE.md에 추가

## 코드 작성 규칙

- 모든 async 함수에는 try-catch로 에러 핸들링을 추가할 것
- 함수의 반환 타입을 명시적으로 선언할 것
- ...
```

---

## 11. 개발 로드맵

### Phase 1: MVP (1주)

- [x] 기획서 작성
- [ ] 프로젝트 셋업
- [ ] GitHub 인증 (PAT)
- [ ] PR 리스트 조회
- [ ] 리뷰 코멘트 조회
- [ ] Claude Code 실행 (기본)
- [ ] 커밋 & 푸시

### Phase 2: 개선 (1주)

- [ ] UI/UX 개선
- [ ] 실시간 진행 상황 표시
- [ ] 부분 선택 반영
- [ ] 에러 핸들링 강화

### Phase 3: 부가 기능 (2주)

- [ ] 리뷰 패턴 분석
- [ ] 자동 룰 생성
- [ ] 통계 대시보드
- [ ] 팀 공유 기능

### Phase 4: 고도화

- [ ] GitHub OAuth 지원
- [ ] 다중 레포 지원
- [ ] 알림 기능
- [ ] VSCode Extension

---

## 12. 예상 이슈 & 해결 방안

| 이슈               | 해결 방안                 |
| ------------------ | ------------------------- |
| Claude Code 미설치 | 실행 전 체크 후 설치 안내 |
| GitHub 토큰 만료   | 에러 시 재인증 유도       |
| 대용량 PR          | 파일별 분할 처리          |
| 충돌하는 리뷰      | 사용자에게 선택 요청      |
| Claude 실행 실패   | 재시도 및 수동 모드 안내  |

---

## 13. 참고 자료

- [GitHub REST API](https://docs.github.com/en/rest)
- [Octokit.js](https://github.com/octokit/octokit.js)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)

---
