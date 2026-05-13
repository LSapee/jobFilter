import {
  countBy,
  createEmptyCompactItem,
  createPostingLink,
  formatDate,
  getChartColor,
  hasInterviewStatus,
  hasPassedDocumentStatus,
  hasReadStatus,
  hasRejectedStatus,
  sortByDateDesc
} from "./shared.js";

let selectedDistributionKey = "applied";

// 대시보드 통계와 지원 분포 그래프 영역을 갱신한다.
export function renderDashboard(elements, data) {
  const platformCounts = countBy(
    data.appliedCompanies,
    (company) => company.applySite || "unknown"
  );

  elements.totalAppliedCount.textContent = data.appliedCompanies.length;
  elements.blockedCompanyCount.textContent = data.blockedCompanies.length;
  elements.platformCount.textContent = platformCounts.size;
  elements.applicationDistribution.replaceChildren(
    ...createApplicationDistributionBars(elements, data)
  );
  elements.applicationDistributionDetails.replaceChildren(
    createApplicationDistributionDetails(data.appliedCompanies)
  );
  elements.platformStats.replaceChildren(
    createPlatformChart(platformCounts, data.appliedCompanies.length)
  );
}

// 플랫폼별 지원 건수를 원그래프와 범례로 표시하는 차트 DOM을 만든다.
function createPlatformChart(platformCounts, totalCount) {
  if (totalCount === 0) {
    return createEmptyCompactItem("수집된 지원 이력이 없습니다.");
  }

  const entries = [...platformCounts.entries()].sort(
    (first, second) => second[1] - first[1]
  );
  const chart = document.createElement("div");
  const graphic = document.createElement("div");
  const center = document.createElement("div");
  const total = document.createElement("strong");
  const label = document.createElement("span");
  const legend = document.createElement("div");

  chart.className = "platform-chart";
  graphic.className = "platform-chart__graphic";
  center.className = "platform-chart__center";
  legend.className = "platform-chart__legend";
  graphic.style.background = createPieGradient(entries, totalCount);
  total.textContent = totalCount;
  label.textContent = "지원";

  center.append(total, label);
  graphic.append(center);
  legend.append(
    ...entries.map(([platform, count], index) =>
      createPlatformLegendItem({ platform, count, totalCount, index })
    )
  );
  chart.append(graphic, legend);

  return chart;
}

// 원그래프에 사용할 conic-gradient 문자열을 만든다.
function createPieGradient(entries, totalCount) {
  let currentDegree = 0;

  return `conic-gradient(${entries
    .map(([, count], index) => {
      const startDegree = currentDegree;
      const endDegree = startDegree + (count / totalCount) * 360;

      currentDegree = endDegree;

      return `${getChartColor(index)} ${startDegree.toFixed(2)}deg ${endDegree.toFixed(2)}deg`;
    })
    .join(", ")})`;
}

// 원그래프 범례의 플랫폼 항목을 만든다.
function createPlatformLegendItem({ platform, count, totalCount, index }) {
  const item = document.createElement("div");
  const dot = document.createElement("span");
  const name = document.createElement("strong");
  const meta = document.createElement("span");
  const percent = Math.round((count / totalCount) * 100);

  item.className = "platform-legend";
  dot.className = "platform-legend__dot";
  name.textContent = platform;
  meta.textContent = `${count}건 / ${percent}%`;
  dot.style.setProperty("--dot-color", getChartColor(index));

  item.append(dot, name, meta);

  return item;
}

// 지원 상태별 분포를 막대 그래프 DOM 배열로 만든다.
function createApplicationDistributionBars(elements, data) {
  const { appliedCompanies: companies } = data;
  const distribution = getApplicationDistribution(companies);
  const maxCount = Math.max(...distribution.map((item) => item.count), 1);

  return distribution.map((item) => {
    const barItem = document.createElement("div");
    const bar = document.createElement("button");
    const value = document.createElement("div");
    const label = document.createElement("span");
    const heightPercent = item.count === 0 ? 4 : Math.max((item.count / maxCount) * 100, 8);

    barItem.className = "distribution-chart__item";
    barItem.classList.toggle(
      "is-selected",
      item.key === selectedDistributionKey
    );
    bar.className = "distribution-chart__bar";
    bar.type = "button";
    bar.setAttribute("aria-label", `${item.label} ${item.count}건 보기`);
    value.className = "distribution-chart__value";
    bar.style.setProperty("--bar-height", `${heightPercent}%`);
    bar.style.setProperty("--bar-color", item.color);
    bar.addEventListener("click", () => {
      selectedDistributionKey = item.key;
      renderDashboard(elements, data);
    });
    value.textContent = item.count;
    label.textContent = item.label;

    bar.append(value);
    barItem.append(bar, label);

    return barItem;
  });
}

// 선택한 지원 분포 항목에 해당하는 지원 이력 목록 DOM을 만든다.
function createApplicationDistributionDetails(companies) {
  const distribution = getApplicationDistribution(companies);
  const selectedItem =
    distribution.find((item) => item.key === selectedDistributionKey) ??
    distribution[0];
  const sortedCompanies = sortByDateDesc(selectedItem.companies, "appliedAt");
  const wrapper = document.createElement("div");
  const header = document.createElement("div");
  const title = document.createElement("h2");
  const meta = document.createElement("span");
  const scroll = document.createElement("div");
  const list = document.createElement("div");

  wrapper.className = "distribution-detail";
  header.className = "distribution-detail__header";
  meta.className = "panel__meta";
  scroll.className = "distribution-detail__scroll";
  list.className = "distribution-detail__list";
  title.textContent = `${selectedItem.label} 목록`;
  meta.textContent = `${sortedCompanies.length}건`;

  if (sortedCompanies.length === 0) {
    list.append(createEmptyCompactItem("해당하는 지원 이력이 없습니다."));
  } else {
    list.append(...sortedCompanies.map(createApplicationDistributionDetailItem));
  }

  scroll.append(list);
  header.append(title, meta);
  wrapper.append(header, scroll);

  return wrapper;
}

// 지원 분포 상세 목록의 지원 이력 항목을 만든다.
function createApplicationDistributionDetailItem(company) {
  const item = document.createElement("div");
  const main = document.createElement("div");
  const companyName = document.createElement("strong");
  const posting = document.createElement("div");
  const meta = document.createElement("span");
  const status = document.createElement("span");

  item.className = "distribution-detail-item";
  main.className = "distribution-detail-item__main";
  posting.className = "distribution-detail-item__posting";
  meta.className = "distribution-detail-item__meta";
  status.className = "distribution-detail-item__status";
  companyName.textContent = company.companyName || "-";
  posting.append(createPostingLink(company));
  meta.textContent = [
    company.applySite,
    formatDate(company.appliedAt),
    company.readStatus
  ]
    .filter(Boolean)
    .join(" / ");
  status.textContent = company.applyStatus || "지원 완료";

  main.append(companyName, posting, meta);
  item.append(main, status);

  return item;
}

// 지원 이력을 기준으로 대시보드 지원 분포 값을 계산한다.
function getApplicationDistribution(companies) {
  return [
    {
      key: "applied",
      label: "지원 완료",
      count: companies.length,
      color: "#0f52ba",
      companies
    },
    {
      key: "read",
      label: "서류 열람",
      count: companies.filter(hasReadStatus).length,
      color: "#1d59c1",
      companies: companies.filter(hasReadStatus)
    },
    {
      key: "passed",
      label: "서류 통과",
      count: companies.filter(hasPassedDocumentStatus).length,
      color: "#006c49",
      companies: companies.filter(hasPassedDocumentStatus)
    },
    {
      key: "interview",
      label: "면접",
      count: companies.filter(hasInterviewStatus).length,
      color: "#7c4d00",
      companies: companies.filter(hasInterviewStatus)
    },
    {
      key: "rejected",
      label: "불합격",
      count: companies.filter(hasRejectedStatus).length,
      color: "#ba1a1a",
      companies: companies.filter(hasRejectedStatus)
    }
  ];
}
