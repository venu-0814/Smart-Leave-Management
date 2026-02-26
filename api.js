// ═══ SLMS Shared Utilities ═══════════════════════

const TOKEN = () => localStorage.getItem('slms_token');

// ─── API Wrapper ──────────────────────────────────
async function api(path, method = 'GET', body = null) {
    const opts = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN()}`
        }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    const data = await res.json();
    if (res.status === 401) {
        localStorage.clear();
        window.location.href = '/';
        throw new Error('Unauthorized');
    }
    if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
    return data;
}

// ─── Toast Notifications ──────────────────────────
function showToast(msg, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    t.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> <span>${msg}</span>`;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(20px)'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ─── Auth ─────────────────────────────────────────
function requireAuth(expectedRole) {
    const token = TOKEN();
    const role = localStorage.getItem('slms_role');
    if (!token || (expectedRole && role !== expectedRole)) {
        window.location.href = '/';
    }
}

function logout() {
    localStorage.clear();
    window.location.href = '/';
}

// ─── Formatters ───────────────────────────────────
function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status) {
    const map = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected' };
    const icons = { pending: '⏳', approved: '✅', rejected: '❌' };
    return `<span class="badge ${map[status] || ''}">${icons[status] || ''} ${status}</span>`;
}

function riskBadge(label) {
    const map = { Safe: 'badge-safe', Monitor: 'badge-monitor', 'At Risk': 'badge-risk', Critical: 'badge-critical' };
    return `<span class="badge ${map[label] || ''}">${label}</span>`;
}

// ─── Viewport Helper ──────────────────────────────
function isMobile() {
    return window.innerWidth <= 768;
}

// ─── Bottom Tab Navigation ────────────────────────
function initBottomTabs(sections, renderCallbacks = {}) {
    const tabs = document.querySelectorAll('.bottom-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const section = tab.dataset.section;
            if (section && typeof window.showSection === 'function') {
                window.showSection(section);
            }
        });
    });
}

function syncBottomTabs(activeName) {
    document.querySelectorAll('.bottom-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.section === activeName);
    });
}

// ─── Sidebar Mobile Toggle ────────────────────────
function initSidebar() {
    const hamburger = document.getElementById('hamburger-btn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            if (overlay) overlay.classList.toggle('active');
        });
    }
    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }
}

// ─── Loading Skeleton Helpers ─────────────────────
function showSkeleton(containerId, count = 3, type = 'card') {
    const el = document.getElementById(containerId);
    if (!el) return;
    let html = '';
    for (let i = 0; i < count; i++) {
        if (type === 'stat') {
            html += '<div class="skeleton skeleton-stat"></div>';
        } else {
            html += '<div class="skeleton skeleton-card"></div>';
        }
    }
    el.innerHTML = html;
}

function hideSkeleton(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.querySelectorAll('.skeleton').forEach(s => s.remove());
}

// ─── Swipe Gesture Handler ────────────────────────
function initSwipeGesture(element, onSwipeLeft, onSwipeRight) {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isDragging = false;
    const threshold = 80;

    element.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
        element.classList.add('swiping');
    }, { passive: true });

    element.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentX = e.touches[0].clientX - startX;
        const currentY = e.touches[0].clientY - startY;

        // Only swipe if horizontal movement is dominant
        if (Math.abs(currentX) < Math.abs(currentY)) return;

        element.style.transform = `translateX(${currentX * 0.5}px)`;

        const approveHint = element.querySelector('.swipe-hint-approve');
        const rejectHint = element.querySelector('.swipe-hint-reject');

        if (currentX > 30 && approveHint) {
            approveHint.style.opacity = Math.min(currentX / threshold, 1);
        } else if (currentX < -30 && rejectHint) {
            rejectHint.style.opacity = Math.min(Math.abs(currentX) / threshold, 1);
        }
    }, { passive: true });

    element.addEventListener('touchend', () => {
        isDragging = false;
        element.classList.remove('swiping');

        if (currentX > threshold && onSwipeRight) {
            element.style.transform = 'translateX(100%)';
            element.style.opacity = '0';
            setTimeout(() => onSwipeRight(), 200);
        } else if (currentX < -threshold && onSwipeLeft) {
            element.style.transform = 'translateX(-100%)';
            element.style.opacity = '0';
            setTimeout(() => onSwipeLeft(), 200);
        } else {
            element.style.transform = '';
        }

        // Reset hints
        const hints = element.querySelectorAll('.swipe-hint');
        hints.forEach(h => h.style.opacity = '0');
        currentX = 0;
    }, { passive: true });
}

// ─── Lucide Icon Helper ───────────────────────────
function createIcon(name, size = 20) {
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 50);
    }
    return `<i data-lucide="${name}" style="width:${size}px;height:${size}px;"></i>`;
}

// ─── Init on DOM ready ────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initBottomTabs();
    // Init Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});
