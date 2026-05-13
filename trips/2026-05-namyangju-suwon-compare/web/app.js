/* =========================================================
   app.js — 남양주·수원 통합 비교 뷰어
   2-level 탭: [남양주/수원/비교] × [목적지/일정/가이드]
   ========================================================= */

// ─── 상수 ──────────────────────────────────────────────────

const TRAVEL_DATE = new Date('2026-05-16T00:00:00');

// 상위 탭 (여행지 + 비교)
const TRIPS = {
  namyangju: {
    label:    '남양주',
    color:    'green',
    basePath: '../../2026-05-namyangju/',
    kind:     'markdown',
  },
  suwon: {
    label:    '수원',
    color:    'pink',
    basePath: '../../2026-05-suwon/',
    kind:     'markdown',
  },
  compare: {
    label: '비교',
    color: 'blue',
    kind:  'static',
  },
};

// 서브탭 (남양주/수원 내부에서 사용)
const SUBTABS = [
  { id: 'destination', file: '01_destination_analysis.md', emoji: '🌷', label: '목적지' },
  { id: 'itinerary',   file: '02_itinerary.md',            emoji: '📅', label: '일정' },
  { id: 'guide',       file: '05_local_guide.md',          emoji: '🗺️', label: '현지 가이드' },
];

const DEFAULT_TRIP    = 'namyangju';
const DEFAULT_SUBTAB  = 'itinerary';

// 마크다운 fetch Promise 캐시: key = `${tripId}/${subId}`
const fetchCache = {};


// ─── D-Day 계산 ────────────────────────────────────────────

function getDDay() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const travel = new Date(TRAVEL_DATE);
  travel.setHours(0, 0, 0, 0);
  const diff = Math.round((travel - today) / 86_400_000);

  if (diff === 0) return { text: 'D-DAY 🎉',           cls: 'dday-today' };
  if (diff > 0)   return { text: `D-${diff}`,           cls: 'dday-future' };
  return                  { text: `D+${Math.abs(diff)}`, cls: 'dday-past' };
}


// ─── 마크다운 파싱 & 후처리 ────────────────────────────────

function parseMarkdown(md) {
  marked.setOptions({ gfm: true, breaks: false });
  const raw = marked.parse(md);

  const postProcessed = raw
    .replace(/<table>/g, '<div class="table-wrap"><table>')
    .replace(/<\/table>/g, '</table></div>')
    .replace(
      /<a\s+href="(https?:\/\/[^"]+)"/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer"'
    );

  return DOMPurify.sanitize(postProcessed, {
    ADD_ATTR: ['target', 'rel'],
    FORCE_BODY: true,
  });
}


// ─── 마크다운 fetch (Promise 캐싱) ─────────────────────────

function loadMarkdown(tripId, subId) {
  const cacheKey = `${tripId}/${subId}`;
  if (!fetchCache[cacheKey]) {
    const trip = TRIPS[tripId];
    const sub  = SUBTABS.find((s) => s.id === subId);
    const url  = trip.basePath + sub.file;

    fetchCache[cacheKey] = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.text();
      })
      .then((text) => parseMarkdown(text));
  }
  return fetchCache[cacheKey];
}


// ─── UI 빌더 ──────────────────────────────────────────────

function buildLoadingEl() {
  const wrap = document.createElement('div');
  wrap.className = 'loading';
  const spinner = document.createElement('span');
  spinner.className = 'loading-spinner';
  const text = document.createElement('span');
  text.textContent = '불러오는 중…';
  wrap.append(spinner, text);
  return wrap;
}

function buildErrorEl(tripId, subId, detail) {
  const wrap = document.createElement('div');
  wrap.className = 'error-box';

  const icon = document.createElement('span');
  icon.className = 'error-icon';
  icon.textContent = '😅';

  const title = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = '콘텐츠를 불러오지 못했어요';
  title.appendChild(strong);

  const hint = document.createElement('p');
  const code = document.createElement('code');
  code.textContent = 'python3 -m http.server';
  hint.append('로컬에서는 ', code, ' 로 열어주세요.');
  hint.append(document.createElement('br'),
              document.createTextNode('file:// 프로토콜에서는 fetch가 차단됩니다.'));

  const detailEl = document.createElement('p');
  detailEl.className = 'error-detail';
  detailEl.textContent = detail;

  const btn = document.createElement('button');
  btn.className = 'retry-btn';
  btn.textContent = '다시 시도';
  btn.addEventListener('click', () => {
    const key = `${tripId}/${subId}`;
    delete fetchCache[key];
    renderMarkdownPanel(tripId, subId);
  });

  wrap.append(icon, title, hint, detailEl, btn);
  return wrap;
}


// ─── 모바일 테이블 향상 (6+ 컬럼 → 카드) ───────────────────

function enhanceTables(container) {
  container.querySelectorAll('.table-wrap').forEach((wrap) => {
    const table = wrap.querySelector('table');
    if (!table) return;

    const headerCells = table.querySelectorAll('thead tr:first-child th, tr:first-child th');
    if (headerCells.length >= 6) {
      wrap.classList.add('table-wide');
      wrap.insertAdjacentElement('afterend', buildWideTableCards(table, headerCells));
    }
  });
}

function buildWideTableCards(table, headerCells) {
  const headers = Array.from(headerCells).map((th) => th.textContent.trim());
  const cardContainer = document.createElement('div');
  cardContainer.className = 'table-wide-cards';

  table.querySelectorAll('tbody tr').forEach((row) => {
    const cells = row.querySelectorAll('td');
    if (!cells.length) return;

    const card = document.createElement('div');
    card.className = 'table-card';

    const cardHeader = document.createElement('div');
    cardHeader.className = 'table-card-header';
    cells[0].childNodes.forEach((node) => cardHeader.appendChild(node.cloneNode(true)));
    card.appendChild(cardHeader);

    const list = document.createElement('dl');
    list.className = 'table-card-body';
    for (let i = 1; i < cells.length && i < headers.length; i++) {
      const dt = document.createElement('dt');
      dt.textContent = headers[i];
      const dd = document.createElement('dd');
      cells[i].childNodes.forEach((node) => dd.appendChild(node.cloneNode(true)));
      list.append(dt, dd);
    }
    card.appendChild(list);
    cardContainer.appendChild(card);
  });

  return cardContainer;
}


function buildMarkdownEl(sanitizedHtml) {
  const wrap = document.createElement('div');
  wrap.className = 'markdown-body';
  wrap.innerHTML = sanitizedHtml; // sanitized by DOMPurify
  enhanceTables(wrap);
  return wrap;
}


// ─── 패널 렌더링 ───────────────────────────────────────────

async function renderMarkdownPanel(tripId, subId) {
  const panel = document.getElementById('panel-markdown');
  panel.replaceChildren(buildLoadingEl());

  try {
    const sanitizedHtml = await loadMarkdown(tripId, subId);
    panel.replaceChildren(buildMarkdownEl(sanitizedHtml));
  } catch (err) {
    delete fetchCache[`${tripId}/${subId}`];
    panel.replaceChildren(buildErrorEl(tripId, subId, err.message));
  }
}


// ─── 상태 (현재 trip/subtab) ───────────────────────────────

let currentTrip   = DEFAULT_TRIP;
let currentSubtab = DEFAULT_SUBTAB;


// ─── 탭 전환 ───────────────────────────────────────────────

function showTrip(tripId, subId = null) {
  const trip = TRIPS[tripId] ?? TRIPS[DEFAULT_TRIP];
  const isCompare = trip.kind === 'static';

  currentTrip = tripId;

  // 상위 탭 활성화
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    const active = btn.dataset.tab === tripId;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  // accent 컬러 변경
  document.documentElement.setAttribute('data-tab-color', trip.color);

  // 비교 탭 처리
  const subtabNav    = document.getElementById('subtab-nav');
  const markdownPanel = document.getElementById('panel-markdown');
  const comparePanel  = document.getElementById('panel-compare');

  if (isCompare) {
    subtabNav.hidden = true;
    markdownPanel.classList.remove('active');
    comparePanel.classList.add('active');
    updateUrlHash('compare');
    scrollActiveTabIntoView();
    return;
  }

  // 마크다운 탭 처리
  subtabNav.hidden = false;
  comparePanel.classList.remove('active');
  markdownPanel.classList.add('active');

  // 서브탭: 인자 우선, 없으면 기존 유지, 그래도 없으면 기본
  const targetSub = subId
    ?? (SUBTABS.find((s) => s.id === currentSubtab) ? currentSubtab : DEFAULT_SUBTAB);
  showSubtab(targetSub, { skipUrl: true });

  updateUrlHash(`${tripId}/${currentSubtab}`);
  scrollActiveTabIntoView();
}

function showSubtab(subId, { skipUrl = false } = {}) {
  const sub = SUBTABS.find((s) => s.id === subId) ?? SUBTABS[0];
  currentSubtab = sub.id;

  document.querySelectorAll('.subtab-btn').forEach((btn) => {
    const active = btn.dataset.subtab === sub.id;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  renderMarkdownPanel(currentTrip, sub.id);

  if (!skipUrl) updateUrlHash(`${currentTrip}/${sub.id}`);
}


function updateUrlHash(value) {
  // history.replaceState로 히스토리 누적 방지
  history.replaceState(null, '', `#${value}`);
}

function scrollActiveTabIntoView() {
  document.querySelector('.tab-btn.active')
    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}


// ─── 스크롤 진행 바 ────────────────────────────────────────

function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  const update = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = scrollable > 0
      ? `${(window.scrollY / scrollable) * 100}%`
      : '0%';
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}


// ─── 맨 위로 버튼 ──────────────────────────────────────────

function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  window.addEventListener(
    'scroll',
    () => btn.classList.toggle('visible', window.scrollY > 200),
    { passive: true }
  );
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}


// ─── 탭 네비 스티키 그림자 ─────────────────────────────────

function initStickyNav() {
  const nav = document.getElementById('tab-nav');
  const header = document.querySelector('.site-header');
  if (!nav || !header) return;

  const io = new IntersectionObserver(
    ([entry]) => nav.classList.toggle('stuck', entry.intersectionRatio < 1),
    { threshold: [1], rootMargin: '-1px 0px 0px 0px' }
  );
  io.observe(header);
}


// ─── 백그라운드 프리로드 ───────────────────────────────────

function preloadAll() {
  Object.entries(TRIPS).forEach(([tripId, trip]) => {
    if (trip.kind !== 'markdown') return;
    SUBTABS.forEach((sub) => loadMarkdown(tripId, sub.id).catch(() => {}));
  });
}


// ─── URL hash 파싱 ────────────────────────────────────────

function parseHash() {
  const raw = location.hash.replace(/^#/, '');
  if (!raw) return null;

  if (raw === 'compare') return { trip: 'compare', sub: null };

  const [trip, sub] = raw.split('/');
  if (TRIPS[trip] && TRIPS[trip].kind === 'markdown') {
    const validSub = SUBTABS.find((s) => s.id === sub);
    return { trip, sub: validSub ? sub : DEFAULT_SUBTAB };
  }
  return null;
}


// ─── 초기화 ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // D-Day
  const dday = getDDay();
  const badge = document.getElementById('dday-badge');
  if (badge) {
    badge.textContent = dday.text;
    badge.className = `dday-badge ${dday.cls}`;
  }

  // 상위 탭 클릭
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => showTrip(btn.dataset.tab));
  });

  // 서브탭 클릭
  document.querySelectorAll('.subtab-btn').forEach((btn) => {
    btn.addEventListener('click', () => showSubtab(btn.dataset.subtab));
  });

  // 브라우저 뒤로/앞으로
  window.addEventListener('popstate', () => {
    const parsed = parseHash();
    if (parsed) showTrip(parsed.trip, parsed.sub);
  });

  // 기능 초기화
  initScrollProgress();
  initBackToTop();
  initStickyNav();

  // 초기 라우팅: hash → 기본값
  const parsed = parseHash();
  if (parsed) {
    showTrip(parsed.trip, parsed.sub);
  } else {
    showTrip(DEFAULT_TRIP, DEFAULT_SUBTAB);
  }

  // 백그라운드 프리로드
  preloadAll();
});
