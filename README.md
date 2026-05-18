# JobFilter

JobFilter for Korea Jobs는 한국 채용 사이트의 공고를 필터링하고 지원 이력을 로컬에서 관리하는 Chrome Manifest V3 확장 프로그램입니다.

제외한 회사나 이미 지원한 회사의 공고를 채용 목록에서 숨겨, 반복해서 같은 공고를 확인하는 일을 줄이는 데 초점을 둡니다.

# 다운로드 링크 : [JobFilter](https://chromewebstore.google.com/detail/jobfilter-for-korea-jobs/aiamghaamcjlfmgpgpnmnkilfhjhnkda?hl=ko)


## 주요 기능

- 채용 공고에서 우클릭 메뉴로 해당 업체 제외
- 지원한 회사의 공고 자동 숨김
- 제외 업체 공고 자동 숨김
- 지원 현황 페이지에서 지원 이력 수집
- 재수집 시 기존 지원 이력의 최신 상태 갱신
- 관리 화면에서 지원 이력 검색, 수정, 삭제와 제외 업체 관리
- 대시보드에서 지원 상태와 지원 플랫폼 분포 확인
- `지원 완료`, `서류 열람`, `면접 예정`, `합격`, `불합격` 상태 관리
- 면접 예정 공고의 면접일 관리
- 20일 이상 미열람 공고를 불합격 추정 목록으로 확인
- 지원 목록을 플랫폼별로 확인하고 지원일 기준 최신순/오래된순 전환
- 일정 화면에서 지원일 기준 이력 확인 및 날짜 단위 삭제
- 지원 이력 직접 추가
- CSV 내려받기 및 CSV 등록
- `Alt+Shift+J` 단축키로 관리 화면 열기 
- Mac의 경우 `option+shift+J`

## 지원 사이트

현재 사이트별로 구현된 기능은 다음과 같습니다.

- 잡코리아
  - 공고 목록 필터링: `jobkorea.co.kr/Search`
  - 지원 이력 수집: `jobkorea.co.kr/User/ApplyMng`
- 사람인
  - 공고 목록 필터링: `saramin.co.kr/zf_user/search`
  - 지원 이력 수집: `saramin.co.kr/zf_user/persons/apply-status-list`
- 원티드
  - 공고 목록 필터링: `wanted.co.kr/wdlist`
  - 지원 이력 수집: `wanted.co.kr/status/applications/applied`
  - 지원 이력 수집 시 페이지네이션을 자동으로 넘기며 수집

## 프로젝트 구조

```text
extension/
  manifest.json
  icons/
    icon-16.png
    icon-32.png
    icon-48.png
    icon-128.png
  src/
    background.js          # 서비스 워커, 우클릭 메뉴, 단축키, 메시지 처리
    contentScript.js       # 페이지 필터링, 우클릭 회사명 탐색, 수집 연결
    storage.js             # chrome.storage.local 저장소 유틸과 정규화
    sites/
      jobkorea.js          # 잡코리아 목록/지원 이력 파서
      saramin.js           # 사람인 목록/지원 이력 파서
      wanted.js            # 원티드 목록/지원 이력 파서
    utils/
      companyName.js       # 회사명 정리 및 비교용 정규화
  popup/
    popup.html
    popup.css
    popup.js               # 필터 토글과 현재 페이지 지원 이력 수집 버튼
  options/
    options.html
    options.css
    options.js             # 관리 화면 초기화와 렌더링 연결
    modules/
      applications.js      # 지원 목록, 삭제, 직접 추가 모달
      blocked.js           # 제외 업체 목록과 해제
      calendar.js          # 일정 화면과 날짜 단위 삭제
      confirmation.js      # 공통 삭제 확인 모달
      csv.js               # CSV 내려받기/등록
      dashboard.js         # 대시보드 통계와 그래프
      shared.js            # 공통 UI, 날짜, 상태 유틸
    styles/
      base.css
      dashboard.css
      applications.css
      modals.css
      calendar.css
      responsive.css
scripts/
  validate-extension.mjs
  package-extension.mjs
useAI/
  README.md                # 작업 기록 및 변경 요약
```

## 로컬 설치

1. Chrome에서 `chrome://extensions`로 이동합니다.
2. `개발자 모드`를 켭니다.
3. `압축해제된 확장 프로그램을 로드합니다`를 클릭합니다.
4. 이 저장소의 `extension` 폴더를 선택합니다.

확장 파일을 수정한 뒤에는 `chrome://extensions`에서 확장을 새로고침하고, 이미 열려 있던 채용 사이트 탭도 새로고침해야 합니다.

## 로컬 명령어

```sh
npm run validate
npm run package
```

- `validate`: manifest가 참조하는 필수 파일이 존재하는지 확인합니다.
- `package`: 수동 배포용 `dist/jobfilter-extension.zip` 파일을 생성합니다.

위 npm 명령어는 로컬 개발 편의용입니다. 확장 프로그램 실행 자체에는 Node.js나 npm이 필요하지 않습니다.

## 수동 릴리스 패키징

GitHub Release를 사용해 자동화 없이 버전별 zip 파일을 배포할 수 있습니다.

수동 패키징:

```sh
cd extension
zip -r ../jobfilter-extension.zip .
```

그 다음 GitHub 웹 UI에서 Release를 만들고 `jobfilter-extension.zip`을 릴리스 파일로 업로드합니다.

권장 릴리스 흐름:

1. `extension/manifest.json`의 `version`을 수정합니다.
2. `extension/` 폴더를 zip으로 압축합니다.
3. GitHub Release를 생성합니다. 예: `v0.2.0`
4. `jobfilter-extension.zip`을 첨부합니다.
5. 필요하면 같은 zip 파일을 Chrome Web Store 수동 업로드에 사용합니다.

## 저장 데이터

JobFilter는 데이터를 `chrome.storage.local`에 저장합니다.

저장되는 데이터는 다음과 같습니다.

- 제외 업체명
- 비교용으로 정규화한 회사명
- 수집한 지원 이력
- 지원 상태, 열람 여부, 지원일, 면접일, 공고명, 공고 URL
- 필터 설정

개인정보 처리 방식은 [PRIVACY.md](./PRIVACY.md)를 참고하세요.

## 참고 사항

- 내부 런타임 namespace인 `jobPick...` 이름은 기존 데이터와 동작 호환성을 위해 유지합니다.
- 회사명 비교 시 `(주)`, `주식회사`, `㈜`, `(유)`, `유한회사` 같은 법인 표기를 제거합니다.
- 현재 지원 이력 중복 저장은 정규화된 회사명을 주요 기준으로 판단합니다.
- 공고 숨김은 지원 사이트의 검색/목록 페이지에서만 적용합니다.
- 동일 지원 이력을 다시 수집하면 열람 여부 등 최신 수집 정보는 갱신하지만, 사용자가 직접 `면접 예정`으로 바꾼 항목의 상태와 면접일은 유지합니다.
