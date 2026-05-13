import { removeBlockedCompany } from "../../src/storage.js";
import {
  createActionCell,
  createTextCell,
  formatDate,
  sortByDateDesc
} from "./shared.js";

// 제외 업체 테이블을 저장된 데이터 기준으로 갱신한다.
export function renderBlockedCompanies({ elements, companies, render, requestDeleteConfirmation }) {
  const sortedCompanies = sortByDateDesc(companies, "createdAt");

  elements.blockedSummary.textContent = `${companies.length}건`;
  elements.blockedTable.replaceChildren(
    ...sortedCompanies.map((company) =>
      createBlockedCompanyRow({ company, render, requestDeleteConfirmation })
    )
  );
  elements.blockedEmpty.classList.toggle("is-visible", companies.length === 0);
}

// 제외 업체 테이블의 한 행을 만든다.
function createBlockedCompanyRow({ company, render, requestDeleteConfirmation }) {
  const row = document.createElement("tr");
  const companyCell = createTextCell(company.displayName);
  const scopeCell = createTextCell("전체 사이트");
  const createdAtCell = createTextCell(formatDate(company.createdAt));
  const actionCell = createActionCell("해제", () =>
    requestBlockedCompanyRemoval({ company, render, requestDeleteConfirmation })
  );

  row.append(companyCell, scopeCell, createdAtCell, actionCell);

  return row;
}

// 제외 업체 해제 전 확인 모달을 연다.
function requestBlockedCompanyRemoval({ company, render, requestDeleteConfirmation }) {
  requestDeleteConfirmation({
    message: `${company.displayName} 업체 제외를 해제할까요?`,
    onConfirm: async () => {
      await removeBlockedCompany(company.id);
      await render();
    }
  });
}
