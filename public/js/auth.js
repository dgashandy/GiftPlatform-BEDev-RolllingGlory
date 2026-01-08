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

        setUser(response.data?.user || response.user, {
            accessToken: response.data?.accessToken || response.accessToken,
            refreshToken: response.data?.refreshToken || response.refreshToken,
        });

        showToast('Registration successful! You got 1000 bonus points!', 'success');

        window.location.href = '/?welcome=true';

    } catch (error) {
        showToast(error.message, 'danger');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
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
