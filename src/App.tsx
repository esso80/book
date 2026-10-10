import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  Ban,
  User,
  Mail,
  X,
  Check,
  Copy,
  Download,
  Code2,
  Eye,
  FileCode2,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  AlertCircle,
  RotateCcw,
  Sparkles
} from 'lucide-react';

// 도서 데이터 인터페이스
interface Book {
  id: string;
  title: string;
  author: string;
  status: '대출가능' | '예약중' | '대출중';
  category: string;
}

// 예약 내역 로그 인터페이스
interface ReservationLog {
  timestamp: string;
  bookId: string;
  bookTitle: string;
  userName: string;
  userEmail: string;
}

// 초기 기본 샘플 도서 목록
const INITIAL_BOOKS: Book[] = [
  { id: 'BK-1001', title: '클린 코드: 애자일 소프트웨어 장인 정신', author: '로버트 C. 마틴', status: '대출가능', category: '프로그래밍' },
  { id: 'BK-1002', title: '리팩터링 2판: 코드 구조를 개선하는 확실한 방법', author: '마틴 파울러', status: '대출중', category: '소프트웨어 공학' },
  { id: 'BK-1003', title: '실용주의 프로그래머: 숙련자를 위한 개발 안내서', author: '데이비드 토머스, 앤드류 헌트', status: '예약중', category: '개발 실무' },
  { id: 'BK-1004', title: '객체지향의 사실과 오해: 역할, 책임, 협력 관점에서 본 객체지향', author: '조영호', status: '대출가능', category: '객체지향' },
  { id: 'BK-1005', title: '모던 자바스크립트 Deep Dive: 자바스크립트의 기본 개념과 동작 원리', author: '이웅모', status: '대출가능', category: '웹 개발' },
  { id: 'BK-1006', title: 'Do it! 점프 투 파이썬: 라이브러리 예제 편', author: '박응용', status: '대출중', category: '파이썬' },
  { id: 'BK-1007', title: '그림으로 공부하는 IT 인프라 구조', author: '야마자키 타이지', status: '예약중', category: '인프라/네트워크' },
  { id: 'BK-1008', title: '도메인 주도 설계 핵심: DDD Distilled', author: '반 버논', status: '대출가능', category: '소프트웨어 아키텍처' }
];

// 단일 파일 Index.html 소스코드 텍스트
const INDEX_HTML_CODE = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>스마트 도서관 도서 예약 시스템</title>
  
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: {
              50: '#f0f7ff',
              100: '#e0effe',
              500: '#0284c7',
              600: '#0369a1',
              700: '#075985',
              800: '#0c4a6e',
              900: '#082f49'
            }
          }
        }
      }
    }
  </script>
  
  <style>
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
    body {
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .modal-backdrop { transition: opacity 0.25s ease-out; }
    .modal-content { transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out; }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .skeleton {
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex flex-col antialiased">

  <!-- 상단 네비게이션 헤더 -->
  <header class="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-sm shadow-sky-600/30">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div>
          <h1 class="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">스마트 도서관</h1>
          <p class="text-xs text-slate-500 mt-1">도서 대출 예약 포털</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button id="refreshBtn" onclick="fetchBookList()" class="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/20 active:scale-95" title="새로고침">
          <svg id="refreshIcon" class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span class="hidden sm:inline">새로고침</span>
        </button>
      </div>
    </div>
  </header>

  <!-- 메인 본문 콘텐츠 -->
  <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

    <!-- 배너 / 헤더 인트로 -->
    <section class="mb-6 sm:mb-8">
      <div class="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div class="relative z-10 max-w-2xl">
          <span class="inline-block px-2.5 py-1 text-xs font-semibold bg-sky-500/20 text-sky-300 rounded-md mb-3 border border-sky-400/20">
            Google Apps Script 연동 시스템
          </span>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            원하는 도서를 온라인으로 즉시 예약하세요
          </h2>
          <p class="text-sm sm:text-base text-slate-300">
            실시간 대출 가능 상태를 확인하고, 간편한 정보 입력으로 책을 바로 예약할 수 있습니다.
          </p>
        </div>
      </div>
    </section>

    <!-- 검색 및 필터 컨트롤 바 -->
    <section class="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
      <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        
        <!-- 검색창 -->
        <div class="relative flex-1">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input 
            type="text" 
            id="searchInput" 
            oninput="handleSearchFilter()"
            placeholder="도서명, 저자, 도서 ID로 검색..." 
            class="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
          >
          <button 
            id="clearSearchBtn" 
            onclick="clearSearch()" 
            class="hidden absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            title="검색어 지우기"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- 상태 필터 탭 -->
        <div class="flex items-center bg-slate-100 p-1 rounded-lg gap-1 shrink-0 overflow-x-auto">
          <button onclick="setStatusFilter('ALL')" id="filter-ALL" class="filter-tab px-3 py-1.5 text-xs font-semibold rounded-md bg-white text-slate-900 shadow-sm transition">전체</button>
          <button onclick="setStatusFilter('대출가능')" id="filter-대출가능" class="filter-tab px-3 py-1.5 text-xs font-medium rounded-md text-slate-600 hover:text-slate-900 transition">대출가능</button>
          <button onclick="setStatusFilter('예약중')" id="filter-예약중" class="filter-tab px-3 py-1.5 text-xs font-medium rounded-md text-slate-600 hover:text-slate-900 transition">예약중</button>
          <button onclick="setStatusFilter('대출중')" id="filter-대출중" class="filter-tab px-3 py-1.5 text-xs font-medium rounded-md text-slate-600 hover:text-slate-900 transition">대출중</button>
        </div>

      </div>

      <div class="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
        <span id="counterInfo">도서 목록을 불러오는 중...</span>
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> 대출가능</span>
          <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-500"></span> 예약중</span>
          <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-rose-500"></span> 대출중</span>
        </div>
      </div>
    </section>

    <!-- 도서 카드 그리드 목록 -->
    <section>
      <!-- 로딩 스켈레톤 -->
      <div id="loadingState" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div class="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div class="skeleton h-5 w-20 rounded"></div>
          <div class="skeleton h-6 w-3/4 rounded"></div>
          <div class="skeleton h-4 w-1/2 rounded"></div>
          <div class="skeleton h-10 w-full rounded-lg mt-4"></div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div class="skeleton h-5 w-20 rounded"></div>
          <div class="skeleton h-6 w-3/4 rounded"></div>
          <div class="skeleton h-4 w-1/2 rounded"></div>
          <div class="skeleton h-10 w-full rounded-lg mt-4"></div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div class="skeleton h-5 w-20 rounded"></div>
          <div class="skeleton h-6 w-3/4 rounded"></div>
          <div class="skeleton h-4 w-1/2 rounded"></div>
          <div class="skeleton h-10 w-full rounded-lg mt-4"></div>
        </div>
      </div>

      <!-- 에러 상태 안내 -->
      <div id="errorState" class="hidden bg-rose-50 border border-rose-200 rounded-xl p-8 text-center my-6">
        <h3 class="text-base font-bold text-rose-900 mb-1">도서 목록을 불러오지 못했습니다</h3>
        <p id="errorMessage" class="text-sm text-rose-700 mb-4">네트워크 상태를 확인하거나 다시 시도해 주세요.</p>
        <button onclick="fetchBookList()" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition">다시 시도하기</button>
      </div>

      <!-- 빈 결과 상태 안내 -->
      <div id="emptyState" class="hidden bg-white border border-slate-200 rounded-xl p-12 text-center my-6 shadow-sm">
        <h3 class="text-base font-bold text-slate-800 mb-1">검색 조건에 맞는 도서가 없습니다</h3>
        <p class="text-sm text-slate-500 mb-4">다른 검색어를 입력하시거나 필터를 변경해 보세요.</p>
        <button onclick="resetFilters()" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition">필터 초기화</button>
      </div>

      <!-- 실제 도서 카드 컨테이너 -->
      <div id="bookGrid" class="hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"></div>
    </section>

  </main>

  <!-- 예약 모달 (Modal) -->
  <div id="reserveModal" class="hidden fixed inset-0 z-50 overflow-y-auto">
    <div onclick="closeModal()" class="modal-backdrop fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity opacity-0"></div>

    <div class="flex min-h-full items-center justify-center p-4">
      <div class="modal-content relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform scale-95 opacity-0">
        
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div class="flex items-center gap-2">
            <h3 class="text-base font-bold text-slate-900">도서 예약 신청</h3>
          </div>
          <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition" title="닫기">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form id="reserveForm" onsubmit="submitReservation(event)" class="p-6 space-y-4">
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div class="text-[11px] font-semibold text-sky-700 uppercase tracking-wider mb-1" id="modalBookId">BOOK ID: -</div>
            <h4 class="text-base font-bold text-slate-900 line-clamp-2" id="modalBookTitle">도서 제목</h4>
            <div class="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <span>저자:</span>
              <span class="font-medium text-slate-700" id="modalBookAuthor">-</span>
            </div>
          </div>

          <input type="hidden" id="formBookId" name="bookId">

          <div>
            <label for="userName" class="block text-xs font-semibold text-slate-700 mb-1.5">
              신청자 이름 <span class="text-rose-500">*</span>
            </label>
            <input type="text" id="userName" name="userName" required placeholder="예: 홍길동"
              class="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition">
          </div>

          <div>
            <label for="userEmail" class="block text-xs font-semibold text-slate-700 mb-1.5">
              이메일 주소 <span class="text-rose-500">*</span>
            </label>
            <input type="email" id="userEmail" name="userEmail" required placeholder="예: user@example.com"
              class="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition">
            <p class="text-[11px] text-slate-400 mt-1">예약 완료 및 대출 승인 안내가 해당 이메일로 전송됩니다.</p>
          </div>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button type="button" onclick="closeModal()" class="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg transition">취소</button>
            <button type="submit" id="submitBtn" class="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed">
              <svg id="submitSpinner" class="hidden animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span id="submitBtnText">예약 확정하기</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  </div>

  <div id="toastContainer" class="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"></div>

  <!-- JavaScript 연동 스크립트 -->
  <script>
    let allBooks = [];
    let currentFilter = 'ALL';
    let searchQuery = '';
    let isSubmitting = false;

    // GAS 환경 체크
    function isGasEnvironment() {
      return typeof google !== 'undefined' && typeof google.script !== 'undefined' && typeof google.script.run !== 'undefined';
    }

    document.addEventListener('DOMContentLoaded', () => {
      fetchBookList();
    });

    // 1. 도서 목록 조회
    function fetchBookList() {
      showLoading(true);
      hideError();

      const refreshIcon = document.getElementById('refreshIcon');
      if (refreshIcon) refreshIcon.classList.add('animate-spin');

      if (isGasEnvironment()) {
        google.script.run
          .withSuccessHandler((response) => {
            onBookListSuccess(response);
            if (refreshIcon) refreshIcon.classList.remove('animate-spin');
          })
          .withFailureHandler((error) => {
            onBookListFailure(error);
            if (refreshIcon) refreshIcon.classList.remove('animate-spin');
          })
          .getBookList();
      } else {
        // 로컬 테스트용 모의 폴백
        setTimeout(() => {
          allBooks = [
            { id: 'BK-1001', title: '클린 코드: 애자일 소프트웨어 장인 정신', author: '로버트 C. 마틴', status: '대출가능', category: '프로그래밍' },
            { id: 'BK-1002', title: '리팩터링 2판: 코드 구조를 개선하는 확실한 방법', author: '마틴 파울러', status: '대출중', category: '소프트웨어 공학' },
            { id: 'BK-1003', title: '실용주의 프로그래머: 숙련자를 위한 개발 안내서', author: '데이비드 토머스, 앤드류 헌트', status: '예약중', category: '개발 실무' },
            { id: 'BK-1004', title: '객체지향의 사실과 오해', author: '조영호', status: '대출가능', category: '객체지향' }
          ];
          onBookListSuccess(allBooks);
          if (refreshIcon) refreshIcon.classList.remove('animate-spin');
        }, 300);
      }
    }

    function onBookListSuccess(data) {
      showLoading(false);
      try {
        allBooks = typeof data === 'string' ? JSON.parse(data) : (data || []);
      } catch (e) {
        allBooks = data || [];
      }
      renderFilteredBooks();
    }

    function onBookListFailure(error) {
      showLoading(false);
      const errBox = document.getElementById('errorState');
      const errMsg = document.getElementById('errorMessage');
      if (errBox && errMsg) {
        errMsg.textContent = (error && error.message) ? error.message : '오류가 발생했습니다.';
        errBox.classList.remove('hidden');
      }
      document.getElementById('bookGrid').classList.add('hidden');
    }

    function renderFilteredBooks() {
      const filtered = allBooks.filter(book => {
        const matchStatus = (currentFilter === 'ALL') || (book.status === currentFilter);
        const q = searchQuery.trim().toLowerCase();
        const matchQuery = !q || 
          (book.title && book.title.toLowerCase().includes(q)) ||
          (book.author && book.author.toLowerCase().includes(q)) ||
          (book.id && book.id.toLowerCase().includes(q));
        return matchStatus && matchQuery;
      });

      const counter = document.getElementById('counterInfo');
      if (counter) counter.textContent = '총 ' + allBooks.length + '권 중 ' + filtered.length + '권 표시';

      const grid = document.getElementById('bookGrid');
      const emptyState = document.getElementById('emptyState');

      if (filtered.length === 0) {
        grid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
      }

      emptyState.classList.add('hidden');
      grid.classList.remove('hidden');
      grid.innerHTML = '';

      filtered.forEach(book => {
        grid.appendChild(createBookCard(book));
      });
    }

    // 도서 카드 생성 함수
    function createBookCard(book) {
      const card = document.createElement('div');
      card.className = "bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between";

      let badgeHtml = '';
      let buttonHtml = '';

      if (book.status === '대출가능') {
        badgeHtml = '<span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>대출가능</span>';
        buttonHtml = '<button type="button" onclick="openReserveModal(\\'' + escapeHtml(book.id) + '\\', \\'' + escapeHtml(book.title) + '\\', \\'' + escapeHtml(book.author) + '\\')" class="w-full py-2.5 px-4 text-xs sm:text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition">예약하기</button>';
      } else if (book.status === '예약중') {
        badgeHtml = '<span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>예약중</span>';
        buttonHtml = '<button type="button" disabled class="w-full py-2.5 px-4 text-xs sm:text-sm font-medium text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed border border-slate-200/60">예약 불가 (예약중)</button>';
      } else {
        badgeHtml = '<span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-50 text-rose-700 border border-rose-200"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>대출중</span>';
        buttonHtml = '<button type="button" disabled class="w-full py-2.5 px-4 text-xs sm:text-sm font-medium text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed border border-slate-200/60">대출 불가 (대출중)</button>';
      }

      card.innerHTML = 
        '<div>' +
          '<div class="flex items-center justify-between gap-2 mb-3">' +
            '<span class="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">' + escapeHtml(book.id) + '</span>' +
            badgeHtml +
          '</div>' +
          '<h3 class="text-base font-bold text-slate-900 leading-snug line-clamp-2 mb-2">' + escapeHtml(book.title) + '</h3>' +
          '<div class="text-xs text-slate-600 mb-5">저자: <span class="font-medium text-slate-800">' + escapeHtml(book.author || '저자 미상') + '</span></div>' +
        '</div>' +
        '<div class="pt-3 border-t border-slate-100">' + buttonHtml + '</div>';

      return card;
    }

    function openReserveModal(bookId, bookTitle, bookAuthor) {
      const modal = document.getElementById('reserveModal');
      document.getElementById('formBookId').value = bookId;
      document.getElementById('modalBookId').textContent = 'BOOK ID: ' + bookId;
      document.getElementById('modalBookTitle').textContent = bookTitle;
      document.getElementById('modalBookAuthor').textContent = bookAuthor;
      document.getElementById('userName').value = '';
      document.getElementById('userEmail').value = '';
      modal.classList.remove('hidden');
      setTimeout(() => {
        modal.querySelector('.modal-backdrop').classList.add('opacity-100');
        modal.querySelector('.modal-content').classList.add('scale-100', 'opacity-100');
      }, 10);
    }

    function closeModal() {
      if (isSubmitting) return;
      const modal = document.getElementById('reserveModal');
      modal.querySelector('.modal-backdrop').classList.remove('opacity-100');
      modal.querySelector('.modal-content').classList.remove('scale-100', 'opacity-100');
      setTimeout(() => modal.classList.add('hidden'), 200);
    }

    // 2. 예약 제출
    function submitReservation(e) {
      e.preventDefault();
      if (isSubmitting) return;

      const bookId = document.getElementById('formBookId').value;
      const userName = document.getElementById('userName').value.trim();
      const userEmail = document.getElementById('userEmail').value.trim();

      if (!bookId || !userName || !userEmail) return;

      setSubmitLoading(true);

      if (isGasEnvironment()) {
        google.script.run
          .withSuccessHandler((response) => {
            setSubmitLoading(false);
            closeModal();
            showToast('success', (response && response.message) ? response.message : '도서 예약이 완료되었습니다!');
            fetchBookList();
          })
          .withFailureHandler((error) => {
            setSubmitLoading(false);
            showToast('error', (error && error.message) ? error.message : '예약 처리 중 오류가 발생했습니다.');
          })
          .reserveBook(bookId, userName, userEmail);
      } else {
        setTimeout(() => {
          setSubmitLoading(false);
          closeModal();
          showToast('success', '[' + userName + ']님의 예약이 완료되었습니다.');
          const target = allBooks.find(b => b.id === bookId);
          if (target) target.status = '예약중';
          renderFilteredBooks();
        }, 500);
      }
    }

    function setSubmitLoading(loading) {
      isSubmitting = loading;
      const btn = document.getElementById('submitBtn');
      const spinner = document.getElementById('submitSpinner');
      const text = document.getElementById('submitBtnText');
      if (loading) {
        btn.disabled = true;
        spinner.classList.remove('hidden');
        text.textContent = '처리 중...';
      } else {
        btn.disabled = false;
        spinner.classList.add('hidden');
        text.textContent = '예약 확정하기';
      }
    }

    function setStatusFilter(status) {
      currentFilter = status;
      document.querySelectorAll('.filter-tab').forEach(t => t.className = "filter-tab px-3 py-1.5 text-xs font-medium rounded-md text-slate-600 hover:text-slate-900 transition");
      const active = document.getElementById('filter-' + status);
      if (active) active.className = "filter-tab px-3 py-1.5 text-xs font-semibold rounded-md bg-white text-slate-900 shadow-sm transition";
      renderFilteredBooks();
    }

    function handleSearchFilter() {
      searchQuery = document.getElementById('searchInput').value;
      const clearBtn = document.getElementById('clearSearchBtn');
      if (searchQuery.length > 0) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
      renderFilteredBooks();
    }

    function clearSearch() {
      document.getElementById('searchInput').value = '';
      searchQuery = '';
      document.getElementById('clearSearchBtn').classList.add('hidden');
      renderFilteredBooks();
    }

    function resetFilters() {
      clearSearch();
      setStatusFilter('ALL');
    }

    function showLoading(show) {
      const loading = document.getElementById('loadingState');
      const grid = document.getElementById('bookGrid');
      if (show) { loading.classList.remove('hidden'); grid.classList.add('hidden'); }
      else { loading.classList.add('hidden'); }
    }

    function hideError() {
      document.getElementById('errorState').classList.add('hidden');
    }

    function showToast(type, msg) {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = 'p-4 rounded-xl shadow-xl text-sm text-white ' + (type === 'success' ? 'bg-slate-900' : 'bg-rose-900');
      toast.textContent = msg;
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 3500);
    }

    function escapeHtml(text) {
      if (!text) return '';
      return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
  </script>
</body>
</html>`;

// Code.gs 소스코드 텍스트
const CODE_GS_CODE = `/**
 * 스마트 도서관 도서 예약 시스템 - Google Apps Script 백엔드 (Code.gs)
 */
const SHEET_BOOKS = "도서목록";
const SHEET_RESERVATIONS = "예약내역";

function doGet() {
  initSheetsIfEmpty();
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('스마트 도서관 도서 예약 시스템')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 1. 도서 목록 조회
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
      if (!row[0]) continue;
      books.push({
        id: String(row[0]).trim(),
        title: String(row[1] || '').trim(),
        author: String(row[2] || '').trim(),
        status: String(row[3] || '대출가능').trim(),
        category: String(row[4] || '').trim()
      });
    }
    return books;
  } catch (error) {
    Logger.log("getBookList Error: " + error.toString());
    throw new Error("도서 목록을 조회하지 못했습니다: " + error.message);
  }
}

/**
 * 2. 도서 예약 처리 (동시성 LockService 적용)
 */
function reserveBook(bookId, userName, userEmail) {
  const lock = LockService.getScriptLock();
  try {
    const gotLock = lock.tryLock(10000);
    if (!gotLock) {
      return { success: false, message: "다른 사용자가 예약 처리 중입니다. 잠시 후 다시 시도해 주세요." };
    }

    if (!bookId || !userName || !userEmail) {
      return { success: false, message: "필수 입력값이 누락되었습니다." };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const bookSheet = ss.getSheetByName(SHEET_BOOKS);
    const reserveSheet = ss.getSheetByName(SHEET_RESERVATIONS);

    const bookData = bookSheet.getDataRange().getValues();
    let targetRow = -1;
    let bookTitle = "";
    let currentStatus = "";

    for (let i = 1; i < bookData.length; i++) {
      if (String(bookData[i][0]).trim() === String(bookId).trim()) {
        targetRow = i + 1;
        bookTitle = bookData[i][1];
        currentStatus = String(bookData[i][3]).trim();
        break;
      }
    }

    if (targetRow === -1) {
      return { success: false, message: "해당 도서(ID: " + bookId + ")를 찾을 수 없습니다." };
    }

    if (currentStatus !== "대출가능") {
      return { success: false, message: "현재 '" + currentStatus + "' 상태이므로 예약할 수 없습니다." };
    }

    // 도서 상태 업데이트 -> '예약중'
    bookSheet.getRange(targetRow, 4).setValue("예약중");

    // 예약 내역 기록
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    reserveSheet.appendRow([now, bookId, bookTitle, userName, userEmail, "예약접수"]);

    return {
      success: true,
      message: "'" + bookTitle + "' 도서 예약이 성공적으로 접수되었습니다. (신청자: " + userName + ")"
    };
  } catch (err) {
    return { success: false, message: "예약 처리 실패: " + err.message };
  } finally {
    lock.releaseLock();
  }
}

function initSheetsIfEmpty() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let bSheet = ss.getSheetByName(SHEET_BOOKS);
  if (!bSheet) {
    bSheet = ss.insertSheet(SHEET_BOOKS);
    bSheet.getRange(1, 1, 1, 5).setValues([["도서ID", "도서명", "저자", "대출상태", "분류"]]);
    bSheet.getRange(1, 1, 1, 5).setBackground("#0284c7").setFontColor("#ffffff").setFontWeight("bold");
    bSheet.getRange(2, 1, 4, 5).setValues([
      ["BK-1001", "클린 코드", "로버트 C. 마틴", "대출가능", "프로그래밍"],
      ["BK-1002", "리팩터링 2판", "마틴 파울러", "대출중", "소프트웨어 공학"],
      ["BK-1003", "실용주의 프로그래머", "데이비드 토머스", "예약중", "개발 실무"],
      ["BK-1004", "객체지향의 사실과 오해", "조영호", "대출가능", "객체지향"]
    ]);
  }

  let rSheet = ss.getSheetByName(SHEET_RESERVATIONS);
  if (!rSheet) {
    rSheet = ss.insertSheet(SHEET_RESERVATIONS);
    rSheet.getRange(1, 1, 1, 6).setValues([["신청일시", "도서ID", "도서명", "신청자명", "신청자이메일", "처리상태"]]);
    rSheet.getRange(1, 1, 1, 6).setBackground("#075985").setFontColor("#ffffff").setFontWeight("bold");
  }
}`;

export default function App() {
  // 탭 상태: 'preview' (실시간 체험) | 'code-html' (Index.html) | 'code-gs' (Code.gs) | 'guide' (배포 가이드)
  const [activeTab, setActiveTab] = useState<'preview' | 'code-html' | 'code-gs' | 'guide'>('preview');

  // 도서 목록 및 필터 상태
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [statusFilter, setStatusFilter] = useState<'ALL' | '대출가능' | '예약중' | '대출중'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 예약 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 토스트 피드백 상태
  const [toast, setToast] = useState<{ id: number; type: 'success' | 'error'; message: string } | null>(null);

  // 예약 이력 기록
  const [reservations, setReservations] = useState<ReservationLog[]>([
    {
      timestamp: '2026-10-09 16:30:12',
      bookId: 'BK-1003',
      bookTitle: '실용주의 프로그래머: 숙련자를 위한 개발 안내서',
      userName: '김철수',
      userEmail: 'chulsoo@example.com'
    }
  ]);

  // 복사 피드백
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 토스트 표시 함수
  const showToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToast({ id, type, message });
    setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur));
    }, 3800);
  };

  // 도서 새로고침 (시뮬레이션)
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('success', '도서 목록(총 ' + books.length + '권)을 새로고침했습니다.');
    }, 450);
  };

  // 기본 데이터로 리셋
  const handleResetData = () => {
    setBooks(INITIAL_BOOKS);
    setSearchQuery('');
    setStatusFilter('ALL');
    showToast('success', '샘플 도서 데이터를 초기 상태로 리셋했습니다.');
  };

  // 모달 열기
  const handleOpenReserveModal = (book: Book) => {
    setSelectedBook(book);
    setUserName('');
    setUserEmail('');
    setIsModalOpen(true);
  };

  // 예약 신청 제출
  const handleSubmitReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook || isSubmitting) return;

    if (!userName.trim() || !userEmail.trim()) {
      showToast('error', '이름과 이메일을 모두 입력해 주세요.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(userEmail.trim())) {
      showToast('error', '유효한 이메일 주소를 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);

    // Google Apps Script `reserveBook` 비동기 호출 모의 (0.5s 지연)
    setTimeout(() => {
      setIsSubmitting(false);

      // 대상 도서 상태 '예약중'으로 변경
      setBooks((prev) =>
        prev.map((b) => (b.id === selectedBook.id ? { ...b, status: '예약중' } : b))
      );

      // 예약 로그 추가
      const newLog: ReservationLog = {
        timestamp: new Date().toLocaleString('ko-KR'),
        bookId: selectedBook.id,
        bookTitle: selectedBook.title,
        userName: userName.trim(),
        userEmail: userEmail.trim()
      };
      setReservations((prev) => [newLog, ...prev]);

      setIsModalOpen(false);
      showToast('success', `[${userName.trim()}]님의 '${selectedBook.title}' 예약이 접수되었습니다!`);
    }, 550);
  };

  // 필터링된 도서 목록
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [books, statusFilter, searchQuery]);

  // 코드 클립보드 복사
  const handleCopy = (code: string, key: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    showToast('success', '코드가 클립보드에 복사되었습니다.');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // 파일 다운로드
  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', `${filename} 파일이 다운로드되었습니다.`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* ================= 최상단 네비게이션 헤더 ================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* 브랜드 영역 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-sm shadow-sky-600/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">
                  스마트 도서관 도서 예약 시스템
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-100 text-sky-800">
                  GAS WebApp
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Google Apps Script HTML Service</p>
            </div>
          </div>

          {/* 모드 탭 전환 컨트롤 */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition ${
                activeTab === 'preview'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-4 h-4 text-sky-600" />
              <span>실시간 체험</span>
            </button>
            <button
              onClick={() => setActiveTab('code-html')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition ${
                activeTab === 'code-html'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCode2 className="w-4 h-4 text-emerald-600" />
              <span>Index.html 코드</span>
            </button>
            <button
              onClick={() => setActiveTab('code-gs')}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition ${
                activeTab === 'code-gs'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code2 className="w-4 h-4 text-indigo-600" />
              <span>Code.gs 백엔드</span>
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition ${
                activeTab === 'guide'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-600" />
              <span>배포 가이드</span>
            </button>
          </div>

        </div>
      </header>

      {/* ================= 메인 본문 콘텐츠 ================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* 1. 실시간 체험 탭 (Live WebApp Simulator) */}
        {activeTab === 'preview' && (
          <div className="space-y-6">
            
            {/* 상단 인트로 히어로 배너 */}
            <section className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-sky-500/10 blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 text-xs font-semibold bg-sky-500/20 text-sky-300 rounded-md mb-3 border border-sky-400/20">
                    <Sparkles className="w-3.5 h-3.5" />
                    Google Apps Script(GAS) 규격 Front-end
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                    도서관 도서 목록 및 실시간 예약
                  </h2>
                  <p className="text-sm sm:text-base text-slate-300">
                    대출 가능한 도서를 즉시 예약해 보세요. 대출중이거나 이미 예약된 도서는 안전하게 예약 버튼이 비활성화됩니다.
                  </p>
                </div>

                {/* 퀵 액션 */}
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    onClick={handleResetData}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/15 transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>데이터 초기화</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('code-html')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold bg-sky-500 hover:bg-sky-400 text-white rounded-lg shadow-sm transition"
                  >
                    <FileCode2 className="w-4 h-4" />
                    <span>Index.html 복사하기</span>
                  </button>
                </div>
              </div>
            </section>

            {/* 검색창 & 상태 필터 바 */}
            <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                
                {/* 실시간 검색창 */}
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="도서명, 저자, 도서 ID(예: BK-1001) 검색..."
                    className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* 상태 필터 탭 */}
                <div className="flex items-center bg-slate-100 p-1 rounded-lg gap-1 shrink-0 overflow-x-auto">
                  {(['ALL', '대출가능', '예약중', '대출중'] as const).map((status) => {
                    const isActive = statusFilter === status;
                    return (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                          isActive
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {status === 'ALL' ? '전체 보기' : status}
                      </button>
                    );
                  })}
                </div>

                {/* 새로고침 버튼 */}
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  title="새로고침"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-600' : 'text-slate-600'}`} />
                  <span className="hidden sm:inline">새로고침</span>
                </button>
              </div>

              {/* 하단 요약 카운터 */}
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 gap-2">
                <span>
                  전체 <strong className="text-slate-800 font-semibold">{books.length}권</strong> 중{' '}
                  <strong className="text-sky-700 font-semibold">{filteredBooks.length}권</strong> 표시 중
                </span>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    대출가능 (
                    {books.filter((b) => b.status === '대출가능').length}
                    )
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    예약중 (
                    {books.filter((b) => b.status === '예약중').length}
                    )
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    대출중 (
                    {books.filter((b) => b.status === '대출중').length}
                    )
                  </span>
                </div>
              </div>
            </section>

            {/* 도서 카드 그리드 */}
            {filteredBooks.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">검색 결과가 없습니다</h3>
                <p className="text-sm text-slate-500 mb-4">입력하신 검색어나 선택된 필터 조건에 일치하는 도서가 없습니다.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
                >
                  필터 초기화
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredBooks.map((book) => {
                  const isAvailable = book.status === '대출가능';
                  const isReserved = book.status === '예약중';

                  return (
                    <div
                      key={book.id}
                      className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        {/* 상단: 도서 ID 및 상태 배지 */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {book.id}
                          </span>

                          {/* 상태 배지 (요구사항 2) */}
                          {isAvailable ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              대출가능
                            </span>
                          ) : isReserved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              예약중
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              대출중
                            </span>
                          )}
                        </div>

                        {/* 도서 제목 */}
                        <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug line-clamp-2 mb-2">
                          {book.title}
                        </h3>

                        {/* 저자 및 카테고리 정보 */}
                        <div className="space-y-1 mb-5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium text-slate-700 truncate">{book.author}</span>
                          </div>
                          {book.category && (
                            <div className="text-[11px] text-slate-400 pl-5">
                              분류: {book.category}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 하단: 상태에 따른 버튼 제어 (요구사항 2) */}
                      <div className="pt-3 border-t border-slate-100">
                        {isAvailable ? (
                          <button
                            type="button"
                            onClick={() => handleOpenReserveModal(book)}
                            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs sm:text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.98] rounded-lg shadow-sm shadow-sky-600/20 transition focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                          >
                            <BookOpen className="w-4 h-4" />
                            <span>예약하기</span>
                          </button>
                        ) : isReserved ? (
                          <button
                            type="button"
                            disabled
                            className="w-full py-2.5 px-4 text-xs sm:text-sm font-medium text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed border border-slate-200/60 flex items-center justify-center gap-1.5"
                            title="이미 다른 사용자가 예약한 도서입니다."
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>예약 불가 (예약중)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="w-full py-2.5 px-4 text-xs sm:text-sm font-medium text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed border border-slate-200/60 flex items-center justify-center gap-1.5"
                            title="현재 대출 중인 도서입니다."
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>대출 불가 (대출중)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 최근 예약 내역 로그 (체험용 보조 패널) */}
            {reservations.length > 0 && (
              <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">최근 예약 접수 내역 (시뮬레이터 로그)</h3>
                  </div>
                  <span className="text-xs text-slate-400">Google 스프레드시트 기록 연동 확인용</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">신청 일시</th>
                        <th className="py-2 px-3">도서 ID</th>
                        <th className="py-2 px-3">도서명</th>
                        <th className="py-2 px-3">신청자</th>
                        <th className="py-2 px-3">이메일</th>
                        <th className="py-2 px-3">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reservations.map((res, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition">
                          <td className="py-2.5 px-3 font-mono text-slate-500">{res.timestamp}</td>
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-700">{res.bookId}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">{res.bookTitle}</td>
                          <td className="py-2.5 px-3">{res.userName}</td>
                          <td className="py-2.5 px-3 text-slate-500">{res.userEmail}</td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              예약접수
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

          </div>
        )}

        {/* 2. Index.html 코드 뷰어 탭 */}
        {activeTab === 'code-html' && (
          <div className="space-y-4">
            {/* 상단 컨트롤 바 */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <FileCode2 className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-base font-bold text-slate-900">GAS용 단일 파일 Front-end (Index.html)</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Tailwind CSS CDN + 반응형 카드 UI + 모달 + google.script.run 연동 로직이 모두 단일 HTML 파일에 포함되어 있습니다.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCopy(INDEX_HTML_CODE, 'index_html')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition active:scale-95"
                >
                  {copiedKey === 'index_html' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey === 'index_html' ? '복사 완료!' : '전체 코드 복사'}</span>
                </button>
                <button
                  onClick={() => handleDownload(INDEX_HTML_CODE, 'Index.html')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>다운로드</span>
                </button>
              </div>
            </div>

            {/* 코드 뷰어 본체 */}
            <div className="relative bg-slate-950 text-slate-200 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-400">
                <span className="font-mono">Index.html (Google Apps Script HTML Service)</span>
                <span>약 450 라인 · 단일 코드</span>
              </div>
              <pre className="p-4 sm:p-6 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed text-slate-300 max-h-[650px] select-all">
                <code>{INDEX_HTML_CODE}</code>
              </pre>
            </div>
          </div>
        )}

        {/* 3. Code.gs 백엔드 코드 뷰어 탭 */}
        {activeTab === 'code-gs' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">GAS 서버 백엔드 스크립트 (Code.gs)</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Google 스프레드시트와 연동되는 doGet(), getBookList(), reserveBook() 함수 및 LockService 동시성 제어가 내장되어 있습니다.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCopy(CODE_GS_CODE, 'code_gs')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition active:scale-95"
                >
                  {copiedKey === 'code_gs' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey === 'code_gs' ? '복사 완료!' : '전체 코드 복사'}</span>
                </button>
                <button
                  onClick={() => handleDownload(CODE_GS_CODE, 'Code.gs')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>다운로드</span>
                </button>
              </div>
            </div>

            <div className="relative bg-slate-950 text-slate-200 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-400">
                <span className="font-mono">Code.gs (Apps Script Backend)</span>
                <span>LockService 동시성 제어 포함</span>
              </div>
              <pre className="p-4 sm:p-6 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed text-slate-300 max-h-[650px] select-all">
                <code>{CODE_GS_CODE}</code>
              </pre>
            </div>
          </div>
        )}

        {/* 4. 배포 가이드 탭 */}
        {activeTab === 'guide' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Google Apps Script 3분 배포 가이드</h2>
                  <p className="text-xs text-slate-500">누구나 클릭 몇 번으로 나만의 도서관 예약 웹앱을 배포할 수 있습니다.</p>
                </div>
              </div>

              <div className="space-y-6 mt-6">
                
                {/* 1단계 */}
                <div className="flex gap-4 items-start">
                  <div className="w-7 h-7 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="space-y-2 flex-1">
                    <h3 className="text-base font-bold text-slate-900">Google 스프레드시트 생성 및 Apps Script 열기</h3>
                    <p className="text-sm text-slate-600">
                      Google 드라이브에서 새 <strong>Google 스프레드시트</strong>를 만듭니다.<br />
                      상단 메뉴에서 <strong>[확장 프로그램] → [Apps Script]</strong>를 클릭하여 개발 편집기를 엽니다.
                    </p>
                  </div>
                </div>

                {/* 2단계 */}
                <div className="flex gap-4 items-start">
                  <div className="w-7 h-7 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="space-y-2 flex-1">
                    <h3 className="text-base font-bold text-slate-900">Code.gs 파일 붙여넣기</h3>
                    <p className="text-sm text-slate-600">
                      편집기의 기존 <code>Code.gs</code> 내용을 지우고, 본 앱의 <strong>[Code.gs 백엔드]</strong> 탭에 있는 소스코드를 그대로 복사하여 붙여넣습니다.
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
                      💡 <code>Code.gs</code>의 <code>initSheetsIfEmpty()</code> 함수가 스프레드시트에 '도서목록'과 '예약내역' 시트 및 샘플 책 데이터를 자동으로 생성해 줍니다.
                    </div>
                  </div>
                </div>

                {/* 3단계 */}
                <div className="flex gap-4 items-start">
                  <div className="w-7 h-7 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="space-y-2 flex-1">
                    <h3 className="text-base font-bold text-slate-900">Index.html 파일 추가 및 붙여넣기</h3>
                    <p className="text-sm text-slate-600">
                      편집기 좌측의 <strong>[+]</strong> 아이콘을 클릭하고 <strong>[HTML]</strong>을 선택합니다.<br />
                      파일 이름을 <strong className="text-sky-700">Index</strong> (확장자 제외)로 입력한 뒤 생성합니다.<br />
                      생성된 파일에 <strong>[Index.html 코드]</strong> 탭의 전체 코드를 붙여넣고 저장(Ctrl + S)합니다.
                    </p>
                  </div>
                </div>

                {/* 4단계 */}
                <div className="flex gap-4 items-start">
                  <div className="w-7 h-7 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    4
                  </div>
                  <div className="space-y-2 flex-1">
                    <h3 className="text-base font-bold text-slate-900">웹 앱으로 배포하기</h3>
                    <p className="text-sm text-slate-600">
                      우측 상단 <strong>[배포] → [새 배포]</strong>를 클릭합니다.<br />
                      톱니바퀴 아이콘에서 <strong>[웹 앱]</strong>을 선택하고 아래와 같이 설정합니다:
                    </p>
                    <ul className="list-disc list-inside text-xs sm:text-sm text-slate-700 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <li><strong>설명</strong>: 도서관 예약 웹앱 v1.0</li>
                      <li><strong>다음 사용자로 실행</strong>: 나 (내 계정)</li>
                      <li><strong>액세스 권한이 있는 사용자</strong>: 모든 사용자 (Anyone)</li>
                    </ul>
                    <p className="text-sm text-slate-600 mt-2">
                      <strong>[배포]</strong> 버튼을 누르면 완성된 웹 앱 URL이 발급됩니다. 스마트폰이나 PC 브라우저에서 바로 접속할 수 있습니다!
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </main>

      {/* ================= 예약 모달 (Modal) ================= */}
      {isModalOpen && selectedBook && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* 배경 딤 */}
          <div
            onClick={() => !isSubmitting && setIsModalOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
          />

          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">도서 예약 신청</h3>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
                  title="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 모달 폼 바디 */}
              <form onSubmit={handleSubmitReservation} className="p-6 space-y-4">
                
                {/* 선택 도서 정보 요약 */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider mb-1">
                    BOOK ID: {selectedBook.id}
                  </div>
                  <h4 className="text-base font-bold text-slate-900 line-clamp-2">
                    {selectedBook.title}
                  </h4>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <span>저자:</span>
                    <span className="font-medium text-slate-700">{selectedBook.author}</span>
                  </div>
                </div>

                {/* 이름 입력 */}
                <div>
                  <label htmlFor="modal-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    신청자 이름 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="modal-name"
                      type="text"
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="예: 홍길동"
                      disabled={isSubmitting}
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                    />
                  </div>
                </div>

                {/* 이메일 입력 */}
                <div>
                  <label htmlFor="modal-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    이메일 주소 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="modal-email"
                      type="email"
                      required
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="예: user@example.com"
                      disabled={isSubmitting}
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">예약 완료 및 대출 승인 안내가 해당 이메일로 발송됩니다.</p>
                </div>

                {/* 유의사항 안내 */}
                <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 text-xs text-sky-800 leading-relaxed">
                  <span className="font-semibold">안내:</span> 예약 완료 후 도서관 운영일 기준 3일 이내에 미수령 시 자동 취소될 수 있습니다.
                </div>

                {/* 모달 버튼 액션 */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-lg shadow-sm shadow-sky-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>예약 처리 중...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>예약 확정하기</span>
                      </>
                    )}
                  </button>
                </div>

              </form>

            </div>
          </div>
        </div>
      )}

      {/* ================= 토스트 알림 컴포넌트 ================= */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full px-4 sm:px-0">
          <div
            className={`flex items-center gap-3 p-4 rounded-xl shadow-xl border text-sm text-white ${
              toast.type === 'success' ? 'bg-slate-900 border-slate-800' : 'bg-rose-900 border-rose-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
            )}
            <span className="flex-1 font-medium leading-tight">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-white/60 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= 푸터 ================= */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>스마트 도서관 도서 예약 시스템 · Google Apps Script (HTML Service) 호환</p>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Tailwind CSS</span>
            <span>·</span>
            <span>google.script.run 연동</span>
            <span>·</span>
            <span>반응형 카드 UI</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
