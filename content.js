'use strict';

const PAGE = Object.freeze({
    NONE: 0,
    LIKES: 1,
    USER_LIKES: 2,
    PLAYLIST: 3,
    DISCOVER: 4,
});

const BTN_CLASS = 'sc-true-shuffle-btn';
const SCROLL_TICK_MS = 350;
const OBSERVER_TIMEOUT_MS = 30_000;
const OBSERVER_DEBOUNCE_MS = 250;
const FALLBACK_CHECK_MS = 5_000;
const QUEUE_SETTLE_MS = 2_000;

const state = {
    phase: 'idle',
    scrollTimer: 0,
    settleTimer: 0,
    observer: null,
    observerTimeout: 0,
    observerDebounce: 0,
    lastPath: location.pathname,
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
    if (state.scrollTimer) {
        clearTimeout(state.scrollTimer);
        state.scrollTimer = 0;
    }
    if (state.settleTimer) {
        clearTimeout(state.settleTimer);
        state.settleTimer = 0;
    }
    if (state.abortCtrl) {
        state.abortCtrl.abort();
        state.abortCtrl = null;
    }
    state.phase = 'idle';
    state.queueEl = null;
    state.scrollEl = null;
    state.heightEl = null;
}

function cancelObserver() {
    if (state.observer) {
        state.observer.disconnect();
        state.observer = null;
    }
    if (state.observerTimeout) {
        clearTimeout(state.observerTimeout);
        state.observerTimeout = 0;
    }
    if (state.observerDebounce) {
        clearTimeout(state.observerDebounce);
        state.observerDebounce = 0;
    }
}

function fullCleanup() {
    cancelScrollPhase();
    cancelObserver();
}

function broadcastStatus() {
    try {
        chrome.runtime.sendMessage({ type: 'statusUpdate', phase: state.phase });
    } catch { }
}

function scheduleScrollTick(btn) {
    if (state.phase !== 'loading') return;
    state.scrollTimer = setTimeout(() => {
        state.scrollTimer = 0;
        onScrollTick(btn);
    }, SCROLL_TICK_MS);
}

function onScrollTick(btn) {
    if (state.phase !== 'loading') return;

    if (!state.queueEl) state.queueEl = $('.queue');
    if (!state.queueEl) { scheduleScrollTick(btn); return; }

    if (!state.queueEl.classList.contains('m-visible')) {
        setQueueOpen(true);
        scheduleScrollTick(btn);
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
        performShuffle(btn);
    } else {
        scheduleScrollTick(btn);
    }
}

function performShuffle(btn) {
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
    updateButtonState(btn, 'idle');
    broadcastStatus();

    const shuffleBtn = $('.shuffleControl');
    if (shuffleBtn) {
        if (shuffleBtn.classList.contains('m-shuffling')) shuffleBtn.click();
        shuffleBtn.click();
    }

    clickEl($('.skipControl__next'));
    setQueueOpen(false);

    const playCtrl = $('.playControl');
    if (playCtrl) playCtrl.focus();
}

function updateButtonState(btn, newState) {
    if (!btn) return;
    btn.classList.remove('is-loading', 'is-error');

    switch (newState) {
        case 'idle':
            btn.textContent = '🔀 Shuffle Play';
            btn.title = 'True random shuffle — all tracks';
            break;
        case 'loading':
            btn.classList.add('is-loading');
            btn.textContent = 'Loading…';
            btn.title = 'Click to cancel';
            break;
        case 'error':
            btn.classList.add('is-error');
            btn.textContent = 'Too few tracks';
            btn.title = '';
            setTimeout(() => updateButtonState(btn, 'idle'), 3000);
            break;
    }
}

async function onShuffleClick(btn) {
    if (state.phase === 'loading') {
        cancelScrollPhase();
        updateButtonState(btn, 'idle');
        broadcastStatus();
        return;
    }

    const type = getPageType();
    const listSel = getTrackListSelector(type);
    const trackList = listSel ? $(listSel) : null;

    if (!trackList || trackList.childElementCount < 2) {
        updateButtonState(btn, 'error');
        return;
    }

    state.phase = 'loading';
    state.abortCtrl = new AbortController();
    const signal = state.abortCtrl.signal;

    updateButtonState(btn, 'loading');
    broadcastStatus();

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
            } catch (e) {
                if (e.name === 'AbortError') throw e;
            }
        }

        setQueueOpen(true);
        await sleep(QUEUE_SETTLE_MS, signal);
        scheduleScrollTick(btn);

    } catch (e) {
        if (e.name === 'AbortError') return;
        console.error('[SoundCloud True Shuffle]', e);
        cancelScrollPhase();
        updateButtonState(btn, 'error');
        broadcastStatus();
    }
}

function createButton(type) {
    const btn = document.createElement('button');
    btn.className = BTN_CLASS + (
        type === PAGE.LIKES
            ? ' sc-button sc-button-large'
            : ' sc-button sc-button-medium'
    );
    updateButtonState(btn, 'idle');
    btn.addEventListener('click', () => onShuffleClick(btn));
    return btn;
}

function tryInsertButton() {
    const type = getPageType();
    if (type === PAGE.NONE) return true;
    if ($('.' + BTN_CLASS)) return true;

    let anchor, btn;
    switch (type) {
        case PAGE.LIKES:
            anchor = $('.collectionSection__top');
            if (anchor?.children[2]) {
                btn = createButton(type);
                anchor.insertBefore(btn, anchor.children[2]);
                return true;
            }
            break;
        case PAGE.USER_LIKES:
            anchor = $('.userNetworkTabs');
            if (anchor) {
                btn = createButton(type);
                anchor.appendChild(btn);
                return true;
            }
            break;
        case PAGE.PLAYLIST:
            anchor = $('.soundActions')?.children[0];
            if (anchor) {
                btn = createButton(type);
                anchor.appendChild(btn);
                return true;
            }
            break;
        case PAGE.DISCOVER:
            anchor = $('.systemPlaylistDetails__controls');
            if (anchor) {
                btn = createButton(type);
                anchor.appendChild(btn);
                return true;
            }
            break;
    }
    return false;
}

function startInsertionObserver() {
    cancelObserver();
    if (tryInsertButton()) return;

    state.observer = new MutationObserver(() => {
        if (state.observerDebounce) return;
        state.observerDebounce = setTimeout(() => {
            state.observerDebounce = 0;
            if (tryInsertButton()) cancelObserver();
        }, OBSERVER_DEBOUNCE_MS);
    });

    state.observer.observe(document.body, { childList: true, subtree: true });
    state.observerTimeout = setTimeout(cancelObserver, OBSERVER_TIMEOUT_MS);
}

function onNavigate() {
    const path = location.pathname;
    if (path === state.lastPath) return;
    state.lastPath = path;

    cancelScrollPhase();

    const old = $('.' + BTN_CLASS);
    if (old) old.remove();

    startInsertionObserver();
}

const origPush = history.pushState;
const origReplace = history.replaceState;

history.pushState = function (...args) {
    origPush.apply(this, args);
    onNavigate();
};
history.replaceState = function (...args) {
    origReplace.apply(this, args);
    onNavigate();
};
window.addEventListener('popstate', onNavigate);

setInterval(() => {
    if (state.phase !== 'idle') return;
    if (getPageType() === PAGE.NONE) return;
    if (!$('.' + BTN_CLASS)) startInsertionObserver();
}, FALLBACK_CHECK_MS);

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'getStatus') {
        sendResponse({ phase: state.phase, page: getPageType() });
        return;
    }
    if (msg.type === 'shuffleNow') {
        const btn = $('.' + BTN_CLASS);
        if (btn) {
            onShuffleClick(btn);
            sendResponse({ ok: true });
        } else {
            sendResponse({ ok: false, error: 'No shuffle button on this page' });
        }
        return;
    }
});

startInsertionObserver();
