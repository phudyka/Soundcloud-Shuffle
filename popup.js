'use strict';

const dot    = document.getElementById('statusDot');
const text   = document.getElementById('statusText');
const btn    = document.getElementById('shuffleBtn');
const footer = document.querySelector('.footer');

const STATUS_MAP = {
    idle:    { label: 'Ready',           dot: 'idle',    btn: true,  btnLabel: '🔀 Shuffle Play' },
    loading: { label: 'Loading tracks…', dot: 'loading', btn: true,  btnLabel: 'Cancel' },
    playing: { label: 'Playing shuffle', dot: 'playing', btn: false, btnLabel: '🔀 Shuffle Play' },
};

function setStatus(phase) {
    const s = STATUS_MAP[phase];
    if (!s) return setInactive();

    dot.className  = 'dot ' + s.dot;
    text.textContent = s.label;
    btn.disabled   = !s.btn;
    btn.textContent = s.btnLabel;
    footer.textContent = '';
}

function setInactive() {
    dot.className  = 'dot inactive';
    text.textContent = 'Not on SoundCloud';
    btn.disabled   = true;
    btn.textContent = '🔀 Shuffle Play';
    footer.textContent = 'Open a SoundCloud playlist or likes page';
}

function setNoButton() {
    dot.className  = 'dot inactive';
    text.textContent = 'No shuffleable page';
    btn.disabled   = true;
    btn.textContent = '🔀 Shuffle Play';
    footer.textContent = 'Navigate to a playlist, likes, or discover page';
}

async function refresh() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.url?.startsWith('https://soundcloud.com')) {
            setInactive();
            return;
        }

        const response = await chrome.tabs.sendMessage(tab.id, { type: 'getStatus' });
        if (response.page === 0) {
            setNoButton();
        } else {
            setStatus(response.phase);
        }
    } catch {
        setInactive();
    }
}

btn.addEventListener('click', async () => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        const res = await chrome.tabs.sendMessage(tab.id, { type: 'shuffleNow' });
        if (res?.ok) {
            setTimeout(refresh, 300);
        } else {
            setNoButton();
        }
    } catch {
        setInactive();
    }
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'statusUpdate') {
        setStatus(msg.phase);
    }
});

refresh();
