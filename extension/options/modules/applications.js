import {
  addAppliedCompany,
  removeAppliedCompany
} from "../../src/storage.js";
import {
  createActionCell,
  createEmptyCompactItem,
  createPostingLink,
  createTextCell,
  formatDate,
  getChartColor,
  getDateTime,
  getTodayDateValue,
  groupApplicationsByPlatform
} from "./shared.js";

// 지원 목록 화면 상태와 이벤트를 관리하는 컨트롤러를 만든다.
export function createApplicationsController({
  elements,
  getCurrentData,
  render,
  requestDeleteConfirmation
}) {
  const expandedPlatforms = new Set();
  const selectedApplicationIds = new Set();
  let dateSortDirection = "desc";
  let hasInitializedDefaultExpandedPlatform = false;

  return {
    bindApplicationActions,
    renderAppliedCompanies
  };

  // 지원 이력 테이블을 저장된 데이터 기준으로 갱신한다.
  function renderAppliedCompanies(companies) {
    const groups = getSortedApplicationGroups(companies);

    elements.applicationSummary.textContent = `${companies.length}건`;
    elements.applicationTotalCount.textContent = companies.length;
    updateDateSortButton();
    pruneSelectedApplications(companies);
    setDefaultExpandedPlatform(groups);
    elements.appliedPlatformStats.replaceChildren(
      ...createAppliedPlatformProgressItems(groups, companies.length)
    );
    elements.appliedPlatformTable.replaceChildren(
      ...groups.flatMap(createAppliedPlatformRows)
    );
    elements.appliedEmpty.classList.toggle("is-visible", companies.length === 0);
  }

  // 지원 목록 화면의 버튼과 모달 이벤트를 등록한다.
  function bindApplicationActions() {
    bindDateSortButton();
    bindAddApplicationModal();
  }

  // 지원 이력을 플랫폼별로 묶은 뒤 현재 지원일 정렬 방향을 적용한다.
  function getSortedApplicationGroups(companies) {
    return groupApplicationsByPlatform(companies).map((group) => ({
      ...group,
      companies: sortCompaniesByAppliedDate(group.companies)
    }));
  }

  // 지원 이력 배열을 현재 지원일 정렬 방향에 맞게 정렬한다.
  function sortCompaniesByAppliedDate(companies) {
    return [...companies].sort((first, second) => {
      const firstTime = getDateTime(first.appliedAt);
      const secondTime = getDateTime(second.appliedAt);

      if (dateSortDirection === "asc") {
        return firstTime - secondTime;
      }

      return secondTime - firstTime;
    });
  }

  // 지원일 정렬 버튼의 표시 문구와 상태를 갱신한다.
  function updateDateSortButton() {
    elements.applicationDateSortButton.textContent =
      dateSortDirection === "desc" ? "지원일 최신순" : "지원일 오래된순";
    elements.applicationDateSortButton.setAttribute(
      "aria-label",
      dateSortDirection === "desc"
        ? "현재 지원일 최신순 정렬"
        : "현재 지원일 오래된순 정렬"
    );
  }

  // 지원일 정렬 버튼 클릭 이벤트를 등록한다.
  function bindDateSortButton() {
    elements.applicationDateSortButton.addEventListener("click", () => {
      dateSortDirection = dateSortDirection === "desc" ? "asc" : "desc";
      renderAppliedCompanies(getCurrentData().appliedCompanies);
    });
  }

  // 플랫폼별 지원 건수 진행 막대 목록을 만든다.
  function createAppliedPlatformProgressItems(groups, totalCount) {
    if (totalCount === 0) {
      return [createEmptyCompactItem("수집된 지원 이력이 없습니다.")];
    }

    return groups.slice(0, 5).map((group, index) => {
      const item = document.createElement("div");
      const name = document.createElement("strong");
      const track = document.createElement("div");
      const bar = document.createElement("div");
      const value = document.createElement("span");
      const percent = Math.round((group.companies.length / totalCount) * 100);

      item.className = "platform-progress__item";
      track.className = "platform-progress__track";
      bar.className = "platform-progress__bar";
      value.className = "platform-progress__value";
      name.textContent = group.platform;
      value.textContent = `${percent}%`;
      bar.style.setProperty("--progress-width", `${percent}%`);
      bar.style.setProperty("--progress-color", getChartColor(index));

      track.append(bar);
      item.append(name, track, value);

      return item;
    });
  }

  // 플랫폼 그룹 행과 펼쳐진 상세 행을 함께 만든다.
  function createAppliedPlatformRows(group) {
    const rows = [createAppliedPlatformSummaryRow(group)];

    if (expandedPlatforms.has(group.platform)) {
      rows.push(createAppliedPlatformDetailRow(group));
    }

    return rows;
  }

  // 플랫폼별 요약 행을 만든다.
  function createAppliedPlatformSummaryRow(group) {
    const row = document.createElement("tr");
    const platformCell = document.createElement("td");
    const countCell = createTextCell(String(group.companies.length));
    const platformContent = document.createElement("div");
    const arrow = document.createElement("span");
    const name = document.createElement("strong");

    row.className = "platform-row";
    row.classList.toggle("is-expanded", expandedPlatforms.has(group.platform));
    row.addEventListener("click", () => toggleExpandedPlatform(group.platform));
    arrow.className = "platform-row__arrow";
    arrow.textContent = expandedPlatforms.has(group.platform) ? "▼" : "▶";
    name.textContent = group.platform;
    platformCell.className = "platform-cell";
    countCell.classList.add("count-cell");
    platformContent.className = "platform-cell__content";
    platformContent.append(arrow, name);
    platformCell.append(platformContent);

    row.append(platformCell, countCell);

    return row;
  }

  // 플랫폼 그룹 안에 표시할 지원 이력 상세 테이블 행을 만든다.
  function createAppliedPlatformDetailRow(group) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    const wrapper = document.createElement("div");
    const toolbar = document.createElement("div");
    const selectLabel = document.createElement("label");
    const selectAll = document.createElement("input");
    const toolbarActions = document.createElement("div");
    const selectedCount = document.createElement("span");
    const deleteSelectedButton = document.createElement("button");
    const scrollWrapper = document.createElement("div");
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    row.className = "platform-detail-row";
    cell.colSpan = 2;
    wrapper.className = "platform-detail";
    toolbar.className = "platform-detail__toolbar";
    toolbarActions.className = "platform-detail__actions";
    selectLabel.className = "bulk-select";
    selectAll.type = "checkbox";
    selectAll.checked = group.companies.every((company) =>
      selectedApplicationIds.has(company.id)
    );
    selectAll.addEventListener("change", () => {
      togglePlatformSelection(group.companies, selectAll.checked);
      renderAppliedCompanies(getCurrentData().appliedCompanies);
    });
    selectedCount.className = "selected-count";
    selectedCount.textContent = `선택된 지원 공고 ${countSelectedApplications(group.companies)}개`;
    deleteSelectedButton.className = "danger-button danger-button--toolbar";
    deleteSelectedButton.type = "button";
    deleteSelectedButton.textContent = "선택 삭제";
    deleteSelectedButton.addEventListener("click", () =>
      requestSelectedApplicationsRemoval(group.companies)
    );
    scrollWrapper.className = "platform-detail__scroll";
    selectLabel.append(selectAll, document.createTextNode("전체 선택"));
    toolbarActions.append(selectedCount, deleteSelectedButton);
    toolbar.append(selectLabel, toolbarActions);
    thead.innerHTML = `
      <tr>
        <th></th>
        <th>기업명</th>
        <th>지원일</th>
        <th class="posting-name-header">공고명</th>
        <th class="delete-header">삭제</th>
      </tr>
    `;
    tbody.append(...group.companies.map(createAppliedCompanyDetailRow));
    table.append(thead, tbody);
    scrollWrapper.append(table);
    wrapper.append(toolbar, scrollWrapper);
    cell.append(wrapper);
    row.append(cell);

    return row;
  }

  // 플랫폼 상세 테이블의 지원 이력 행을 만든다.
  function createAppliedCompanyDetailRow(company) {
    const row = document.createElement("tr");
    const selectCell = document.createElement("td");
    const checkbox = document.createElement("input");
    const companyCell = createTextCell(company.companyName);
    const appliedAtCell = createTextCell(formatDate(company.appliedAt));
    const linkCell = document.createElement("td");
    const actionCell = createActionCell("×", () => requestAppliedCompanyRemoval(company));

    checkbox.type = "checkbox";
    checkbox.checked = selectedApplicationIds.has(company.id);
    checkbox.addEventListener("change", () => {
      toggleApplicationSelection(company.id, checkbox.checked);
      renderAppliedCompanies(getCurrentData().appliedCompanies);
    });
    checkbox.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    selectCell.addEventListener("click", () => {
      toggleApplicationSelection(company.id, !selectedApplicationIds.has(company.id));
      renderAppliedCompanies(getCurrentData().appliedCompanies);
    });
    selectCell.className = "check-cell";
    actionCell.classList.add("delete-cell");
    linkCell.className = "posting-name-cell";
    row.classList.toggle("is-selected", checkbox.checked);
    selectCell.append(checkbox);
    linkCell.append(createPostingLink(company));
    row.append(selectCell, companyCell, appliedAtCell, linkCell, actionCell);

    return row;
  }

  // 플랫폼 그룹의 펼침 상태를 토글하고 지원 목록 화면을 다시 그린다.
  function toggleExpandedPlatform(platform) {
    if (expandedPlatforms.has(platform)) {
      expandedPlatforms.delete(platform);
    } else {
      expandedPlatforms.add(platform);
    }

    renderAppliedCompanies(getCurrentData().appliedCompanies);
  }

  // 개별 지원 이력 선택 상태를 갱신한다.
  function toggleApplicationSelection(id, selected) {
    if (selected) {
      selectedApplicationIds.add(id);
    } else {
      selectedApplicationIds.delete(id);
    }
  }

  // 플랫폼 상세 목록의 전체 선택 상태를 갱신한다.
  function togglePlatformSelection(companies, selected) {
    companies.forEach((company) => {
      toggleApplicationSelection(company.id, selected);
    });
  }

  // 저장소에 더 이상 없는 지원 이력의 선택 상태를 제거한다.
  function pruneSelectedApplications(companies) {
    const existingIds = new Set(companies.map((company) => company.id));

    selectedApplicationIds.forEach((id) => {
      if (!existingIds.has(id)) {
        selectedApplicationIds.delete(id);
      }
    });
  }

  // 플랫폼 상세 목록에서 선택된 지원 이력 개수를 계산한다.
  function countSelectedApplications(companies) {
    return companies.filter((company) => selectedApplicationIds.has(company.id))
      .length;
  }

  // 개별 지원 이력 삭제 전 확인 모달을 연다.
  function requestAppliedCompanyRemoval(company) {
    requestDeleteConfirmation({
      message: `${company.companyName} 지원 이력을 삭제할까요?`,
      onConfirm: () => removeAppliedCompanyAndRender(company.id)
    });
  }

  // 선택된 지원 이력 삭제 전 확인 모달을 연다.
  function requestSelectedApplicationsRemoval(companies) {
    const selectedCompanies = companies.filter((company) =>
      selectedApplicationIds.has(company.id)
    );

    if (selectedCompanies.length === 0) {
      return;
    }

    requestDeleteConfirmation({
      message: `선택한 지원 이력 ${selectedCompanies.length}개를 삭제할까요?`,
      onConfirm: () => removeAppliedCompaniesAndRender(selectedCompanies)
    });
  }

  // 지원 이력을 삭제하고 전체 화면을 다시 렌더링한다.
  async function removeAppliedCompanyAndRender(id) {
    await removeAppliedCompany(id);
    selectedApplicationIds.delete(id);
    await render();
  }

  // 여러 지원 이력을 순서대로 삭제하고 전체 화면을 다시 렌더링한다.
  async function removeAppliedCompaniesAndRender(companies) {
    for (const company of companies) {
      await removeAppliedCompany(company.id);
      selectedApplicationIds.delete(company.id);
    }

    await render();
  }

  // 첫 진입 시 가장 지원 건수가 많은 플랫폼을 기본 펼침 상태로 만든다.
  function setDefaultExpandedPlatform(groups) {
    if (groups.length === 0) {
      expandedPlatforms.clear();
      hasInitializedDefaultExpandedPlatform = false;
      return;
    }

    if (hasInitializedDefaultExpandedPlatform) {
      return;
    }

    hasInitializedDefaultExpandedPlatform = true;
    expandedPlatforms.add(groups[0].platform);
  }

  // 지원 내역 직접 추가 모달 관련 이벤트를 등록한다.
  function bindAddApplicationModal() {
    elements.addApplicationButton.addEventListener("click", openAddApplicationModal);
    elements.addApplicationCancelButton.addEventListener(
      "click",
      closeAddApplicationModal
    );
    elements.addApplicationPlatform.addEventListener(
      "change",
      updateManualPlatformField
    );
    elements.addApplicationForm.addEventListener(
      "submit",
      handleAddApplicationSubmit
    );
    elements.addApplicationModal.addEventListener("click", (event) => {
      if (event.target === elements.addApplicationModal) {
        closeAddApplicationModal();
      }
    });
  }

  // 지원 내역 직접 추가 모달을 열고 지원일 기본값을 오늘로 설정한다.
  function openAddApplicationModal() {
    if (!elements.addApplicationDate.value) {
      elements.addApplicationDate.value = getTodayDateValue();
    }

    updateManualPlatformField();
    elements.addApplicationModal.hidden = false;
    elements.addApplicationCompany.focus();
  }

  // 지원 내역 직접 추가 모달을 닫고 입력값을 초기화한다.
  function closeAddApplicationModal() {
    elements.addApplicationForm.reset();
    elements.addApplicationManualPlatformGroup.hidden = true;
    elements.addApplicationManualPlatform.required = false;
    elements.addApplicationModal.hidden = true;
  }

  // 지원 플랫폼 선택값에 따라 직접 입력 필드 표시 여부를 갱신한다.
  function updateManualPlatformField() {
    const isManual = elements.addApplicationPlatform.value === "manual";

    elements.addApplicationManualPlatformGroup.hidden = !isManual;
    elements.addApplicationManualPlatform.required = isManual;

    if (!isManual) {
      elements.addApplicationManualPlatform.value = "";
    }
  }

  // 직접 추가 폼 입력값을 지원 이력 저장소에 추가하고 화면을 갱신한다.
  async function handleAddApplicationSubmit(event) {
    event.preventDefault();

    if (!elements.addApplicationForm.reportValidity()) {
      return;
    }

    await addAppliedCompany({
      site: getSelectedApplicationPlatform(),
      applySite: getSelectedApplicationPlatform(),
      companyName: elements.addApplicationCompany.value.trim(),
      title: elements.addApplicationTitle.value.trim(),
      postingUrl: elements.addApplicationUrl.value.trim(),
      applyStatus: elements.addApplicationStatus.value,
      appliedAt: elements.addApplicationDate.value
    });

    closeAddApplicationModal();
    await render();
  }

  // 직접 추가 폼에서 선택된 지원 플랫폼 값을 반환한다.
  function getSelectedApplicationPlatform() {
    if (elements.addApplicationPlatform.value !== "manual") {
      return elements.addApplicationPlatform.value;
    }

    return elements.addApplicationManualPlatform.value.trim();
  }
}
