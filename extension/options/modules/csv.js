import { addAppliedCompanies } from "../../src/storage.js";
import { getTodayDateValue } from "./shared.js";

const csvColumns = [
  { header: "지원플랫폼", key: "applySite" },
  { header: "회사명", key: "companyName" },
  { header: "공고명", key: "title" },
  { header: "지원일", key: "appliedAt" },
  { header: "열람여부", key: "readStatus" },
  { header: "상태", key: "applyStatus" },
  { header: "공고URL", key: "postingUrl" }
];

// CSV 내려받기와 등록 이벤트를 관리하는 컨트롤러를 만든다.
export function createCsvController({ elements, getCurrentData, render }) {
  return {
    bindCsvActions
  };

  // CSV 내려받기와 등록 버튼 이벤트를 등록한다.
  function bindCsvActions() {
    elements.downloadCsvButton.addEventListener(
      "click",
      downloadAppliedCompaniesCsv
    );
    elements.uploadCsvButton.addEventListener("click", openCsvFilePicker);
    elements.csvFileInput.addEventListener("change", handleCsvFileChange);
  }

  // 현재 지원 이력 데이터를 CSV 파일로 내려받는다.
  function downloadAppliedCompaniesCsv() {
    const rows = [
      csvColumns.map((column) => column.header),
      ...getCurrentData().appliedCompanies.map((company) =>
        csvColumns.map((column) => company[column.key] ?? "")
      )
    ];
    const csvText = rows.map(formatCsvRow).join("\r\n");
    const blob = new Blob([`\uFEFF${csvText}`], {
      type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `jobfilter-applications-${getTodayDateValue()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // CSV 등록 파일 선택창을 연다.
  function openCsvFilePicker() {
    elements.csvFileInput.click();
  }

  // 선택된 CSV 파일을 읽어 지원 이력 저장소에 등록한다.
  async function handleCsvFileChange(event) {
    const [file] = event.target.files;

    if (!file) {
      return;
    }

    try {
      const csvText = await file.text();
      const inputs = parseAppliedCompaniesCsv(csvText);
      const addedCompanies = await addAppliedCompanies(inputs);

      await render();
      window.alert(`CSV 등록 완료: ${addedCompanies.length}건 추가`);
    } catch (error) {
      window.alert("CSV 등록에 실패했습니다. 파일 형식을 확인해주세요.");
      console.error(error);
    } finally {
      elements.csvFileInput.value = "";
    }
  }
}

// 지원 이력 CSV 텍스트를 저장소 입력 데이터 배열로 변환한다.
function parseAppliedCompaniesCsv(csvText) {
  const rows = parseCsvRows(csvText.replace(/^\uFEFF/u, ""));
  const [headers = [], ...dataRows] = rows;
  const headerMap = createCsvHeaderMap(headers);

  return dataRows
    .map((row) => mapCsvRowToAppliedCompany(row, headerMap))
    .filter((company) => company.companyName);
}

// CSV 헤더 이름을 데이터 키로 찾기 위한 Map을 만든다.
function createCsvHeaderMap(headers) {
  const aliases = new Map([
    ["지원플랫폼", "applySite"],
    ["applySite", "applySite"],
    ["site", "applySite"],
    ["회사명", "companyName"],
    ["companyName", "companyName"],
    ["공고명", "title"],
    ["title", "title"],
    ["지원일", "appliedAt"],
    ["appliedAt", "appliedAt"],
    ["열람여부", "readStatus"],
    ["readStatus", "readStatus"],
    ["상태", "applyStatus"],
    ["applyStatus", "applyStatus"],
    ["공고URL", "postingUrl"],
    ["postingUrl", "postingUrl"]
  ]);
  const headerMap = new Map();

  headers.forEach((header, index) => {
    const key = aliases.get(String(header).trim());

    if (key) {
      headerMap.set(key, index);
    }
  });

  return headerMap;
}

// CSV 한 줄 데이터를 지원 이력 저장 입력 형태로 만든다.
function mapCsvRowToAppliedCompany(row, headerMap) {
  const applySite = getCsvValue(row, headerMap, "applySite");

  return {
    site: applySite,
    applySite,
    companyName: getCsvValue(row, headerMap, "companyName"),
    title: getCsvValue(row, headerMap, "title"),
    appliedAt: getCsvValue(row, headerMap, "appliedAt"),
    readStatus: getCsvValue(row, headerMap, "readStatus"),
    applyStatus: getCsvValue(row, headerMap, "applyStatus"),
    postingUrl: getCsvValue(row, headerMap, "postingUrl")
  };
}

// CSV 행에서 지정한 키에 해당하는 값을 가져온다.
function getCsvValue(row, headerMap, key) {
  const index = headerMap.get(key);

  if (index === undefined) {
    return "";
  }

  return String(row[index] ?? "").trim();
}

// CSV 행을 쉼표와 따옴표 규칙에 맞게 문자열로 만든다.
function formatCsvRow(row) {
  return row.map(formatCsvCell).join(",");
}

// CSV 셀 값을 필요한 경우 따옴표로 감싸고 내부 따옴표를 이스케이프한다.
function formatCsvCell(value) {
  const text = String(value ?? "");

  if (!/[",\r\n]/u.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

// CSV 텍스트를 RFC4180에 가까운 2차원 배열로 파싱한다.
function parseCsvRows(csvText) {
  const rows = [];
  let row = [];
  let cell = "";
  let insideQuote = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"' && insideQuote && nextChar === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      insideQuote = !insideQuote;
    } else if (char === "," && !insideQuote) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !insideQuote) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((currentRow) =>
    currentRow.some((currentCell) => String(currentCell).trim())
  );
}
