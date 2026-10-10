/**
 * ====================================================================
 * 스마트 도서관 도서 예약 시스템 - Google Apps Script 백엔드 (Code.gs)
 * ====================================================================
 * 
 * [설치 및 배포 방법]
 * 1. Google 스프레드시트 생성 (또는 기존 시트 열기)
 * 2. 상단 메뉴: [확장 프로그램] > [Apps Script] 클릭
 * 3. 코드 편집기에 이 파일(Code.gs)의 내용을 붙여넣기
 * 4. [+] 버튼 클릭 > [HTML] 선택 후 파일 이름을 'Index' 로 생성
 * 5. Index.html 파일 내용 붙여넣기
 * 6. 우측 상단 [배포] > [새 배포] 클릭
 * 7. 유형: [웹 앱] 선택
 *    - 설명: 도서관 예약 웹앱 v1.0
 *    - 다음 사용자로 실행: [나]
 *    - 액세스 권한이 있는 사용자: [모든 사용자]
 * 8. [배포] 클릭 후 부여된 웹 앱 URL로 접속
 */

// 시트 시트명 상수 정의
const SHEET_BOOKS = "도서목록";
const SHEET_RESERVATIONS = "예약내역";

/**
 * 웹 앱 진입점 (GET 요청 처리)
 */
function doGet() {
  // 최초 실행 시 시트 자동 초기화
  initSheetsIfEmpty();

  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('스마트 도서관 도서 예약 시스템')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 1. 도서 목록 조회 (요구사항 2: google.script.run.getBookList() 대응)
 * @returns {Array<Object>} 도서 목록 객체 배열
 */
function getBookList() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_BOOKS);

    // 시트가 없으면 기본 샘플 데이터와 함께 생성
    if (!sheet) {
      initSheetsIfEmpty();
      sheet = ss.getSheetByName(SHEET_BOOKS);
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return [];
    }

    // 헤더 행 (1행): [도서ID, 제목, 저자, 대출상태, 분류]
    const books = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue; // 빈 행 스킵

      books.push({
        id: String(row[0]).trim(),
        title: String(row[1] || '').trim(),
        author: String(row[2] || '').trim(),
        status: String(row[3] || '대출가능').trim(), // '대출가능' | '예약중' | '대출중'
        category: String(row[4] || '').trim()
      });
    }

    return books;
  } catch (error) {
    Logger.log("getBookList Error: " + error.toString());
    throw new Error("도서 목록을 조회하는 중 오류가 발생했습니다: " + error.message);
  }
}

/**
 * 2. 도서 예약 처리 (요구사항 2: google.script.run.reserveBook(bookId, userName, userEmail) 대응)
 * 동시성 문제를 방지하기 위해 LockService를 적용합니다.
 * 
 * @param {string} bookId 도서 식별자
 * @param {string} userName 신청자 성명
 * @param {string} userEmail 신청자 이메일
 * @returns {Object} { success: boolean, message: string }
 */
function reserveBook(bookId, userName, userEmail) {
  // 동시성 제어 락 획득 (최대 10초 대기)
  const lock = LockService.getScriptLock();
  
  try {
    const successLock = lock.tryLock(10000);
    if (!successLock) {
      return { 
        success: false, 
        message: "현재 다른 예약 요청이 처리 중입니다. 잠시 후 다시 시도해 주세요." 
      };
    }

    // 입력값 유효성 검사
    if (!bookId || !userName || !userEmail) {
      return { success: false, message: "필수 입력값이 누락되었습니다." };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let bookSheet = ss.getSheetByName(SHEET_BOOKS);
    let reserveSheet = ss.getSheetByName(SHEET_RESERVATIONS);

    if (!bookSheet || !reserveSheet) {
      initSheetsIfEmpty();
      bookSheet = ss.getSheetByName(SHEET_BOOKS);
      reserveSheet = ss.getSheetByName(SHEET_RESERVATIONS);
    }

    const bookData = bookSheet.getDataRange().getValues();
    let targetRowIndex = -1;
    let targetBookTitle = "";
    let currentStatus = "";

    // 대상 도서 검색 (A열: 도서ID)
    for (let i = 1; i < bookData.length; i++) {
      if (String(bookData[i][0]).trim() === String(bookId).trim()) {
        targetRowIndex = i + 1; // 1-based index
        targetBookTitle = bookData[i][1];
        currentStatus = String(bookData[i][3]).trim();
        break;
      }
    }

    if (targetRowIndex === -1) {
      return { success: false, message: "해당 도서(ID: " + bookId + ")를 찾을 수 없습니다." };
    }

    // 예약 가능 여부 상태 확인
    if (currentStatus !== "대출가능") {
      return { 
        success: false, 
        message: "해당 도서는 현재 '" + currentStatus + "' 상태이므로 예약할 수 없습니다." 
      };
    }

    // 1) 도서 목록 시트의 상태를 '예약중'으로 변경 (4열: D열)
    bookSheet.getRange(targetRowIndex, 4).setValue("예약중");

    // 2) 예약 내역 시트에 로그 기록
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    reserveSheet.appendRow([
      now,
      String(bookId).trim(),
      targetBookTitle,
      String(userName).trim(),
      String(userEmail).trim(),
      "예약접수"
    ]);

    // 성공 반환
    return {
      success: true,
      message: "'" + targetBookTitle + "' 도서 예약이 성공적으로 접수되었습니다. (신청자: " + userName + ")"
    };

  } catch (error) {
    Logger.log("reserveBook Error: " + error.toString());
    return {
      success: false,
      message: "예약 처리 중 시스템 오류가 발생했습니다: " + error.message
    };
  } finally {
    // 락 해제
    lock.releaseLock();
  }
}

/**
 * 스프레드시트 초기 템플릿 자동 생성 함수
 */
function initSheetsIfEmpty() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. 도서목록 시트 확인 및 생성
  let bookSheet = ss.getSheetByName(SHEET_BOOKS);
  if (!bookSheet) {
    bookSheet = ss.insertSheet(SHEET_BOOKS);
    
    // 헤더 행 설정
    const headers = [["도서ID", "도서명", "저자", "대출상태", "분류"]];
    bookSheet.getRange(1, 1, 1, 5).setValues(headers);
    bookSheet.getRange(1, 1, 1, 5).setBackground("#0284c7").setFontColor("#ffffff").setFontWeight("bold");

    // 샘플 데이터 삽입
    const sampleBooks = [
      ["BK-1001", "클린 코드: 애자일 소프트웨어 장인 정신", "로버트 C. 마틴", "대출가능", "프로그래밍"],
      ["BK-1002", "리팩터링 2판: 코드 구조를 개선하는 확실한 방법", "마틴 파울러", "대출중", "소프트웨어 공학"],
      ["BK-1003", "실용주의 프로그래머: 숙련자를 위한 개발 안내서", "데이비드 토머스, 앤드류 헌트", "예약중", "개발 실무"],
      ["BK-1004", "객체지향의 사실과 오해: 역할, 책임, 협력 관점에서 본 객체지향", "조영호", "대출가능", "객체지향"],
      ["BK-1005", "모던 자바스크립트 Deep Dive", "이웅모", "대출가능", "웹 개발"],
      ["BK-1006", "Do it! 점프 투 파이썬", "박응용", "대출중", "파이썬"],
      ["BK-1007", "그림으로 공부하는 IT 인프라 구조", "야마자키 타이지", "예약중", "인프라/네트워크"],
      ["BK-1008", "도메인 주도 설계 핵심: DDD Distilled", "반 버논", "대출가능", "아키텍처"]
    ];
    bookSheet.getRange(2, 1, sampleBooks.length, 5).setValues(sampleBooks);
    bookSheet.autoResizeColumns(1, 5);
  }

  // 2. 예약내역 시트 확인 및 생성
  let reserveSheet = ss.getSheetByName(SHEET_RESERVATIONS);
  if (!reserveSheet) {
    reserveSheet = ss.insertSheet(SHEET_RESERVATIONS);
    const resHeaders = [["신청일시", "도서ID", "도서명", "신청자명", "신청자이메일", "처리상태"]];
    reserveSheet.getRange(1, 1, 1, 6).setValues(resHeaders);
    reserveSheet.getRange(1, 1, 1, 6).setBackground("#075985").setFontColor("#ffffff").setFontWeight("bold");
    reserveSheet.autoResizeColumns(1, 6);
  }
}
