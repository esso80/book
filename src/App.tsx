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
  FileSpreadsheet,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Database,
  Table,
  Wifi,
  WifiOff
} from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  status: '대출가능' | '예약중' | '대출중';
  category: string;
}

interface ReservationLog {
  timestamp: string;
  bookId: string;
  bookTitle: string;
  userName: string;
  userEmail: string;
}

// 사용자 Google Apps Script 배포 URL
const GAS_DEPLOY_URL = 'https://script.google.com/macros/s/AKfycbwxf6loG03-kFhNNX_GuBnnEE_8AtIUS-kXYHkYMdwr6bFMapCxflOBkCK75myEr_-uLA/exec';

export default function App() {
  const [activeTab, setActiveTab] = useState<'app' | 'database'>('app');
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnectedToGAS, setIsConnectedToGAS] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

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

  // 최근 예약 이력 로그
  const [reservations, setReservations] = useState<ReservationLog[]>([]);

  const showToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToast({ id, type, message });
    setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur));
    }, 4000);
  };

  /**
   * 실제 Google Apps Script (구글 스프레드시트) API에서 실시간 도서 목록 조회
   */
  const loadBooksFromGoogleSheet = async (showRefreshToast = false) => {
    if (showRefreshToast) setIsRefreshing(true);
    setFetchError(null);

    try {
      const response = await fetch(`${GAS_DEPLOY_URL}?action=getBooks`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: 서버 응답 오류`);
      }

      const resJson = await response.json();

      if (resJson && resJson.success && Array.isArray(resJson.data)) {
        setBooks(resJson.data);
        setIsConnectedToGAS(true);
        if (showRefreshToast) {
          showToast('success', `구글 시트에서 최신 도서 목록(${resJson.data.length}권)을 불러왔습니다.`);
        }
      } else {
        throw new Error(resJson.message || '데이터 형식 오류');
      }
    } catch (err: any) {
      console.warn('GAS API 호출 실패, 상세 에러:', err);
      setFetchError(err.message || '구글 시트 연동 실패');
      setIsConnectedToGAS(false);

      if (showRefreshToast) {
        showToast('error', '구글 시트 연결 실패. 재시도해 주세요.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // 페이지 마운트 시 실시간 구글 시트 도서 목록 로드
  useEffect(() => {
    loadBooksFromGoogleSheet(false);
  }, []);

  const handleOpenReserveModal = (book: Book) => {
    setSelectedBook(book);
    setUserName('');
    setUserEmail('');
    setIsModalOpen(true);
  };

  /**
   * 예약 제출 처리: 실제 Google Apps Script API를 호출하여 시트에 기록 및 상태 변경
   */
  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook || isSubmitting) return;

    if (!userName.trim() || !userEmail.trim()) {
      showToast('error', '이름과 이메일을 입력해 주세요.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(userEmail.trim())) {
      showToast('error', '유효한 이메일 형식을 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Google Apps Script `reserve` 엔드포인트 호출
      const reserveUrl = `${GAS_DEPLOY_URL}?action=reserve&bookId=${encodeURIComponent(
        selectedBook.id
      )}&userName=${encodeURIComponent(userName.trim())}&userEmail=${encodeURIComponent(
        userEmail.trim()
      )}`;

      const res = await fetch(reserveUrl, { method: 'GET' });
      const result = await res.json();

      if (result && result.success) {
        // 예약 성공 로그 추가
        const now = new Date();
        const formattedTime =
          now.getFullYear() + '-' +
          String(now.getMonth() + 1).padStart(2, '0') + '-' +
          String(now.getDate()).padStart(2, '0') + ' ' +
          String(now.getHours()).padStart(2, '0') + ':' +
          String(now.getMinutes()).padStart(2, '0') + ':' +
          String(now.getSeconds()).padStart(2, '0');

        const newLog: ReservationLog = {
          timestamp: formattedTime,
          bookId: selectedBook.id,
          bookTitle: selectedBook.title,
          userName: userName.trim(),
          userEmail: userEmail.trim()
        };
        setReservations((prev) => [newLog, ...prev]);

        setIsModalOpen(false);
        showToast('success', result.message || `'${selectedBook.title}' 예약이 구글 시트에 정상 반영되었습니다!`);

        // 구글 시트 도서 목록 재조회 (상태 실시간 동기화)
        await loadBooksFromGoogleSheet(false);
      } else {
        throw new Error(result.message || '예약 처리에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('예약 처리 중 오류:', err);
      showToast('error', err.message || '예약 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* ================= 상단 네비게이션 헤더 ================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-sm shadow-sky-600/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">
                  스마트 도서관 도서 예약 시스템
                </h1>
                {isConnectedToGAS ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <Wifi className="w-3 h-3 text-emerald-600" />
                    구글 시트 실시간 연동됨
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    <WifiOff className="w-3 h-3 text-amber-600" />
                    연결 확인 중
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">Google Apps Script Google Sheets 실시간 동기화</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setActiveTab('app')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition ${
                  activeTab === 'app'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4 text-sky-600" />
                <span>도서 예약 포털</span>
              </button>
              <button
                onClick={() => setActiveTab('database')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition ${
                  activeTab === 'database'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Database className="w-4 h-4 text-emerald-600" />
                <span>구글 시트 DB 구조</span>
              </button>
            </div>

            <a
              href={GAS_DEPLOY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              title="배포된 구글 앱스 스크립트 웹앱 열기"
            >
              <span>배포 웹앱 바로가기</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </a>
          </div>

        </div>
      </header>

      {/* ================= 메인 본문 ================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* 탭 1: 도서 예약 포털 */}
        {activeTab === 'app' && (
          <div className="space-y-6">
            
            {/* 상단 배너 */}
            <section className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-sky-500/10 blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-300 rounded-md mb-3 border border-emerald-400/20">
                    <Sparkles className="w-3.5 h-3.5" />
                    구글 시트 실시간 연동 (보유 도서 {books.length}권)
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                    원하는 도서를 온라인으로 즉시 예약하세요
                  </h2>
                  <p className="text-sm sm:text-base text-slate-300">
                    현재 구글 시트의 <strong>‘도서목록’</strong>에 등록된 실제 도서 데이터와 실시간 연동 중입니다.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => loadBooksFromGoogleSheet(true)}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg shadow-sm transition active:scale-95"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>시트 데이터 새로고침</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('database')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/15 transition"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>시트 구조 확인</span>
                  </button>
                </div>
              </div>
            </section>

            {/* 검색 및 필터 컨트롤 바 */}
            <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                
                {/* 검색창 */}
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="도서명, 저자, 도서 ID로 실시간 검색..."
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
                        {status === 'ALL' ? '전체' : status}
                      </button>
                    );
                  })}
                </div>

                {/* 새로고침 */}
                <button
                  onClick={() => loadBooksFromGoogleSheet(true)}
                  disabled={isRefreshing}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  title="구글 시트 데이터 다시 불러오기"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-600' : 'text-slate-600'}`} />
                  <span className="hidden sm:inline">새로고침</span>
                </button>
              </div>

              {/* 하단 요약 정보 */}
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 gap-2">
                <span>
                  구글 시트 도서 총 <strong className="text-slate-800 font-semibold">{books.length}권</strong> 중{' '}
                  <strong className="text-sky-700 font-semibold">{filteredBooks.length}권</strong> 표시 중
                </span>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    대출가능 ({books.filter((b) => b.status === '대출가능').length})
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    예약중 ({books.filter((b) => b.status === '예약중').length})
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    대출중 ({books.filter((b) => b.status === '대출중').length})
                  </span>
                </div>
              </div>
            </section>

            {/* 로딩 인디케이터 */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                    <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                    <div className="h-10 bg-slate-100 rounded-lg mt-4"></div>
                  </div>
                ))}
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">검색 결과가 없습니다</h3>
                <p className="text-sm text-slate-500 mb-4">입력하신 검색어나 필터 조건에 일치하는 도서가 없습니다.</p>
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
                        {/* 도서 ID 및 상태 배지 */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {book.id}
                          </span>

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
                        <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug line-clamp-2 mb-2" title={book.title}>
                          {book.title}
                        </h3>

                        {/* 저자 및 카테고리 */}
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

                      {/* 상태별 예약 버튼 제어 */}
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
                            title="현재 다른 이용자가 예약 중인 도서입니다."
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

            {/* 실시간 시트 예약 로그 내역 */}
            {reservations.length > 0 && (
              <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">구글 시트 '예약내역' 실시간 기록</h3>
                  </div>
                  <span className="text-xs text-slate-400">구글 스프레드시트에 자동 추가된 내역입니다.</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">신청일시</th>
                        <th className="py-2.5 px-3">도서ID</th>
                        <th className="py-2.5 px-3">도서명</th>
                        <th className="py-2.5 px-3">신청자명</th>
                        <th className="py-2.5 px-3">신청자이메일</th>
                        <th className="py-2.5 px-3">처리상태</th>
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

        {/* 탭 2: 구글 시트 DB 구조 안내 */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            
            {/* 상단 연동 정보 카드 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">구글 스프레드시트 데이터베이스 구조</h2>
                    <p className="text-xs text-slate-500 mt-0.5">실제 연동 중인 구글 시트 테이블 명세입니다.</p>
                  </div>
                </div>

                <a
                  href={GAS_DEPLOY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-sm transition"
                >
                  <span>배포된 웹앱 열기</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* 연동 URL 안내 */}
              <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-slate-600 truncate">
                  <span className="font-semibold text-slate-800 shrink-0">배포 URL:</span>
                  <span className="font-mono text-slate-600 truncate">{GAS_DEPLOY_URL}</span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 shrink-0">
                  {isConnectedToGAS ? '실시간 연동 성공' : '연결 중'}
                </span>
              </div>
            </div>

            {/* 시트 1: 도서목록 구조 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-3">
                <Table className="w-5 h-5 text-sky-600" />
                <h3 className="text-base font-bold text-slate-900">1. '도서목록' 시트 (도서 마스터 테이블)</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                보유 도서 정보와 현재 대출/예약 상태를 관리합니다. 사용자가 예약 시 <strong>대출상태(D열)</strong>가 실시간으로 <code>예약중</code>으로 변경됩니다.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-sky-600 text-white font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">열(Column)</th>
                      <th className="py-2.5 px-3">헤더명</th>
                      <th className="py-2.5 px-3">데이터 타입</th>
                      <th className="py-2.5 px-3">설명 및 허용값</th>
                      <th className="py-2.5 px-3">예시</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-semibold text-sky-700">A열</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">도서ID</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">String (PK)</td>
                      <td className="py-2.5 px-3">도서 고유 식별자 (중복 불가)</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">BK-1001</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-semibold text-sky-700">B열</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">도서명</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">String</td>
                      <td className="py-2.5 px-3">도서의 공식 제목</td>
                      <td className="py-2.5 px-3 text-slate-600">클린 코드</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-semibold text-sky-700">C열</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">저자</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">String</td>
                      <td className="py-2.5 px-3">저자 또는 편역자</td>
                      <td className="py-2.5 px-3 text-slate-600">로버트 C. 마틴</td>
                    </tr>
                    <tr className="bg-amber-50/50">
                      <td className="py-2.5 px-3 font-mono font-semibold text-amber-700">D열</td>
                      <td className="py-2.5 px-3 font-bold text-amber-900">대출상태</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">Enum (String)</td>
                      <td className="py-2.5 px-3 font-medium text-amber-900">
                        <code>대출가능</code> | <code>예약중</code> | <code>대출중</code>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-amber-800">대출가능</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-semibold text-sky-700">E열</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">분류</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">String</td>
                      <td className="py-2.5 px-3">도서 분류 카테고리</td>
                      <td className="py-2.5 px-3 text-slate-600">프로그래밍</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 시트 2: 예약내역 구조 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-3">
                <Table className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">2. '예약내역' 시트 (예약 트랜잭션 로그)</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                웹앱에서 [예약하기] 제출 시 자동으로 새 행으로 누적 기록됩니다.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-800 text-white font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">열(Column)</th>
                      <th className="py-2.5 px-3">헤더명</th>
                      <th className="py-2.5 px-3">데이터 타입</th>
                      <th className="py-2.5 px-3">설명</th>
                      <th className="py-2.5 px-3">예시</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-semibold text-indigo-700">A열</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">신청일시</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">DateTime</td>
                      <td className="py-2.5 px-3">예약 신청 시간 (yyyy-MM-dd HH:mm:ss)</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">2026-10-09 18:30:00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-semibold text-indigo-700">B열</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">도서ID</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">String (FK)</td>
                      <td className="py-2.5 px-3">예약한 도서 식별자</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">BK-1001</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-semibold text-indigo-700">C열</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">도서명</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">String</td>
                      <td className="py-2.5 px-3">예약 당시의 도서명</td>
                      <td className="py-2.5 px-3 text-slate-600">클린 코드</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-semibold text-indigo-700">D열</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">신청자명</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">String</td>
                      <td className="py-2.5 px-3">사용자가 모달에 입력한 성명</td>
                      <td className="py-2.5 px-3 text-slate-600">홍길동</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-semibold text-indigo-700">E열</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">신청자이메일</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">Email</td>
                      <td className="py-2.5 px-3">안내 수신용 이메일 주소</td>
                      <td className="py-2.5 px-3 text-slate-600">hong@example.com</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-semibold text-indigo-700">F열</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">처리상태</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">String</td>
                      <td className="py-2.5 px-3">기본값 <code>예약접수</code></td>
                      <td className="py-2.5 px-3 text-slate-600">예약접수</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* ================= 예약 모달 ================= */}
      {isModalOpen && selectedBook && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            onClick={() => !isSubmitting && setIsModalOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
          />

          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
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

              <form onSubmit={handleSubmitReservation} className="p-6 space-y-4">
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

                <div>
                  <label htmlFor="user-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    신청자 이름 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="user-name"
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

                <div>
                  <label htmlFor="user-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    이메일 주소 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="user-email"
                      type="email"
                      required
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="예: user@example.com"
                      disabled={isSubmitting}
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">예약 완료 안내가 해당 이메일로 전송됩니다.</p>
                </div>

                <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 text-xs text-sky-800 leading-relaxed">
                  <span className="font-semibold">안내:</span> 예약 완료 후 구글 스프레드시트에 실시간으로 기록되며 대출상태가 '예약중'으로 변경됩니다.
                </div>

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
                        <span>구글 시트에 기록 중...</span>
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

      {/* ================= 토스트 알림 ================= */}
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

      {/* 푸터 */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>스마트 도서관 도서 예약 시스템 · Google Sheets 실시간 API 연동</p>
          <div className="flex items-center gap-4 text-slate-500">
            <span>실시간 4권 도서 동기화</span>
            <span>·</span>
            <span>예약시 시트 자동 갱신</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
