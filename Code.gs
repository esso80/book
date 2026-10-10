/**
 * ====================================================================
 * 스마트 도서관 도서 예약 시스템 - Google Apps Script 백엔드 (Code.gs)
 * ====================================================================
 * 
 * [구글 스프레드시트 데이터베이스 구조]
 * 1) '도서목록' 시트 (도서 마스터)
 *    - A열: 도서ID (예: BK-1001)
 *    - B열: 도서명 (예: 클린 코드)
 *    - C열: 저자 (예: 로버트 C. 마틴)
 *    - D열: 대출상태 (대출가능 | 예약중 | 대출중)
 *    - E열: 분류 (예: 프로그래밍)
 * 
 * 2) '예약내역' 시트 (예약 트랜잭션 로그)
 *    - A열: 신청일시 (yyyy-MM-dd HH:mm:ss)
 *    - B열: 도서ID (BK-1001)
 *    - C열: 도서명
 *    - D열: 신청자명
 *    - E열: 신청자이메일
 *    - F열: 처리상태 (예약접수)
 */

const SHEET_BOOKS = "도서목록";
const SHEET_RESERVATIONS = "예약내역";

/**
 * 1. WebApp 진입점 (GET 요청 처리)
 *    - 웹 브라우저 접속 시: Index.html 렌더링
 *    - ?action=getBooks 호출 시: 도서 목록 JSON 반환
 *    - ?action=reserve&bookId=... 호출 시: 예약 처리 JSON 반환
 */
function doGet(e) {
  // 스프레드시트 템플릿 없을 시 자동 생성
  initSheetsIfEmpty();

  const action = e && e.parameter ? e.parameter.action : null;

  // JSON API 모드 대응 (CORS 지원)
  if (action === 'getBooks') {
    const books = getBookList();
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: books }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'reserve') {
    const bookId = e.parameter.bookId;
    const userName = e.parameter.userName;
    const userEmail = e.parameter.userEmail;
    const result = reserveBook(bookId, userName, userEmail);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 기본 Web App UI 반환 (Index.html)
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('스마트 도서관 도서 예약 시스템')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 2. POST 요청 처리 (외부 fetch/CORS 폼 전송 대응)
 */
function doPost(e) {
  initSheetsIfEmpty();
  try {
    let params = {};
    if (e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (err) {
        params = e.parameter;
      }
    } else {
      params = e.parameter;
    }

    const action = params.action || (e.parameter ? e.parameter.action : '');
    
    if (action === 'reserve' || params.bookId) {
      const result = reserveBook(params.bookId, params.userName, params.userEmail);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, message: '알 수 없는 요청입니다.' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 3. 도서 목록 조회 (Index.html에서 google.script.run.getBookList()로 호출)
 * @returns {Array<Object>} 도서 목록 배열
 */
function getBookList() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_BOOKS);

    if (!sheet) {
      initSheetsIfEmpty();
      sheet = ss.getSheetByName(SHEET_BOOKS);
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const books = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue; // 빈 행 제외

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
    throw new Error("도서 목록 조회 중 오류 발생: " + error.message);
  }
}

/**
 * 4. 도서 예약 처리 (Index.html에서 google.script.run.reserveBook(...)로 호출)
 * 동시성 문제 방지를 위해 LockService를 적용합니다.
 *
 * @param {string} bookId 도서 ID
 * @param {string} userName 신청자명
 * @param {string} userEmail 신청자 이메일
 * @returns {Object} { success: boolean, message: string }
 */
function reserveBook(bookId, userName, userEmail) {
  // 동시성 락 획득 (최대 10초 대기)
  const lock = LockService.getScriptLock();

  try {
    const gotLock = lock.tryLock(10000);
    if (!gotLock) {
      return { 
        success: false, 
        message: "다른 예약 요청이 처리 중입니다. 잠시 후 다시 시도해 주세요." 
      };
    }

    if (!bookId || !userName || !userEmail) {
      return { success: false, message: "필수 입력값(도서ID, 이름, 이메일)이 누락되었습니다." };
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
    let targetRow = -1;
    let bookTitle = "";
    let currentStatus = "";

    // A열(도서ID) 검색
    for (let i = 1; i < bookData.length; i++) {
      if (String(bookData[i][0]).trim() === String(bookId).trim()) {
        targetRow = i + 1; // 1-based row index
        bookTitle = String(bookData[i][1] || '');
        currentStatus = String(bookData[i][3] || '').trim();
        break;
      }
    }

    if (targetRow === -1) {
      return { success: false, message: "해당 도서(ID: " + bookId + ")를 찾을 수 없습니다." };
    }

    // 대출가능 상태 체크
    if (currentStatus !== "대출가능") {
      return { 
        success: false, 
        message: "해당 도서는 현재 '" + currentStatus + "' 상태이므로 예약할 수 없습니다." 
      };
    }

    // 1) '도서목록' 시트 D열(4번째 열) 상태를 '예약중'으로 변경
    bookSheet.getRange(targetRow, 4).setValue("예약중");

    // 2) '예약내역' 시트에 새 로그 추가
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    reserveSheet.appendRow([
      now,
      String(bookId).trim(),
      bookTitle,
      String(userName).trim(),
      String(userEmail).trim(),
      "예약접수"
    ]);

    return {
      success: true,
      message: "'" + bookTitle + "' 도서 예약이 성공적으로 완료되었습니다. (신청자: " + userName + ")"
    };

  } catch (error) {
    Logger.log("reserveBook Error: " + error.toString());
    return {
      success: false,
      message: "예약 처리 중 오류가 발생했습니다: " + error.message
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 5. 스프레드시트 초기 테이블 자동 생성
 */
function initSheetsIfEmpty() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1) '도서목록' 시트
  let bookSheet = ss.getSheetByName(SHEET_BOOKS);
  if (!bookSheet) {
    bookSheet = ss.insertSheet(SHEET_BOOKS);
    const headers = [["도서ID", "도서명", "저자", "대출상태", "분류"]];
    bookSheet.getRange(1, 1, 1, 5).setValues(headers);
    bookSheet.getRange(1, 1, 1, 5).setBackground("#0284c7").setFontColor("#ffffff").setFontWeight("bold");

    const sampleBooks = [
      ["BK-1001", "클린 코드: 애자일 소프트웨어 장인 정신", "로버트 C. 마틴", "대출가능", "프로그래밍"],
      ["BK-1002", "리팩터링 2판: 코드 구조를 개선하는 확실한 방법", "마틴 파울러", "대출중", "소프트웨어 공학"],
      ["BK-1003", "실용주의 프로그래머: 숙련자를 위한 개발 안내서", "데이비드 토머스", "예약중", "개발 실무"],
      ["BK-1004", "객체지향의 사실과 오해", "조영호", "대출가능", "객체지향"],
      ["BK-1005", "모던 자바스크립트 Deep Dive", "이웅모", "대출가능", "웹 개발"],
      ["BK-1006", "Do it! 점프 투 파이썬", "박응용", "대출중", "파이썬"],
      ["BK-1007", "그림으로 공부하는 IT 인프라 구조", "야마자키 타이지", "예약중", "인프라/네트워크"],
      ["BK-1008", "도메인 주도 설계 핵심: DDD Distilled", "반 버논", "대출가능", "아키텍처"]
    ];
    bookSheet.getRange(2, 1, sampleBooks.length, 5).setValues(sampleBooks);
    bookSheet.autoResizeColumns(1, 5);
  }

  // 2) '예약내역' 시트
  let reserveSheet = ss.getSheetByName(SHEET_RESERVATIONS);
  if (!reserveSheet) {
    reserveSheet = ss.insertSheet(SHEET_RESERVATIONS);
    const resHeaders = [["신청일시", "도서ID", "도서명", "신청자명", "신청자이메일", "처리상태"]];
    reserveSheet.getRange(1, 1, 1, 6).setValues(resHeaders);
    reserveSheet.getRange(1, 1, 1, 6).setBackground("#075985").setFontColor("#ffffff").setFontWeight("bold");
    reserveSheet.autoResizeColumns(1, 6);
  }
}
