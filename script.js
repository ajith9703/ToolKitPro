/* ============================================
   ToolKit Pro – Global JavaScript
   ============================================ */

// ===== PARTICLES BACKGROUND =====
(function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles = [];

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const isDark = () => document.documentElement.getAttribute('data-theme') !== 'light';

    function createParticle() {
        return {
            x: Math.random() * W,
            y: Math.random() * H,
            r: Math.random() * 1.5 + 0.5,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            alpha: Math.random() * 0.5 + 0.1
        };
    }

    for (let i = 0; i < 120; i++) particles.push(createParticle());

    function drawLine(p1, p2, alpha) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = isDark()
            ? `rgba(108,99,255,${alpha})`
            : `rgba(108,99,255,${alpha * 0.5})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
    }

    function animate() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > W) p.vx *= -1;
            if (p.y < 0 || p.y > H) p.vy *= -1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = isDark()
                ? `rgba(108,99,255,${p.alpha})`
                : `rgba(108,99,255,${p.alpha * 0.4})`;
            ctx.fill();
        });
        // Draw connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) drawLine(particles[i], particles[j], (1 - dist / 100) * 0.2);
            }
        }
        requestAnimationFrame(animate);
    }
    animate();
})();

// ===== NAVBAR SCROLL EFFECT =====
const navbar = document.getElementById('navbar');
if (navbar) {
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 20);
    });
}

// ===== DARK / LIGHT THEME TOGGLE =====
const html = document.documentElement;
const themeBtn = document.getElementById('theme-toggle');
const themeIcon = themeBtn ? themeBtn.querySelector('.theme-icon') : null;

function setTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('tk-theme', theme);
    if (themeIcon) themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
}

// Initialize theme
const savedTheme = localStorage.getItem('tk-theme') || 'dark';
setTheme(savedTheme);

if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        setTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
}

// ===== MOBILE MENU =====
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const navCenter = document.querySelector('.nav-center');
if (mobileMenuBtn && navCenter) {
    mobileMenuBtn.addEventListener('click', () => {
        navCenter.classList.toggle('open');
        mobileMenuBtn.textContent = navCenter.classList.contains('open') ? '✕' : '☰';
    });
}

// ===== SEARCH FUNCTIONALITY =====
const tools = [
    { name: 'Instagram Downloader', icon: '📸', href: 'tools/instagram-downloader.html', tags: 'instagram reel video social' },
    { name: 'YouTube Downloader', icon: '▶️', href: 'tools/youtube-downloader.html', tags: 'youtube video audio download mp4 mp3' },
    { name: 'Image Compressor', icon: '🖼️', href: 'tools/image-compressor.html', tags: 'image compress photo reduce size' },
    { name: 'PDF to Word', icon: '📄', href: 'tools/pdf-to-word.html', tags: 'pdf word convert document docx' },
    { name: 'Word to PDF', icon: '📑', href: 'tools/word-to-pdf.html', tags: 'word pdf convert doc docx' },
    { name: 'Remove Background', icon: '✂️', href: 'tools/remove-bg.html', tags: 'background remove image transparent' },
    { name: 'QR Code Generator', icon: '⬛', href: 'tools/qr-generator.html', tags: 'qr code generator url text' },
    { name: 'Password Generator', icon: '🔐', href: 'tools/password-generator.html', tags: 'password strong secure random' },
    { name: 'YT Thumbnail Downloader', icon: '🖼️', href: 'tools/yt-thumbnail.html', tags: 'youtube thumbnail download hd' },
    { name: 'Hashtag Generator', icon: '#️⃣', href: 'tools/hashtag-generator.html', tags: 'hashtag trending instagram twitter' },
];

// Adjust href prefix for tool pages
const isToolPage = !window.location.pathname.endsWith('index.html') &&
    window.location.pathname.split('/').pop() !== '' &&
    !window.location.pathname.endsWith('/');

const hrefPrefix = isToolPage ? '../' : '';

const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

if (searchInput && searchResults) {
    searchInput.addEventListener('input', () => {
        const q = searchInput.value.toLowerCase().trim();
        searchResults.innerHTML = '';
        if (!q) { searchResults.classList.remove('active'); return; }

        const matches = tools.filter(t =>
            t.name.toLowerCase().includes(q) || t.tags.includes(q)
        );

        if (matches.length === 0) {
            searchResults.innerHTML = `<div class="search-result-item">No tools found for "${q}"</div>`;
        } else {
            matches.forEach(t => {
                const item = document.createElement('a');
                item.className = 'search-result-item';
                item.href = hrefPrefix + t.href;
                item.innerHTML = `<span>${t.icon}</span><span>${t.name}</span>`;
                searchResults.appendChild(item);
            });
        }
        searchResults.classList.add('active');
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.closest('.search-bar').contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });
}

// ===== INTERSECTION OBSERVER (Scroll animations for cards) =====
const animCards = document.querySelectorAll('.animate-card');
const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); cardObserver.unobserve(e.target); } });
}, { threshold: 0.1 });
animCards.forEach(c => cardObserver.observe(c));

// ===== SMOOTH SCROLL for anchor links =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(a.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
});

// ===== TOAST NOTIFICATIONS =====
/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration ms
 */
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => setTimeout(() => toast.classList.add('show'), 10));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, duration);
}

// ===== COPY TO CLIPBOARD UTILITY =====
function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!', 'success');
        if (btn) { const orig = btn.textContent; btn.textContent = '✅ Copied'; setTimeout(() => btn.textContent = orig, 2000); }
    }).catch(() => showToast('Failed to copy.', 'error'));
}

// ===== DOWNLOAD HELPER =====
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadURL(url, filename) {
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ===== DRAG AND DROP UTIL =====
function initDropzone(dropzoneEl, fileCallback) {
    if (!dropzoneEl) return;
    dropzoneEl.addEventListener('dragover', e => { e.preventDefault(); dropzoneEl.classList.add('dragover'); });
    dropzoneEl.addEventListener('dragleave', () => dropzoneEl.classList.remove('dragover'));
    dropzoneEl.addEventListener('drop', e => {
        e.preventDefault();
        dropzoneEl.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length) fileCallback(files[0]);
    });
}

// Expose globals
window.showToast = showToast;
window.copyToClipboard = copyToClipboard;
window.downloadBlob = downloadBlob;
window.downloadURL = downloadURL;
window.initDropzone = initDropzone;
