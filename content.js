'use strict';

const PAGE = Object.freeze({
    NONE: 0,
    LIKES: 1,
    USER_LIKES: 2,
    PLAYLIST: 3,
    DISCOVER: 4,
});

const SCROLL_TICK_MS = 350;
const QUEUE_SETTLE_MS = 2_000;

const state = {
    phase: 'idle',
    scrollTimer: 0,
    settleTimer: 0,
    abortCtrl: null,
    queueEl: null,
    scrollEl: null,
    heightEl: null,
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function clickEl(el) {
    if (el) { el.click(); return true; }
    return false;
}

function waitFor(selector, timeout = 2000, signal = null) {
    return new Promise((resolve, reject) => {
        const el = $(selector);
        if (el) return resolve(el);
        const deadline = performance.now() + timeout;
        function poll() {
            if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
            const el = $(selector);
            if (el) return resolve(el);
            if (performance.now() > deadline) return reject(new Error(`Timeout: ${selector}`));
            requestAnimationFrame(poll);
        }
        requestAnimationFrame(poll);
    });
}

function sleep(ms, signal = null) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
        const id = setTimeout(resolve, ms);
        signal?.addEventListener('abort', () => {
            clearTimeout(id);
            reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
    });
}

function fisherYatesShuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getPageType() {
    const p = location.pathname;
    if (p.includes('/discover/sets/')) return PAGE.DISCOVER;
    if (p.includes('/you/likes'))      return PAGE.LIKES;
    if (p.includes('/likes'))          return PAGE.USER_LIKES;
    if (p.includes('/sets/'))          return PAGE.PLAYLIST;
    return PAGE.NONE;
}

function getTrackListSelector(type) {
    switch (type) {
        case PAGE.LIKES:
        case PAGE.USER_LIKES: return '.lazyLoadingList__list';
        case PAGE.PLAYLIST:   return '.trackList__list';
        case PAGE.DISCOVER:   return '.systemPlaylistTrackList__list';
        default:              return null;
    }
}

function isQueueOpen() {
    const q = $('.queue');
    return q ? q.classList.contains('m-visible') : false;
}

function setQueueOpen(shouldOpen) {
    if (isQueueOpen() !== shouldOpen) {
        clickEl($('.playbackSoundBadge__queueCircle'));
    }
}

function cancelScrollPhase() {
    if (state.scrollTimer) { clearTimeout(state.scrollTimer); state.scrollTimer = 0; }
    if (state.settleTimer) { clearTimeout(state.settleTimer); state.settleTimer = 0; }
    if (state.abortCtrl) { state.abortCtrl.abort(); state.abortCtrl = null; }
    state.phase = 'idle';
    state.queueEl = null;
    state.scrollEl = null;
    state.heightEl = null;
    if (typeof updateInPageButton === 'function') updateInPageButton();
}

function scheduleScrollTick() {
    if (state.phase !== 'loading') return;
    state.scrollTimer = setTimeout(() => {
        state.scrollTimer = 0;
        onScrollTick();
    }, SCROLL_TICK_MS);
}

function onScrollTick() {
    if (state.phase !== 'loading') return;
    if (!state.queueEl) state.queueEl = $('.queue');
    if (!state.queueEl) { scheduleScrollTick(); return; }
    if (!state.queueEl.classList.contains('m-visible')) {
        setQueueOpen(true);
        scheduleScrollTick();
        return;
    }
    if (!state.scrollEl) state.scrollEl = $('.queue__scrollableInner');
    if (!state.heightEl) state.heightEl = $('.queue__itemsHeight');
    if (state.scrollEl && state.heightEl) {
        const height = parseInt(state.heightEl.style.height, 10) || 0;
        state.scrollEl.scrollTop = height;
    }
    if ($('.queue__fallback')) {
        clearTimeout(state.scrollTimer);
        state.scrollTimer = 0;
        performShuffle();
    } else {
        scheduleScrollTick();
    }
}

function performShuffle() {
    const queueList = $('.queue__itemsList');
    if (queueList) {
        const items = $$('.queueItemView', queueList);
        if (items.length > 1) {
            fisherYatesShuffle(items);
            const frag = document.createDocumentFragment();
            for (const item of items) frag.appendChild(item);
            queueList.appendChild(frag);
        }
    }
    state.phase = 'playing';
    const shuffleBtn = $('.shuffleControl');
    if (shuffleBtn) {
        if (shuffleBtn.classList.contains('m-shuffling')) shuffleBtn.click();
        shuffleBtn.click();
    }
    clickEl($('.skipControl__next'));
    setQueueOpen(false);
    const playCtrl = $('.playControl');
    if (playCtrl) playCtrl.focus();
    if (typeof updateInPageButton === 'function') updateInPageButton();
}

async function onShuffleClick() {
    if (state.phase === 'loading') {
        cancelScrollPhase();
        return;
    }
    const type = getPageType();
    const listSel = getTrackListSelector(type);
    const trackList = listSel ? $(listSel) : null;
    if (!trackList || trackList.childElementCount < 2) {
        state.phase = 'idle';
        if (typeof updateInPageButton === 'function') updateInPageButton();
        return;
    }
    state.phase = 'loading';
    if (typeof updateInPageButton === 'function') updateInPageButton();
    state.abortCtrl = new AbortController();
    const signal = state.abortCtrl.signal;

    // Safety timeout: cancel after 60s to prevent infinite loading
    const safetyTimer = setTimeout(() => {
        if (state.phase === 'loading') cancelScrollPhase();
    }, 60_000);

    const children = trackList.children;
    try {
        clickEl($('.playButton', children[1]));
        await sleep(200, signal);
        clickEl($('.playButton', children[0]));
        await sleep(400, signal);
        const playCtrl = $('.playControl');
        if (playCtrl?.classList.contains('playing')) playCtrl.click();
        const moreBtn = $('.sc-button-more', trackList);
        if (moreBtn) {
            moreBtn.click();
            try {
                const addBtn = await waitFor('.moreActions__button.addToNextUp', 1500, signal);
                addBtn.click();
            } catch (e) { if (e.name === 'AbortError') throw e; }
        }
        setQueueOpen(true);
        await sleep(QUEUE_SETTLE_MS, signal);
        scheduleScrollTick();
    } catch (e) {
        clearTimeout(safetyTimer);
        if (e.name === 'AbortError') return;
        cancelScrollPhase();
    }
}

// ─── Page-context volume helpers (accesses window.__scMedia set by capture.js) ───

function execInPage(code) {
    const s = document.createElement('script');
    s.textContent = code;
    document.documentElement.appendChild(s);
    s.remove();
}

function readFromPage(code) {
    const id = '__sc_probe_' + Date.now();
    const el = document.createElement('div');
    el.id = id;
    el.style.display = 'none';
    document.documentElement.appendChild(el);
    execInPage(`(function(){var e=document.getElementById('${id}');${code}})();`);
    const data = { ...el.dataset };
    el.remove();
    return data;
}

function getProgressInfo() {
    const d = readFromPage(`
        var m = window.__scMedia;
        if(m && m.duration){
            e.dataset.cur = m.currentTime.toFixed(2);
            e.dataset.dur = m.duration.toFixed(2);
        } else {
            e.dataset.cur = '0';
            e.dataset.dur = '0';
        }
    `);
    return {
        currentTime: parseFloat(d.cur) || 0,
        duration: parseFloat(d.dur) || 0,
    };
}

function seekTo(pct) {
    execInPage(`
        var m = window.__scMedia;
        if(m && m.duration) m.currentTime = m.duration * ${Math.max(0, Math.min(1, pct))};
    `);
}

// ─── Artwork extraction ───

function extractArtwork() {
    const badge = $('.playbackSoundBadge__avatar');
    if (!badge) return '';
    const els = badge.querySelectorAll('span, div');
    for (const el of els) {
        const bg = el.style.backgroundImage;
        if (bg && bg !== 'none' && bg.indexOf('url') !== -1) {
            return bg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
        }
    }
    const img = badge.querySelector('img');
    if (img && img.src) return img.src;
    return '';
}

// ─── Page name ───

function getPageName() {
    const type = getPageType();
    switch (type) {
        case PAGE.LIKES:
            return { pageLabel: 'Your Likes', pageName: 'Liked Tracks' };
        case PAGE.USER_LIKES: {
            const user = location.pathname.split('/')[1] || 'User';
            return { pageLabel: 'Likes', pageName: user };
        }
        case PAGE.PLAYLIST: {
            const el = document.querySelector('.soundTitle__title span')
                || document.querySelector('.soundTitle__title');
            if (el && el.textContent.trim()) return { pageLabel: 'Playlist', pageName: el.textContent.trim() };
            const slug = location.pathname.split('/').pop() || 'Playlist';
            return { pageLabel: 'Playlist', pageName: decodeURIComponent(slug).replace(/-/g, ' ') };
        }
        case PAGE.DISCOVER: {
            const el = document.querySelector('.systemPlaylistDetails__title');
            return { pageLabel: 'Discover', pageName: el ? el.textContent.trim() : 'Discover' };
        }
        default:
            return { pageLabel: '', pageName: '' };
    }
}

// ─── Like / Repeat ───

function findLikeBtn() {
    return document.querySelector('.playbackSoundBadge__like')
        || document.querySelector('button.playbackSoundBadge__like')
        || document.querySelector('.playbackSoundBadge button[aria-label*="Like"]')
        || document.querySelector('.playbackSoundBadge button[aria-label*="like"]')
        || document.querySelector('.playbackSoundBadge .sc-button-like');
}

function realClick(el) {
    if (!el) return false;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return true;
}

function getLikeState() {
    const btn = findLikeBtn();
    if (!btn) return false;
    return btn.classList.contains('sc-button-selected')
        || btn.classList.contains('sc-button-active')
        || btn.getAttribute('aria-pressed') === 'true'
        || btn.title?.toLowerCase().includes('unlike');
}

function findRepeatBtn() {
    return document.querySelector('.repeatControl')
        || document.querySelector('button.repeatControl')
        || document.querySelector('button[aria-label*="Repeat"]')
        || document.querySelector('button[aria-label*="repeat"]');
}

function getRepeatState() {
    const btn = findRepeatBtn();
    if (!btn) return 0;
    if (btn.classList.contains('m-one')) return 2;
    if (btn.classList.contains('m-all')) return 1;
    return 0;
}

// ─── Main status ───

function getPlaybackInfo() {
    const playCtrl = $('.playControl');
    const isPlaying = playCtrl ? playCtrl.classList.contains('playing') : false;
    const titleEl = $('.playbackSoundBadge__titleLink');
    const artistEl = $('.playbackSoundBadge__lightLink');
    const title = titleEl ? (titleEl.getAttribute('title') || titleEl.textContent.trim()) : '';
    const artist = artistEl ? (artistEl.getAttribute('title') || artistEl.textContent.trim()) : '';
    const artwork = extractArtwork();
    const progress = getProgressInfo();
    const { pageLabel, pageName } = getPageName();
    const liked = getLikeState();
    const repeat = getRepeatState();

    return {
        ok: true, isPlaying, title, artist, artwork,
        currentTime: progress.currentTime, duration: progress.duration,
        pageLabel, pageName, liked, repeat,
    };
}

// ─── Message handler ───

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    switch (msg.type) {
        case 'getStatus':
            sendResponse({ ...getPlaybackInfo(), phase: state.phase, page: getPageType() });
            return;
        case 'playPause':
            clickEl($('.playControl'));
            sendResponse({ ok: true });
            return;
        case 'prevTrack':
            clickEl($('.skipControl__previous'));
            sendResponse({ ok: true });
            return;
        case 'nextTrack':
            clickEl($('.skipControl__next'));
            sendResponse({ ok: true });
            return;
        case 'seekTo':
            seekTo(msg.value);
            sendResponse({ ok: true });
            return;
        case 'toggleLike': {
            const lBtn = findLikeBtn();
            realClick(lBtn);
            setTimeout(() => {
                sendResponse({ ok: !!lBtn, liked: getLikeState() });
            }, 300);
            return true;
        }
        case 'toggleRepeat': {
            const rBtn = findRepeatBtn();
            realClick(rBtn);
            setTimeout(() => {
                sendResponse({ ok: !!rBtn, repeat: getRepeatState() });
            }, 300);
            return true;
        }
        case 'shuffleNow':
            if (getPageType() === PAGE.NONE) {
                sendResponse({ ok: false, error: 'noPage' });
                return;
            }
            onShuffleClick();
            sendResponse({ ok: true });
            return;
    }
    // Re-register on every message to keep connection alive
    chrome.runtime.sendMessage({ type: 'scReady' }).catch(() => {});
});

// ─── Register with background ───
chrome.runtime.sendMessage({ type: 'scReady' }).catch(() => {});

// ─── In-page shuffle button ───

let inPageBtn = null;

function createInPageButton() {
    if (inPageBtn) return;
    inPageBtn = document.createElement('button');
    inPageBtn.id = 'sc-shuffle-btn';
    inPageBtn.textContent = '🔀 Shuffle';
    Object.assign(inPageBtn.style, {
        position: 'fixed',
        bottom: '70px',
        right: '20px',
        zIndex: '99999',
        padding: '10px 18px',
        border: 'none',
        borderRadius: '24px',
        background: '#1a1a1a',
        border: '1px solid #333',
        color: '#f50',
        fontSize: '13px',
        fontWeight: '700',
        fontFamily: '"Inter", system-ui, sans-serif',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.1s ease',
        display: 'none',
    });
    inPageBtn.addEventListener('mouseenter', () => {
        inPageBtn.style.background = '#222';
        inPageBtn.style.borderColor = '#f50';
    });
    inPageBtn.addEventListener('mouseleave', () => {
        inPageBtn.style.background = '#1a1a1a';
        inPageBtn.style.borderColor = '#333';
    });
    inPageBtn.addEventListener('click', () => {
        if (state.phase === 'loading') {
            cancelScrollPhase();
            inPageBtn.textContent = '🔀 Shuffle';
        } else {
            inPageBtn.textContent = '⏳ Loading…';
            onShuffleClick();
        }
    });
    document.body.appendChild(inPageBtn);
}

function updateInPageButton() {
    const type = getPageType();
    if (type === PAGE.NONE) {
        if (inPageBtn) inPageBtn.style.display = 'none';
        return;
    }
    createInPageButton();
    inPageBtn.style.display = 'block';
    if (state.phase === 'loading') {
        inPageBtn.textContent = '⏹ Cancel';
    } else if (state.phase === 'playing') {
        inPageBtn.textContent = '🔀 Reshuffle';
    } else {
        inPageBtn.textContent = '🔀 Shuffle';
    }
}

// Watch for SPA navigation
let lastPath = location.pathname;
const navObserver = new MutationObserver(() => {
    if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        setTimeout(updateInPageButton, 500);
    }
});
navObserver.observe(document.documentElement, { childList: true, subtree: true });

// Initial check
setTimeout(updateInPageButton, 1000);

