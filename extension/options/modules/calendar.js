import { removeAppliedCompany } from "../../src/storage.js";
import {
  formatDate,
  formatDateValue,
  formatKoreanDate,
  getChartColor,
  getTodayDateValue,
  groupApplicationsByPlatform,
  hasInterviewStatus,
  parseDateValue
} from "./shared.js";

// 일정 캘린더 상태와 이벤트를 관리하는 컨트롤러를 만든다.
export function createCalendarController({
  elements,
  getCurrentData,
  render,
  requestDeleteConfirmation
}) {
  const expandedCalendarGroups = new Set();
  let selectedCalendarDate = getTodayDateValue();

  return {
    bindCalendarActions,
    renderCalendar
  };

  // 지원일이 있는 이력을 월간 캘린더와 선택 날짜 상세 패널로 갱신한다.
  function renderCalendar(companies) {
    const calendarMonth = getCalendarMonthDate();
    const selectedCompanies = getCompaniesByDate(companies, selectedCalendarDate);
    const platformGroups = groupCalendarCompaniesByPlatform(
      selectedCompanies.filter((company) => !hasInterviewStatus(company))
    );
    const interviewCompanies = selectedCompanies.filter(hasInterviewStatus);

    elements.calendarTitle.textContent = `${calendarMonth.getFullYear()}년 ${calendarMonth.getMonth() + 1}월`;
    elements.calendarGrid.replaceChildren(
      ...createCalendarCells({ companies, calendarMonth })
    );
    elements.calendarSideDate.textContent = formatKoreanDate(selectedCalendarDate);
    elements.calendarPlatformGroups.replaceChildren(
      ...createCalendarPlatformGroupItems(platformGroups)
    );
    elements.calendarInterviewGroups.replaceChildren(
      ...createCalendarInterviewItems(interviewCompanies)
    );
    elements.calendarEmpty.classList.toggle(
      "is-visible",
      selectedCompanies.length === 0
    );
    elements.deleteCalendarDayButton.disabled = selectedCompanies.length === 0;
  }

  // 캘린더 월 이동과 선택 날짜 삭제 이벤트를 등록한다.
  function bindCalendarActions() {
    elements.prevCalendarMonthButton.addEventListener("click", () => {
      moveCalendarMonth(-1);
    });
    elements.nextCalendarMonthButton.addEventListener("click", () => {
      moveCalendarMonth(1);
    });
    elements.todayCalendarButton.addEventListener("click", moveCalendarToToday);
    elements.deleteCalendarDayButton.addEventListener(
      "click",
      requestCalendarDayApplicationsRemoval
    );
  }

  // 현재 선택된 날짜를 기준으로 표시할 달의 Date 객체를 만든다.
  function getCalendarMonthDate() {
    const selectedDate = parseDateValue(selectedCalendarDate);

    return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  }

  // 월간 캘린더의 날짜 셀 DOM 배열을 만든다.
  function createCalendarCells({ companies, calendarMonth }) {
    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const startDate = new Date(firstDay);
    const cells = [];

    startDate.setDate(firstDay.getDate() - firstDay.getDay());

    for (let index = 0; index < 42; index += 1) {
      const cellDate = new Date(startDate);

      cellDate.setDate(startDate.getDate() + index);

      const dateValue = formatDateValue(cellDate);

      cells.push(
        createCalendarCell({
          date: cellDate,
          dateValue,
          companies: getCompaniesByDate(companies, dateValue),
          isCurrentMonth: cellDate.getMonth() === calendarMonth.getMonth()
        })
      );
    }

    return cells;
  }

  // 월간 캘린더의 날짜 셀 하나를 만든다.
  function createCalendarCell({ date, dateValue, companies, isCurrentMonth }) {
    const cell = document.createElement("button");
    const dayNumber = document.createElement("span");
    const events = document.createElement("div");
    const platformGroups = groupCalendarCompaniesByPlatform(
      companies.filter((company) => !hasInterviewStatus(company))
    );
    const interviewCompanies = companies.filter(hasInterviewStatus);

    cell.className = "calendar-cell";
    cell.type = "button";
    cell.classList.toggle("is-muted", !isCurrentMonth);
    cell.classList.toggle("is-selected", dateValue === selectedCalendarDate);
    cell.addEventListener("click", () => {
      selectedCalendarDate = dateValue;
      renderCalendar(getCurrentData().appliedCompanies);
    });
    dayNumber.className = "calendar-cell__day";
    dayNumber.textContent = String(date.getDate());
    events.className = "calendar-cell__events";
    events.append(...createCalendarEventChips(platformGroups, interviewCompanies));
    cell.append(dayNumber, events);

    return cell;
  }

  // 날짜 셀 안에 표시할 플랫폼 묶음과 면접 이벤트 칩을 만든다.
  function createCalendarEventChips(platformGroups, interviewCompanies) {
    const chips = platformGroups.slice(0, 2).map((group, index) =>
      createCalendarEventChip({
        label: `${group.platform} ${group.companies.length}건`,
        color: getChartColor(index)
      })
    );

    if (interviewCompanies.length > 0) {
      chips.push(
        createCalendarEventChip({
          label: `면접 ${interviewCompanies.length}건`,
          color: "#ba1a1a",
          variant: "interview"
        })
      );
    }

    return chips;
  }

  // 캘린더 날짜 셀에 들어가는 작은 이벤트 칩을 만든다.
  function createCalendarEventChip({ label, color, variant = "" }) {
    const chip = document.createElement("span");

    chip.className = "calendar-event-chip";
    chip.classList.toggle("calendar-event-chip--interview", variant === "interview");
    chip.style.setProperty("--event-color", color);
    chip.textContent = label;

    return chip;
  }

  // 선택 날짜의 지원 이력을 플랫폼별 상세 그룹 DOM으로 만든다.
  function createCalendarPlatformGroupItems(groups) {
    if (groups.length === 0) {
      return [createCalendarEmptyMessage("지원 플랫폼 묶음이 없습니다.")];
    }

    return groups.map((group, index) =>
      createCalendarGroupCard({
        groupKey: `platform:${group.platform}`,
        title: group.platform,
        companies: group.companies,
        color: getChartColor(index),
        variant: "platform"
      })
    );
  }

  // 선택 날짜의 면접 이력 DOM 그룹을 만든다.
  function createCalendarInterviewItems(companies) {
    if (companies.length === 0) {
      return [createCalendarEmptyMessage("면접 일정이 없습니다.")];
    }

    return [
      createCalendarGroupCard({
        groupKey: "interview",
        title: "면접",
        companies,
        color: "#ba1a1a",
        variant: "interview"
      })
    ];
  }

  // 일정 상세 패널에 표시할 플랫폼 그룹 카드를 만든다.
  function createCalendarGroupCard({ groupKey, title, companies, color, variant }) {
    const card = document.createElement("article");
    const header = document.createElement("button");
    const arrow = document.createElement("span");
    const dot = document.createElement("span");
    const heading = document.createElement("strong");
    const count = document.createElement("span");
    const listWrapper = document.createElement("div");
    const list = document.createElement("div");
    const isExpanded = expandedCalendarGroups.has(groupKey);

    card.className = "calendar-group-card";
    card.classList.toggle("is-expanded", isExpanded);
    header.className = "calendar-group-card__header";
    header.type = "button";
    header.addEventListener("click", () => toggleCalendarGroup(groupKey));
    arrow.className = "calendar-group-card__arrow";
    arrow.textContent = isExpanded ? "▼" : "▶";
    dot.className = "calendar-group-card__dot";
    dot.style.setProperty("--group-color", color);
    heading.textContent = title;
    count.textContent = `${companies.length}건`;
    listWrapper.className = "calendar-group-card__scroll";
    list.className = "calendar-group-card__list";
    list.append(
      ...companies.map((company) =>
        createCalendarCompanyItem({
          company,
          badgeText: variant === "interview" ? company.applyStatus || "면접" : company.applyStatus || "지원 완료",
          variant
        })
      )
    );
    header.append(arrow, dot, heading, count);
    listWrapper.append(list);
    card.append(header);

    if (isExpanded) {
      card.append(listWrapper);
    }

    return card;
  }

  // 일정 상세 패널의 개별 지원 이력 항목을 만든다.
  function createCalendarCompanyItem({ company, badgeText, variant = "" }) {
    const item = document.createElement("div");
    const text = document.createElement("div");
    const name = document.createElement("strong");
    const title = document.createElement("span");
    const badge = document.createElement("span");

    item.className = "calendar-company-item";
    item.classList.toggle("calendar-company-item--interview", variant === "interview");
    text.className = "calendar-company-item__text";
    name.textContent = company.companyName;
    title.textContent = company.title || company.applySite || "-";
    badge.className = "calendar-company-item__badge";
    badge.textContent = badgeText;
    text.append(name, title);
    item.append(text, badge);

    return item;
  }

  // 일정 상세 패널의 빈 상태 메시지를 만든다.
  function createCalendarEmptyMessage(text) {
    const message = document.createElement("p");

    message.className = "calendar-empty-message";
    message.textContent = text;

    return message;
  }

  // 지원 이력 배열에서 특정 날짜에 해당하는 항목만 반환한다.
  function getCompaniesByDate(companies, dateValue) {
    return companies.filter((company) => formatDate(company.appliedAt) === dateValue);
  }

  // 지원 이력을 플랫폼별로 묶어 일정 상세 패널에 맞는 배열로 만든다.
  function groupCalendarCompaniesByPlatform(companies) {
    return groupApplicationsByPlatform(companies);
  }

  // 일정 상세 패널의 플랫폼 또는 면접 그룹 펼침 상태를 토글한다.
  function toggleCalendarGroup(groupKey) {
    if (expandedCalendarGroups.has(groupKey)) {
      expandedCalendarGroups.delete(groupKey);
    } else {
      expandedCalendarGroups.add(groupKey);
    }

    renderCalendar(getCurrentData().appliedCompanies);
  }

  // 선택된 날짜의 모든 지원 이력 삭제 전 확인 모달을 연다.
  function requestCalendarDayApplicationsRemoval() {
    const companies = getCompaniesByDate(
      getCurrentData().appliedCompanies,
      selectedCalendarDate
    );

    if (companies.length === 0) {
      return;
    }

    requestDeleteConfirmation({
      message: `${formatKoreanDate(selectedCalendarDate)} 지원 이력 ${companies.length}개를 모두 삭제할까요?`,
      onConfirm: () => removeAppliedCompaniesAndRender(companies)
    });
  }

  // 여러 지원 이력을 순서대로 삭제하고 전체 화면을 다시 렌더링한다.
  async function removeAppliedCompaniesAndRender(companies) {
    for (const company of companies) {
      await removeAppliedCompany(company.id);
    }

    await render();
  }

  // 캘린더 표시 월을 이전 달 또는 다음 달로 이동한다.
  function moveCalendarMonth(offset) {
    const currentDate = parseDateValue(selectedCalendarDate);

    selectedCalendarDate = formatDateValue(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1)
    );
    renderCalendar(getCurrentData().appliedCompanies);
  }

  // 캘린더 선택 날짜를 오늘로 이동한다.
  function moveCalendarToToday() {
    selectedCalendarDate = getTodayDateValue();
    renderCalendar(getCurrentData().appliedCompanies);
  }
}
