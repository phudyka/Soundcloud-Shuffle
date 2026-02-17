'use strict';

const $ = id => document.getElementById(id);

const heroBg    = $('heroBg');
const art       = $('art');
const title     = $('title');
const artist    = $('artist');
const pageLabel = $('pageLabel');
const prevBtn   = $('prevBtn');
const ppBtn     = $('ppBtn');
const ppIcon    = $('ppIcon');
const nextBtn   = $('nextBtn');
const likeBtn   = $('likeBtn');
const shuffleBtn = $('shuffleBtn');
const footMsg   = $('footMsg');

const PLAY  = '<path d="M8 5v14l11-7z"/>';
const PAUSE = '<path d="M6 19h4V5H6zm8-14v14h4V5z"/>';

function send(command, value) {
    return new Promise(resolve => {
        chrome.runtime.sendMessage(
            { type: 'relay', command, value },
            res => resolve(chrome.runtime.lastError ? null : res)
        );
    });
}

function setTransport(on) {
    prevBtn.disabled = !on;
    ppBtn.disabled = !on;
    nextBtn.disabled = !on;
}

function applyState(res) {
    if (!res || res.error) {
        title.textContent = 'No SoundCloud tab';
        artist.textContent = 'Open SoundCloud to get started';
        pageLabel.className = 'meta-page';
        heroBg.className = 'hero-bg';
        art.style.backgroundImage = '';
        setTransport(false);
        shuffleBtn.disabled = true;
        shuffleBtn.textContent = '🔀 Shuffle Play';
        footMsg.className = 'foot-msg';
        likeBtn.classList.remove('liked');
        return;
    }

    // Track info
    title.textContent = res.title || 'No track playing';
    artist.textContent = res.artist || '—';

    // Page label
    if (res.pageLabel) {
        pageLabel.className = 'meta-page on';
        pageLabel.textContent = (res.pageLabel === 'Your Likes' ? '❤️' :
            res.pageLabel === 'Playlist' ? '📋' :
            res.pageLabel === 'Discover' ? '🔍' : '🎵') +
            ' ' + res.pageLabel + (res.pageName ? ' · ' + res.pageName : '');
    } else {
        pageLabel.className = 'meta-page';
    }

    // Artwork
    if (res.artwork) {
        const u = 'url("' + res.artwork + '")';
        heroBg.style.backgroundImage = u;
        heroBg.className = 'hero-bg on';
        art.style.backgroundImage = u;
    } else {
        heroBg.className = 'hero-bg';
        heroBg.style.backgroundImage = '';
        art.style.backgroundImage = '';
    }

    // Play/pause
    ppIcon.innerHTML = res.isPlaying ? PAUSE : PLAY;
    ppBtn.title = res.isPlaying ? 'Pause' : 'Play';
    setTransport(!!res.title);

    // Like
    likeBtn.classList.toggle('liked', !!res.liked);

    // Shuffle
    const phase = res.phase || 'idle';
    if (phase === 'loading') {
        shuffleBtn.disabled = false;
        shuffleBtn.textContent = '⏹ Cancel';
    } else {
        shuffleBtn.textContent = '🔀 Shuffle Play';
        shuffleBtn.disabled = !(res.page > 0);
    }

    // Footer hint
    if (!res.page || res.page === 0) {
        footMsg.className = 'foot-msg on';
        footMsg.textContent = res.title
            ? '↑ Navigate to a playlist to enable shuffle'
            : '';
    } else {
        footMsg.className = 'foot-msg';
    }
}

async function refresh() {
    applyState(await send('getStatus'));
}

// ── Events ──

prevBtn.addEventListener('click', async () => {
    await send('prevTrack'); setTimeout(refresh, 400);
});
ppBtn.addEventListener('click', async () => {
    await send('playPause');
    ppIcon.innerHTML = ppIcon.innerHTML === PLAY ? PAUSE : PLAY;
});
nextBtn.addEventListener('click', async () => {
    await send('nextTrack'); setTimeout(refresh, 400);
});

likeBtn.addEventListener('click', async () => {
    const r = await send('toggleLike');
    const isLiked = !!(r && r.liked);
    likeBtn.classList.toggle('liked', isLiked);

    // Pop animation (fast bounce for like, slow shrink for unlike)
    likeBtn.classList.remove('like-pop', 'unlike-pop');
    void likeBtn.offsetWidth;
    likeBtn.classList.add(isLiked ? 'like-pop' : 'unlike-pop');

    // Heart burst particles (only on like)
    if (isLiked) {
        const rect = likeBtn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        for (let i = 0; i < 5; i++) {
            const p = document.createElement('span');
            p.className = 'like-burst';
            p.textContent = '❤️';
            const dx = (Math.random() - 0.5) * 60;
            const dy = -(15 + Math.random() * 35);
            p.style.cssText = `left:${cx}px;top:${cy}px;--dx:${dx}px;--dy:${dy}px;animation-delay:${i * 50}ms`;
            document.body.appendChild(p);
            p.addEventListener('animationend', () => p.remove());
        }
    }
});

shuffleBtn.addEventListener('click', async () => {
    if (shuffleBtn.textContent.includes('Cancel')) {
        await send('shuffleNow');
        shuffleBtn.textContent = '🔀 Shuffle Play';
        setTimeout(refresh, 300);
    } else {
        shuffleBtn.textContent = '⏳ Loading…';
        shuffleBtn.disabled = true;
        await send('shuffleNow');
        setTimeout(refresh, 500);
    }
});

refresh();
setInterval(refresh, 2500);
