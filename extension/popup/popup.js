import "../src/constants.js";
import { getLocalData, setSettings } from "../src/storage.js";

const { MESSAGE_TYPES } = globalThis.jobFilterConstants;
const blockedCount = document.querySelector("#blockedCount");
const appliedCount = document.querySelector("#appliedCount");
const siteName = document.querySelector("#siteName");
const hideBlockedPostings = document.querySelector("#hideBlockedPostings");
const markAppliedCompanies = document.querySelector("#markAppliedCompanies");
const collectStatus = document.querySelector("#collectStatus");
const collectApplied = document.querySelector("#collectApplied");
const openOptions = document.querySelector("#openOptions");

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

await renderPopup();

hideBlockedPostings.addEventListener("change", handleHideBlockedChange);
markAppliedCompanies.addEventListener("change", handleMarkAppliedChange);
collectApplied.addEventListener("click", handleCollectAppliedClick);
openOptions.addEventListener("click", handleOpenOptionsClick);

// 저장소와 현재 탭 정보를 기준으로 팝업 화면 값을 갱신한다.
async function renderPopup() {
  const data = await getLocalData();

  blockedCount.textContent = String(data.blockedCompanies.length);
  appliedCount.textContent = String(data.appliedCompanies.length);
  siteName.textContent = tab?.url ? new URL(tab.url).hostname : "사이트 없음";
  hideBlockedPostings.checked = data.settings.hideBlockedPostings;
  markAppliedCompanies.checked = data.settings.markAppliedCompanies;
}

// 제외 업체 숨김 토글 값을 로컬 설정에 저장한다.
async function handleHideBlockedChange() {
  await setSettings({ hideBlockedPostings: hideBlockedPostings.checked });
  await refreshCurrentTabFilters();
}

// 지원 이력 숨김 토글 값을 로컬 설정에 저장한다.
async function handleMarkAppliedChange() {
  await setSettings({ markAppliedCompanies: markAppliedCompanies.checked });
  await refreshCurrentTabFilters();
}

// 현재 탭의 페이지에서 지원 이력 후보를 크롤링해 저장한다.
async function handleCollectAppliedClick() {
  if (!tab?.id) {
    collectStatus.textContent = "현재 탭을 찾을 수 없습니다.";
    return;
  }

  collectApplied.disabled = true;
  collectStatus.textContent = "지원 이력을 수집 중입니다.";

  const collectResponse = await requestAppliedCompaniesFromTab(tab.id);

  if (!collectResponse?.ok) {
    collectStatus.textContent = "지원 이력을 수집하지 못했습니다.";
    collectApplied.disabled = false;
    return;
  }

  const saveResponse = await requestSaveAppliedCompanies(collectResponse.companies);

  if (!saveResponse?.ok) {
    collectStatus.textContent = "지원 이력 저장에 실패했습니다.";
    collectApplied.disabled = false;
    return;
  }

  collectStatus.textContent =
    `${saveResponse.addedCompanies.length}개 추가, ` +
    `${saveResponse.updatedCompanies.length}개 갱신했습니다.`;
  collectApplied.disabled = false;
  await renderPopup();
}

// 현재 탭의 콘텐츠 스크립트에 필터 상태를 다시 적용하라고 요청한다.
async function refreshCurrentTabFilters() {
  if (!tab?.id) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: MESSAGE_TYPES.refreshPageFilters
    });
  } catch (error) {
    console.warn("JobFilter page filter refresh failed.", error);
    // 지원하지 않는 페이지에서는 콘텐츠 스크립트가 없을 수 있다.
  }
}

// 현재 탭의 콘텐츠 스크립트에 지원 이력 수집을 요청한다.
async function requestAppliedCompaniesFromTab(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, {
      type: MESSAGE_TYPES.collectAppliedCompanies
    });
  } catch (error) {
    console.warn("JobFilter applied company collection failed.", error);
    return { ok: false, error: error.message };
  }
}

// background에 수집한 지원 이력 저장을 요청한다.
async function requestSaveAppliedCompanies(companies) {
  try {
    return await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.saveAppliedCompanies,
      companies
    });
  } catch (error) {
    console.warn("JobFilter applied company save failed.", error);
    return { ok: false, error: error.message };
  }
}

// 확장 프로그램 옵션 페이지를 연다.
function handleOpenOptionsClick() {
  Promise.resolve(chrome.runtime.openOptionsPage()).catch((error) => {
    console.warn("JobFilter options page open failed.", error);
  });
}
