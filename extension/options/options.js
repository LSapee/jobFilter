import { getLocalData } from "../src/storage.js";
import { createApplicationsController } from "./modules/applications.js";
import { renderBlockedCompanies } from "./modules/blocked.js";
import { createCalendarController } from "./modules/calendar.js";
import { createConfirmationController } from "./modules/confirmation.js";
import { createCsvController } from "./modules/csv.js";
import { renderDashboard } from "./modules/dashboard.js";

const viewTitles = {
  dashboard: {
    title: "지원 현황 대시보드",
    description: "수집된 지원 이력과 제외 업체를 한 화면에서 관리합니다."
  },
  applications: {
    title: "지원 목록",
    description: "잡코리아와 사람인 등에서 수집한 지원 완료 공고를 확인합니다."
  },
  blocked: {
    title: "제외 업체",
    description: "우클릭 메뉴로 제외한 업체를 전체 사이트 기준으로 관리합니다."
  },
  calendar: {
    title: "지원 일정",
    description: "수집된 지원 이력을 지원일 기준으로 정리합니다."
  }
};

const elements = {
  pageTitle: document.querySelector("#pageTitle"),
  pageDescription: document.querySelector("#pageDescription"),
  navItems: [...document.querySelectorAll("[data-view]")],
  panels: [...document.querySelectorAll("[data-panel]")],
  totalAppliedCount: document.querySelector("#totalAppliedCount"),
  blockedCompanyCount: document.querySelector("#blockedCompanyCount"),
  platformCount: document.querySelector("#platformCount"),
  applicationDistribution: document.querySelector("#applicationDistribution"),
  applicationDistributionDetails: document.querySelector(
    "#applicationDistributionDetails"
  ),
  platformStats: document.querySelector("#platformStats"),
  applicationSummary: document.querySelector("#applicationSummary"),
  applicationTotalCount: document.querySelector("#applicationTotalCount"),
  applicationDateSortButton: document.querySelector("#applicationDateSortButton"),
  appliedPlatformStats: document.querySelector("#appliedPlatformStats"),
  appliedPlatformTable: document.querySelector("#appliedPlatformTable"),
  appliedEmpty: document.querySelector("#appliedEmpty"),
  blockedSummary: document.querySelector("#blockedSummary"),
  blockedTable: document.querySelector("#blockedTable"),
  blockedEmpty: document.querySelector("#blockedEmpty"),
  calendarTitle: document.querySelector("#calendarTitle"),
  calendarGrid: document.querySelector("#calendarGrid"),
  calendarSideDate: document.querySelector("#calendarSideDate"),
  calendarPlatformGroups: document.querySelector("#calendarPlatformGroups"),
  calendarInterviewGroups: document.querySelector("#calendarInterviewGroups"),
  calendarEmpty: document.querySelector("#calendarEmpty"),
  prevCalendarMonthButton: document.querySelector("#prevCalendarMonthButton"),
  todayCalendarButton: document.querySelector("#todayCalendarButton"),
  nextCalendarMonthButton: document.querySelector("#nextCalendarMonthButton"),
  deleteCalendarDayButton: document.querySelector("#deleteCalendarDayButton"),
  confirmModal: document.querySelector("#confirmModal"),
  confirmMessage: document.querySelector("#confirmMessage"),
  confirmCancelButton: document.querySelector("#confirmCancelButton"),
  confirmDeleteButton: document.querySelector("#confirmDeleteButton"),
  addApplicationButton: document.querySelector("#addApplicationButton"),
  addApplicationModal: document.querySelector("#addApplicationModal"),
  addApplicationForm: document.querySelector("#addApplicationForm"),
  addApplicationPlatform: document.querySelector("#addApplicationPlatform"),
  addApplicationManualPlatformGroup: document.querySelector(
    "#addApplicationManualPlatformGroup"
  ),
  addApplicationManualPlatform: document.querySelector(
    "#addApplicationManualPlatform"
  ),
  addApplicationCompany: document.querySelector("#addApplicationCompany"),
  addApplicationTitle: document.querySelector("#addApplicationJobTitle"),
  addApplicationUrl: document.querySelector("#addApplicationUrl"),
  addApplicationDate: document.querySelector("#addApplicationDate"),
  addApplicationStatus: document.querySelector("#addApplicationStatus"),
  addApplicationCancelButton: document.querySelector(
    "#addApplicationCancelButton"
  ),
  downloadCsvButton: document.querySelector("#downloadCsvButton"),
  uploadCsvButton: document.querySelector("#uploadCsvButton"),
  csvFileInput: document.querySelector("#csvFileInput")
};

let currentData = {
  blockedCompanies: [],
  appliedCompanies: []
};

const getCurrentData = () => currentData;
const confirmationController = createConfirmationController(elements);
const applicationsController = createApplicationsController({
  elements,
  getCurrentData,
  render,
  requestDeleteConfirmation: confirmationController.requestDeleteConfirmation
});
const calendarController = createCalendarController({
  elements,
  getCurrentData,
  render,
  requestDeleteConfirmation: confirmationController.requestDeleteConfirmation
});
const csvController = createCsvController({
  elements,
  getCurrentData,
  render
});

// 선택된 관리 화면 탭을 표시하고 헤더 문구를 갱신한다.
function setActiveView(viewName) {
  const view = viewTitles[viewName] ? viewName : "dashboard";
  const viewText = viewTitles[view];

  elements.navItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.view === view);
  });
  elements.panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === view);
  });

  elements.pageTitle.textContent = viewText.title;
  elements.pageDescription.textContent = viewText.description;
}

// Chrome 로컬 저장소 데이터를 읽어 모든 옵션 화면을 다시 그린다.
async function render() {
  currentData = await getLocalData();

  renderDashboard(elements, currentData);
  applicationsController.renderAppliedCompanies(currentData.appliedCompanies);
  renderBlockedCompanies({
    elements,
    companies: currentData.blockedCompanies,
    render,
    requestDeleteConfirmation: confirmationController.requestDeleteConfirmation
  });
  calendarController.renderCalendar(currentData.appliedCompanies);
}

// 탭 버튼 클릭 이벤트를 등록한다.
function bindNavigation() {
  elements.navItems.forEach((item) => {
    item.addEventListener("click", () => {
      setActiveView(item.dataset.view);
    });
  });
}

// 저장소 변경이 생기면 옵션 화면 데이터를 최신 상태로 갱신한다.
function bindStorageChanges() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (
      areaName === "local" &&
      (changes.appliedCompanies || changes.blockedCompanies)
    ) {
      render();
    }
  });
}

bindNavigation();
bindStorageChanges();
confirmationController.bind();
applicationsController.bindApplicationActions();
calendarController.bindCalendarActions();
csvController.bindCsvActions();
await render();
