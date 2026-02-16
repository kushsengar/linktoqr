/**
 * ============================================
 *  LinkToQR — Frontend Application
 * ============================================
 *
 * LEARNING POINTS:
 * - API calls with fetch()
 * - JWT token management (localStorage)
 * - DOM manipulation patterns
 * - State management without a framework
 * - Client-side URL validation
 */

(function () {
    'use strict';

    // ===== Configuration =====
    // In production, this would be your domain.
    // In development, we use relative paths since Express serves the frontend.
    const API_BASE = '';  // Empty = same origin

    // ===== State =====
    let currentMode = 'static';  // 'static' or 'dynamic'
    let authToken = localStorage.getItem('linktoqr_token');
    let currentUser = null;
    let currentShortUrl = null;
    let authMode = 'login';  // 'login' or 'signup'

    // ===== DOM Elements =====
    const urlInput = document.getElementById('url-input');
    const clearBtn = document.getElementById('clear-btn');
    const urlHint = document.getElementById('url-hint');
    const sizeSelect = document.getElementById('size-select');
    const ecSelect = document.getElementById('ec-select');
    const fgColor = document.getElementById('fg-color');
    const bgColor = document.getElementById('bg-color');
    const fgLabel = document.getElementById('fg-color-label');
    const bgLabel = document.getElementById('bg-color-label');
    const generateBtn = document.getElementById('generate-btn');
    const emptyState = document.getElementById('empty-state');
    const qrResult = document.getElementById('qr-result');
    const qrContainer = document.getElementById('qr-canvas-container');
    const downloadBtn = document.getElementById('download-btn');
    const copyBtn = document.getElementById('copy-btn');
    const resultUrl = document.getElementById('result-url');
    const toastContainer = document.getElementById('toast-container');
    const shortUrlBox = document.getElementById('short-url-box');
    const shortUrlDisplay = document.getElementById('short-url-display');
    const generatorCard = document.getElementById('generator-card');
    const dashboardCard = document.getElementById('dashboard-card');

    let debounceTimer = null;

    // ===== Initialize =====
    if (authToken) {
        fetchUser();
    }

    // ===== URL Validation =====
    function validateUrl(input) {
        if (!input || !input.trim()) {
            return { valid: false, message: '', type: '' };
        }
        const trimmed = input.trim();
        if (trimmed.length > 2048) {
            return { valid: false, message: 'URL is too long (max 2048 characters)', type: 'error' };
        }
        try {
            const url = new URL(trimmed);
            if (url.protocol === 'http:') {
                return { valid: true, message: '⚠ HTTP link — consider using HTTPS', type: 'warning' };
            }
            if (url.protocol === 'https:') {
                return { valid: true, message: '✓ Valid secure URL', type: 'valid' };
            }
            return { valid: true, message: '✓ Valid link', type: 'valid' };
        } catch {
            try {
                new URL('https://' + trimmed);
                return { valid: false, message: 'Did you mean https://' + trimmed + '?', type: 'warning' };
            } catch {
                return { valid: false, message: 'Please enter a valid URL', type: 'error' };
            }
        }
    }

    function updateInputState(result) {
        urlInput.classList.remove('error', 'valid');
        urlHint.classList.remove('error', 'warning', 'valid');
        urlHint.textContent = result.message;
        if (result.type === 'error') { urlInput.classList.add('error'); urlHint.classList.add('error'); }
        else if (result.type === 'warning') { urlHint.classList.add('warning'); }
        else if (result.type === 'valid') { urlInput.classList.add('valid'); urlHint.classList.add('valid'); }
        generateBtn.disabled = !result.valid;
    }

    // ===== Mode Toggle =====
    window.setMode = function (mode) {
        currentMode = mode;
        document.getElementById('mode-static').classList.toggle('active', mode === 'static');
        document.getElementById('mode-dynamic').classList.toggle('active', mode === 'dynamic');
    };

    // ===== QR Code Generation =====
    const EC_LEVELS = { L: 1, M: 0, Q: 3, H: 2 };  // QRCode.CorrectLevel values

    function generateQR() {
        const url = urlInput.value.trim();
        if (!url) return;
        const validation = validateUrl(url);
        if (!validation.valid) return;

        const btnText = generateBtn.querySelector('span');
        const btnIcon = generateBtn.querySelector('.btn-icon');
        const btnLoader = generateBtn.querySelector('.btn-loader');
        btnText.textContent = 'Generating...';
        if (btnIcon) btnIcon.style.display = 'none';
        btnLoader.style.display = 'block';
        generateBtn.disabled = true;

        if (currentMode === 'dynamic') {
            // Dynamic QR: call the backend API
            createDynamicQR(url).then(result => {
                if (result) {
                    renderQRCode(result.shortUrl, url);
                    currentShortUrl = result.shortUrl;
                    shortUrlBox.style.display = 'flex';
                    shortUrlDisplay.textContent = result.shortUrl;
                }
                resetBtn(btnText, btnIcon, btnLoader);
            }).catch(err => {
                showToast(err.message || 'Failed to create dynamic QR', 'error');
                resetBtn(btnText, btnIcon, btnLoader);
            });
        } else {
            // Static QR: generate directly in browser
            setTimeout(() => {
                renderQRCode(url, url);
                shortUrlBox.style.display = 'none';
                currentShortUrl = null;
                resetBtn(btnText, btnIcon, btnLoader);
            }, 300);
        }
    }

    function renderQRCode(qrContent, displayUrl) {
        try {
            qrContainer.innerHTML = '';
            new QRCode(qrContainer, {
                text: qrContent,
                width: parseInt(sizeSelect.value, 10),
                height: parseInt(sizeSelect.value, 10),
                colorDark: fgColor.value,
                colorLight: bgColor.value,
                correctLevel: EC_LEVELS[ecSelect.value] || 0
            });
            emptyState.style.display = 'none';
            qrResult.style.display = 'flex';
            qrResult.style.animation = 'none';
            qrResult.offsetHeight;
            qrResult.style.animation = '';
            resultUrl.textContent = displayUrl.length > 80 ? displayUrl.substring(0, 80) + '…' : displayUrl;
            showToast('QR code generated!', 'success');
        } catch (err) {
            showToast('Failed to generate QR code', 'error');
            console.error(err);
        }
    }

    function resetBtn(text, icon, loader) {
        text.textContent = 'Generate QR Code';
        if (icon) icon.style.display = '';
        loader.style.display = 'none';
        generateBtn.disabled = false;
    }

    // ===== Dynamic QR API Call =====
    async function createDynamicQR(url) {
        const headers = { 'Content-Type': 'application/json' };
        if (authToken) headers['Authorization'] = 'Bearer ' + authToken;

        const res = await fetch(API_BASE + '/api/qr', {
            method: 'POST',
            headers,
            body: JSON.stringify({ url })
        });

        const data = await res.json();
        if (!res.ok) {
            if (data.upgrade) {
                showToast('Free plan limit reached! Sign up or upgrade for more.', 'warning');
            }
            throw new Error(data.error || 'API error');
        }
        return data;
    }

    // ===== Download =====
    function downloadQR() {
        const canvas = qrContainer.querySelector('canvas');
        if (!canvas) {
            const img = qrContainer.querySelector('img');
            if (img) {
                const link = document.createElement('a');
                link.download = 'linktoqr-' + Date.now() + '.png';
                link.href = img.src;
                link.click();
                showToast('Downloaded!', 'success');
            }
            return;
        }
        canvas.toBlob(function (blob) {
            if (!blob) { showToast('Download failed', 'error'); return; }
            const link = document.createElement('a');
            link.download = 'linktoqr-' + Date.now() + '.png';
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);
            showToast('Downloaded!', 'success');
        }, 'image/png');
    }

    // ===== Copy Image =====
    async function copyQR() {
        const canvas = qrContainer.querySelector('canvas');
        if (!canvas) { showToast('Nothing to copy', 'error'); return; }
        try {
            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(b => b ? resolve(b) : reject(new Error('Blob failed')), 'image/png');
            });
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            const txt = copyBtn.querySelector('span');
            const orig = txt.textContent;
            txt.textContent = 'Copied!';
            copyBtn.classList.add('copied');
            setTimeout(() => { txt.textContent = orig; copyBtn.classList.remove('copied'); }, 2000);
            showToast('Copied to clipboard!', 'success');
        } catch {
            showToast('Copy failed — try download instead', 'error');
        }
    }

    // ===== Copy Short URL =====
    window.copyShortUrl = function () {
        if (!currentShortUrl) return;
        navigator.clipboard.writeText(currentShortUrl).then(() => {
            showToast('Short URL copied!', 'success');
            const btn = document.getElementById('copy-link-btn');
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = 'Copy', 1500);
        }).catch(() => showToast('Copy failed', 'error'));
    };

    // ===== Auth =====
    window.showModal = function (mode) {
        authMode = mode;
        const overlay = document.getElementById('modal-overlay');
        const title = document.getElementById('modal-title');
        const submitText = document.getElementById('auth-submit-text');
        const switchEl = document.getElementById('auth-switch');

        overlay.style.display = 'flex';
        if (mode === 'login') {
            title.textContent = 'Welcome back';
            submitText.textContent = 'Log in';
            switchEl.innerHTML = 'No account? <a onclick="showModal(\'signup\')">Sign up free</a>';
        } else {
            title.textContent = 'Create account';
            submitText.textContent = 'Sign up';
            switchEl.innerHTML = 'Already have an account? <a onclick="showModal(\'login\')">Log in</a>';
        }
    };

    window.hideModal = function () {
        document.getElementById('modal-overlay').style.display = 'none';
        document.getElementById('auth-form').reset();
    };

    window.closeModal = function (e) {
        if (e.target === document.getElementById('modal-overlay')) hideModal();
    };

    window.handleAuth = async function (e) {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';

        try {
            const res = await fetch(API_BASE + endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            authToken = data.token;
            localStorage.setItem('linktoqr_token', authToken);
            currentUser = data.user;
            updateAuthUI(true);
            hideModal();
            showToast(authMode === 'login' ? 'Welcome back!' : 'Account created!', 'success');
        } catch (err) {
            showToast(err.message || 'Auth failed', 'error');
        }
    };

    window.logout = function () {
        authToken = null;
        currentUser = null;
        localStorage.removeItem('linktoqr_token');
        updateAuthUI(false);
        hideDashboard();
        showToast('Logged out', 'info');
    };

    async function fetchUser() {
        try {
            const res = await fetch(API_BASE + '/api/auth/me', {
                headers: { 'Authorization': 'Bearer ' + authToken }
            });
            if (!res.ok) throw new Error('Invalid token');
            const data = await res.json();
            currentUser = data.user;
            updateAuthUI(true);
        } catch {
            authToken = null;
            localStorage.removeItem('linktoqr_token');
            updateAuthUI(false);
        }
    }

    function updateAuthUI(loggedIn) {
        document.getElementById('auth-buttons').style.display = loggedIn ? 'none' : 'flex';
        document.getElementById('user-menu').style.display = loggedIn ? 'flex' : 'none';
    }

    // ===== Dashboard =====
    window.showDashboard = async function () {
        generatorCard.style.display = 'none';
        dashboardCard.style.display = 'block';
        const list = document.getElementById('dashboard-list');
        const usage = document.getElementById('usage-badge');
        list.innerHTML = '<p class="empty-dashboard">Loading...</p>';

        try {
            const res = await fetch(API_BASE + '/api/qr/my', {
                headers: { 'Authorization': 'Bearer ' + authToken }
            });
            if (!res.ok) throw new Error('Failed to load');
            const data = await res.json();

            usage.textContent = data.usage.count + ' / ' + data.usage.limit + ' QR used (' + data.plan + ')';

            if (data.qrCodes.length === 0) {
                list.innerHTML = '<p class="empty-dashboard">No dynamic QR codes yet. Create one!</p>';
                return;
            }

            list.innerHTML = data.qrCodes.map(qr => `
                <div class="qr-row">
                    <div class="qr-row-info">
                        <span class="qr-row-url" title="${escapeHtml(qr.destination_url)}">${escapeHtml(qr.destination_url)}</span>
                        <span class="qr-row-code">/r/${qr.short_code}</span>
                    </div>
                    <div class="qr-row-stats">
                        <div class="stat">
                            <span class="stat-value">${qr.scan_count}</span>
                            <span class="stat-label">Scans</span>
                        </div>
                    </div>
                    <div class="qr-row-actions">
                        <button class="qr-row-btn" onclick="editQR('${qr.short_code}')">Edit</button>
                        <button class="qr-row-btn delete" onclick="deleteQR('${qr.short_code}')">Delete</button>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            list.innerHTML = '<p class="empty-dashboard">Failed to load. Please try again.</p>';
            showToast(err.message, 'error');
        }
    };

    window.hideDashboard = function () {
        dashboardCard.style.display = 'none';
        generatorCard.style.display = 'block';
    };

    window.editQR = async function (code) {
        const newUrl = prompt('Enter new destination URL:');
        if (!newUrl) return;
        try {
            new URL(newUrl);
        } catch {
            showToast('Invalid URL', 'error');
            return;
        }
        try {
            const res = await fetch(API_BASE + '/api/qr/' + code, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
                body: JSON.stringify({ url: newUrl })
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            showToast('URL updated!', 'success');
            showDashboard(); // Refresh
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    window.deleteQR = async function (code) {
        if (!confirm('Deactivate this QR code?')) return;
        try {
            const res = await fetch(API_BASE + '/api/qr/' + code, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + authToken }
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            showToast('QR code deactivated', 'success');
            showDashboard(); // Refresh
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // ===== Toast Notifications =====
    window.showToast = function (message, type) {
        type = type || 'info';
        const icons = {
            success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>',
            error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };
        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.innerHTML = '<span class="toast-icon">' + (icons[type] || icons.info) + '</span><span>' + escapeHtml(message) + '</span>';
        toastContainer.appendChild(toast);
        setTimeout(() => { toast.classList.add('toast-exit'); toast.addEventListener('animationend', () => toast.remove()); }, 3500);
    };

    // ===== Pricing Plan Click =====
    window.handlePlanClick = function (plan) {
        if (plan === 'free') {
            if (!authToken) {
                showToast('Sign up free to get started with 2 dynamic QR codes!', 'info');
                showModal('signup');
            } else {
                showToast('You\'re already on the Free plan!', 'info');
            }
            return;
        }
        // Pro or Business
        if (!authToken) {
            showToast('Sign up first, then upgrade your plan.', 'info');
            showModal('signup');
            return;
        }
        // Show upgrade info
        const prices = { pro: '₹149/month', business: '₹399/month' };
        showToast('To upgrade to ' + plan.charAt(0).toUpperCase() + plan.slice(1) + ' (' + prices[plan] + '), email hello@linktoqr.com with your account email.', 'info');
    };

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== Event Listeners =====
    urlInput.addEventListener('input', function () {
        clearBtn.style.display = this.value ? 'flex' : 'none';
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => updateInputState(validateUrl(this.value)), 250);
    });

    clearBtn.addEventListener('click', function () {
        urlInput.value = '';
        clearBtn.style.display = 'none';
        updateInputState({ valid: false, message: '', type: '' });
        urlInput.focus();
    });

    generateBtn.addEventListener('click', generateQR);
    urlInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !generateBtn.disabled) { e.preventDefault(); generateQR(); }
    });

    downloadBtn.addEventListener('click', downloadQR);
    copyBtn.addEventListener('click', copyQR);

    fgColor.addEventListener('input', function () { fgLabel.textContent = this.value; });
    bgColor.addEventListener('input', function () { bgLabel.textContent = this.value; });

    // Escape key closes modal
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') hideModal();
    });

    urlInput.focus();
})();
