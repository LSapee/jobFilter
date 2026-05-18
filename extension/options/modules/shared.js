// 플랫폼 그래프 조각과 범례에 사용할 색상을 순서대로 반환한다.
export function getChartColor(index) {
  const colors = [
    "#003c90",
    "#006c49",
    "#7c4d00",
    "#ba1a1a",
    "#5c3800",
    "#434653",
    "#1d59c1"
  ];

  return colors[index % colors.length];
}

// 내용이 없는 요약 영역에 표시할 안내 항목을 만든다.
export function createEmptyCompactItem(text) {
  const item = document.createElement("div");
  const message = document.createElement("span");

  item.className = "compact-item";
  message.className = "muted";
  message.textContent = text;
  item.append(message);

  return item;
}

// 일반 텍스트만 표시하는 테이블 셀을 만든다.
export function createTextCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text || "-";

  return cell;
}

// 공고 URL이 있으면 새 탭 링크, 없으면 일반 텍스트로 공고명을 만든다.
export function createPostingLink(company) {
  const title = company.title || (company.postingUrl ? "공고 보기" : "-");

  if (!company.postingUrl) {
    return document.createTextNode(title);
  }

  const link = document.createElement("a");
  link.className = "link";
  link.href = company.postingUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = title;

  return link;
}

// 삭제나 해제처럼 행 단위 작업을 실행하는 버튼 셀을 만든다.
export function createActionCell(label, onClick) {
  const cell = document.createElement("td");
  const button = document.createElement("button");

  button.className = "danger-button";
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  cell.append(button);

  return cell;
}

// 지원 이력 항목의 보조 설명 문구를 만든다.
export function createAppliedMetaText(company) {
  return [
    company.title,
    company.applySite,
    formatDate(company.appliedAt)
  ]
    .filter(Boolean)
    .join(" / ");
}

// 지정한 키 추출 함수를 기준으로 배열 항목 수를 집계한다.
export function countBy(items, getKey) {
  const counts = new Map();

  items.forEach((item) => {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return counts;
}

// 날짜 문자열 필드를 기준으로 최신순 정렬한 새 배열을 반환한다.
export function sortByDateDesc(items, key) {
  return [...items].sort((first, second) => {
    return getDateTime(second[key]) - getDateTime(first[key]);
  });
}

// 지원 이력을 플랫폼별로 묶고 각 그룹 내부를 최신 지원일 순으로 정렬한다.
export function groupApplicationsByPlatform(companies) {
  const groups = new Map();

  companies.forEach((company) => {
    const platform = company.applySite || "unknown";

    groups.set(platform, [...(groups.get(platform) ?? []), company]);
  });

  return [...groups.entries()]
    .map(([platform, groupedCompanies]) => ({
      platform,
      companies: sortByDateDesc(groupedCompanies, "appliedAt")
    }))
    .sort((first, second) => second.companies.length - first.companies.length);
}

// 표시용 날짜 문자열을 YYYY-MM-DD 형태로 정리한다.
export function formatDate(value) {
  if (!value) {
    return "-";
  }

  return String(value).slice(0, 10);
}

// Date 객체를 YYYY-MM-DD 문자열로 변환한다.
export function formatDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// YYYY-MM-DD 문자열을 로컬 Date 객체로 변환한다.
export function parseDateValue(value) {
  const [year, month, day] = String(value || getTodayDateValue())
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day);
}

// 선택 날짜를 한국어 표시 문자열로 만든다.
export function formatKoreanDate(value) {
  const date = parseDateValue(value);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${weekdays[date.getDay()]})`;
}

// 정렬 비교에 사용할 날짜 타임스탬프를 반환한다.
export function getDateTime(value) {
  const time = new Date(value ?? 0).getTime();

  return Number.isNaN(time) ? 0 : time;
}

// date 입력 필드에 사용할 오늘 날짜 문자열을 만든다.
export function getTodayDateValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

// 지원 이력의 열람 상태가 열람 완료인지 판단한다.
function hasReadDocumentStatus(company) {
  const readStatus = String(company.readStatus ?? "");

  return readStatus.includes("열람") && !readStatus.includes("미열람");
}

// 지원 이력의 열람 상태가 미열람인지 판단한다.
function hasUnreadDocumentStatus(company) {
  return String(company.readStatus ?? "").includes("미열람");
}

// 지원 이력의 상태를 대시보드에서 사용할 단계 키로 정규화한다.
export function getApplicationStatusKey(company) {
  const status = String(company.applyStatus ?? "");

  if (status.includes("불합격") || status.includes("탈락")) {
    return "rejected";
  }

  if (status.includes("합격")) {
    return "accepted";
  }

  if (status.includes("면접")) {
    return "interview";
  }

  if (status.includes("서류 열람") || hasReadDocumentStatus(company)) {
    return "read";
  }

  return "applied";
}

// 지원 이력의 상태를 사용자에게 보여줄 단계 라벨로 정규화한다.
export function getApplicationStatusLabel(company) {
  const labels = {
    applied: "지원 완료",
    read: "서류 열람",
    interview: "면접 예정",
    accepted: "합격",
    rejected: "불합격"
  };

  return labels[getApplicationStatusKey(company)];
}

// 미열람 상태가 20일 이상 지난 지원 이력인지 판단한다.
export function hasStaleUnreadStatus(company) {
  if (
    getApplicationStatusKey(company) !== "applied" ||
    !hasUnreadDocumentStatus(company)
  ) {
    return false;
  }

  const appliedTime = getDateTime(formatDate(company.appliedAt));
  const todayTime = getDateTime(getTodayDateValue());
  const elapsedDays = Math.floor((todayTime - appliedTime) / (1000 * 60 * 60 * 24));

  return appliedTime > 0 && elapsedDays >= 20;
}

// 지원 이력의 상태가 면접 계열인지 판단한다.
export function hasInterviewStatus(company) {
  return getApplicationStatusKey(company) === "interview";
}
