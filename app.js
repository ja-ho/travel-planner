/* =========================================================
   app.js — 에버랜드 여행 계획 정적 페이지
   ========================================================= */

// ─── 상수 ──────────────────────────────────────────────────

const TRAVEL_DATE = new Date('2026-04-28T00:00:00');

const TABS = [
  { id: 'input',     file: '_workspace/00_input.md',                emoji: '📝', label: '입력',        color: 'neutral' },
  { id: 'analysis',  file: '_workspace/01_destination_analysis.md', emoji: '🌷', label: '목적지 분석', color: 'pink'    },
  { id: 'itinerary', file: '_workspace/02_itinerary.md',            emoji: '📅', label: '일정표',      color: 'green'   },
  { id: 'budget',    file: '_workspace/04_budget.md',               emoji: '💰', label: '예산',        color: 'yellow'  },
  { id: 'guide',     file: '_workspace/05_local_guide.md',          emoji: '🗺️', label: '현지 가이드',  color: 'blue'    },
];

// 마크다운 fetch 결과 Promise 캐시 (중복 요청 방지)
const fetchCache = {};


// ─── D-Day 계산 ────────────────────────────────────────────

function getDDay() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const travel = new Date(TRAVEL_DATE);
  travel.setHours(0, 0, 0, 0);
  const diff = Math.round((travel - today) / 86_400_000);

  if (diff === 0) return { text: 'D-DAY 🎉', cls: 'dday-today' };
  if (diff > 0)   return { text: `D-${diff}`,            cls: 'dday-future' };
  return                  { text: `D+${Math.abs(diff)}`, cls: 'dday-past'   };
}


// ─── 마크다운 파싱 & 후처리 ────────────────────────────────
// DOMPurify.sanitize() 로 XSS 제거 후 table, 외부링크 처리

function parseMarkdown(md) {
  marked.setOptions({ gfm: true, breaks: false });
  const raw = marked.parse(md);

  // 테이블을 가로 스크롤 wrapper로 감싸고, 외부 링크에 target 부여
  const postProcessed = raw
    .replace(/<table>/g, '<div class="table-wrap"><table>')
    .replace(/<\/table>/g, '</table></div>')
    .replace(
      /<a\s+href="(https?:\/\/[^"]+)"/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer"'
    );

  // DOMPurify: 스크립트·이벤트 핸들러 제거, target/rel 속성은 허용
  return DOMPurify.sanitize(postProcessed, {
    ADD_ATTR: ['target', 'rel'],
    FORCE_BODY: true,
  });
}


// ─── 마크다운 fetch (Promise 캐싱) ─────────────────────────

function loadMarkdown(tab) {
  if (!fetchCache[tab.id]) {
    fetchCache[tab.id] = fetch(tab.file)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.text();
      })
      .then((text) => parseMarkdown(text));
  }
  return fetchCache[tab.id];
}


// ─── UI 빌더 (DOM 메서드로 안전하게 구성) ─────────────────

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

function buildErrorEl(tabId, detail) {
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
  const note = document.createElement('br');
  const noteText = document.createTextNode('file:// 프로토콜에서는 fetch가 차단됩니다.');
  hint.append(note, noteText);

  const detailEl = document.createElement('p');
  detailEl.className = 'error-detail';
  detailEl.textContent = detail;

  const btn = document.createElement('button');
  btn.className = 'retry-btn';
  btn.textContent = '다시 시도';
  btn.addEventListener('click', () => showTab(tabId, true));

  wrap.append(icon, title, hint, detailEl, btn);
  return wrap;
}

// ─── 모바일 테이블 향상 ────────────────────────────────────
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
  // sanitizedHtml은 parseMarkdown() 내부에서 DOMPurify를 통과한 안전한 문자열
  wrap.innerHTML = sanitizedHtml; // eslint-disable-line -- sanitized by DOMPurify
  enhanceTables(wrap);
  return wrap;
}


// ─── 패널 렌더링 ───────────────────────────────────────────

async function renderPanel(tab) {
  const panel = document.getElementById(`panel-${tab.id}`);

  // 이미 성공적으로 로드된 경우 재렌더 불필요
  if (panel.dataset.loaded === 'true') return;

  // 로딩 표시
  panel.replaceChildren(buildLoadingEl());

  try {
    const sanitizedHtml = await loadMarkdown(tab);
    panel.replaceChildren(buildMarkdownEl(sanitizedHtml));
    panel.dataset.loaded = 'true';
  } catch (err) {
    // 실패한 캐시 제거 → 재시도 시 새로 fetch
    delete fetchCache[tab.id];
    panel.replaceChildren(buildErrorEl(tab.id, err.message));
  }
}


// ─── 탭 전환 ───────────────────────────────────────────────

async function showTab(tabId, forceReload = false) {
  const tab = TABS.find((t) => t.id === tabId) ?? TABS[1];

  // 강제 리로드: 로드 완료 표시 초기화
  if (forceReload) {
    const panel = document.getElementById(`panel-${tab.id}`);
    delete panel.dataset.loaded;
  }

  // 탭 버튼 활성 상태 + ARIA
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    const isActive = btn.dataset.tab === tab.id;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  // 페이지 accent 컬러 (CSS 변수에 연결)
  document.documentElement.setAttribute('data-tab-color', tab.color);

  // 패널 전환
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
  const activePanel = document.getElementById(`panel-${tab.id}`);
  activePanel.classList.add('active');

  // URL hash 갱신 (히스토리에는 쌓지 않음)
  history.replaceState(null, '', `#${tab.id}`);

  // 렌더링
  await renderPanel(tab);

  // 모바일: 활성 탭 버튼을 화면 안으로 스크롤
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


// ─── 백그라운드 프리로드 ────────────────────────────────────

function preloadAll() {
  TABS.forEach((tab) => loadMarkdown(tab).catch(() => {}));
}


// ─── 초기화 ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // D-Day 배지
  const dday = getDDay();
  const badge = document.getElementById('dday-badge');
  if (badge) {
    badge.textContent = dday.text;
    badge.className = `dday-badge ${dday.cls}`;
  }

  // 탭 클릭 핸들러
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });

  // 브라우저 뒤로가기·앞으로가기
  window.addEventListener('popstate', () => {
    const id = location.hash.replace('#', '');
    const tab = TABS.find((t) => t.id === id);
    if (tab) showTab(tab.id);
  });

  // 기능 초기화
  initScrollProgress();
  initBackToTop();
  initStickyNav();

  // 초기 탭: URL hash → 없으면 'analysis' 기본
  const hashId = location.hash.replace('#', '');
  const initialTab = TABS.find((t) => t.id === hashId) ?? TABS[1];
  showTab(initialTab.id);

  // 나머지 탭 백그라운드 프리로드
  preloadAll();
});
