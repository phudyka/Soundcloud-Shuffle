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

function broadcastStatus() {
    try {
        chrome.runtime.sendMessage({ type: 'statusUpdate', phase: state.phase });
    } catch { }
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

async function onShuffleClick() {
    if (state.phase === 'loading') {
        cancelScrollPhase();
        broadcastStatus();
        return;
    }

    const type = getPageType();
    const listSel = getTrackListSelector(type);
    const trackList = listSel ? $(listSel) : null;

    if (!trackList || trackList.childElementCount < 2) {
        state.phase = 'idle';
        broadcastStatus();
        return;
    }

    state.phase = 'loading';
    state.abortCtrl = new AbortController();
    const signal = state.abortCtrl.signal;

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
        scheduleScrollTick();

    } catch (e) {
        if (e.name === 'AbortError') return;
        console.error('[SoundCloud True Shuffle]', e);
        cancelScrollPhase();
        broadcastStatus();
    }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'getStatus') {
        sendResponse({ phase: state.phase, page: getPageType() });
        return;
    }
    if (msg.type === 'shuffleNow') {
        if (getPageType() === PAGE.NONE) {
            sendResponse({ ok: false, error: 'Not on a shuffleable page' });
            return;
        }
        onShuffleClick();
        sendResponse({ ok: true });
        return;
    }
});
