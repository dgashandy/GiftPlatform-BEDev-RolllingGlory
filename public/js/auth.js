function isLoggedIn() {
    return !!localStorage.getItem('accessToken');
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function setUser(user, tokens) {
    localStorage.setItem('user', JSON.stringify(user));
    if (tokens) {
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
    }
}

function logout() {
    api.post('/auth/logout').catch(() => { });

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    window.location.href = '/';
}

function checkAuth() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');

    if (!authButtons || !userMenu) return;

    if (isLoggedIn()) {
        authButtons.classList.add('d-none');
        userMenu.classList.remove('d-none');

        const user = getUser();
        if (user) {
            document.getElementById('userName').textContent = user.name || user.email;
        }

        loadUserPoints();
    } else {
        authButtons.classList.remove('d-none');
        userMenu.classList.add('d-none');
    }
}

async function loadUserPoints() {
    try {
        const response = await api.get('/users/me/points');
        const pointsEl = document.getElementById('userPoints');
        if (pointsEl) {
            pointsEl.textContent = formatNumber(response.data?.balance || response.balance || 0);
        }
    } catch (error) {
        console.error('Error loading points:', error);
    }
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Logging in...';

        const response = await api.post('/auth/login', { email, password });

        setUser(response.data?.user || response.user, {
            accessToken: response.data?.accessToken || response.accessToken,
            refreshToken: response.data?.refreshToken || response.refreshToken,
        });

        showToast('Login successful!', 'success');

        const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/';
        window.location.href = redirectUrl;

    } catch (error) {
        showToast(error.message, 'danger');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');

    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'danger');
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating account...';

        const response = await api.post('/auth/register', { name, email, password });
        const data = response.data || response;

        if (data.requiresVerification) {
            showOtpForm(data.email);
            showToast('Check your email for the verification code!', 'success');
        } else {
            setUser(data.user, {
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
            });
            showToast('Registration successful! You got 1000 bonus points!', 'success');
            window.location.href = '/?welcome=true';
        }

    } catch (error) {
        showToast(error.message, 'danger');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
}

function showOtpForm(email) {
    const formContainer = document.querySelector('.auth-card .card-body');
    formContainer.innerHTML = `
        <div class="text-center mb-4">
            <i class="bi bi-envelope-check fs-1 text-primary"></i>
            <h4 class="mt-3">Verify Your Email</h4>
            <p class="text-muted">We sent a verification code to<br><strong>${email}</strong></p>
        </div>
        <form onsubmit="handleVerifyOtp(event, '${email}')">
            <div class="mb-4">
                <label class="form-label">Enter 6-digit OTP</label>
                <input type="text" class="form-control form-control-lg text-center" id="otpCode" 
                    maxlength="6" pattern="[0-9]{6}" placeholder="000000" required 
                    style="letter-spacing: 8px; font-size: 24px;">
            </div>
            <button type="submit" class="btn btn-primary w-100 py-2">Verify Email</button>
            <div class="text-center mt-3">
                <button type="button" class="btn btn-link" onclick="resendOtp('${email}')">Resend Code</button>
            </div>
        </form>
    `;
}

async function handleVerifyOtp(event, email) {
    event.preventDefault();
    const otp = document.getElementById('otpCode').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verifying...';

        const response = await api.post('/auth/otp/verify', { email, otp });
        const data = response.data || response;

        setUser(data.user, {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
        });

        showToast('Email verified! You got 1000 bonus points!', 'success');
        window.location.href = '/?welcome=true';

    } catch (error) {
        showToast(error.message, 'danger');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Verify Email';
    }
}

async function resendOtp(email) {
    try {
        await api.post('/auth/otp/request', { email });
        showToast('New verification code sent!', 'success');
    } catch (error) {
        showToast(error.message, 'danger');
    }
}

function requireAuth() {
    if (!isLoggedIn()) {
        window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return false;
    }
    return true;
}

function requireRole(roles) {
    const user = getUser();
    if (!user || !roles.includes(user.role)) {
        showToast('You do not have permission to access this page', 'danger');
        window.location.href = '/';
        return false;
    }
    return true;
}
