// 삭제 확인 모달의 이벤트와 실행 대기 상태를 관리한다.
export function createConfirmationController(elements) {
  let pendingConfirmAction = null;

  return {
    bind,
    requestDeleteConfirmation
  };

  // 삭제나 해제 작업을 실행하기 전에 확인 모달을 표시한다.
  function requestDeleteConfirmation({ message, onConfirm }) {
    pendingConfirmAction = onConfirm;
    elements.confirmMessage.textContent = message;
    elements.confirmModal.hidden = false;
    elements.confirmDeleteButton.focus();
  }

  // 삭제 확인 모달 버튼과 배경 클릭 이벤트를 등록한다.
  function bind() {
    elements.confirmCancelButton.addEventListener("click", closeConfirmModal);
    elements.confirmDeleteButton.addEventListener("click", runConfirmedDelete);
    elements.confirmModal.addEventListener("click", (event) => {
      if (event.target === elements.confirmModal) {
        closeConfirmModal();
      }
    });
  }

  // 확인 모달을 닫고 대기 중인 삭제 작업을 초기화한다.
  function closeConfirmModal() {
    pendingConfirmAction = null;
    elements.confirmModal.hidden = true;
  }

  // 확인 모달에서 승인된 삭제 작업을 실행한다.
  async function runConfirmedDelete() {
    const action = pendingConfirmAction;

    closeConfirmModal();

    if (action) {
      await action();
    }
  }
}
