const API_BASE_URL = '';

const api = {
    getToken() {
        return localStorage.getItem('accessToken');
    },

    async request(method, endpoint, data = null) {
        const headers = {
            'Content-Type': 'application/json',
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method,
            headers,
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        if (response.status === 401) {
            const refreshed = await this.refreshToken();
            if (refreshed) {
                headers['Authorization'] = `Bearer ${this.getToken()}`;
                return fetch(`${API_BASE_URL}${endpoint}`, { ...config, headers }).then(r => r.json());
            }
        }

        const json = await response.json();

        if (!response.ok) {
            throw new Error(json.errors?.[0]?.detail || json.message || 'Request failed');
        }

        return json;
    },

    async get(endpoint) {
        return this.request('GET', endpoint);
    },

    async post(endpoint, data) {
        return this.request('POST', endpoint, data);
    },

    async put(endpoint, data) {
        return this.request('PUT', endpoint, data);
    },

    async patch(endpoint, data) {
        return this.request('PATCH', endpoint, data);
    },

    async delete(endpoint) {
        return this.request('DELETE', endpoint);
    },

    async refreshToken() {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                return true;
            }
        } catch (error) {
        }

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        return false;
    },
};

function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast show align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 5000);
}

function formatNumber(num) {
    return num?.toLocaleString() || '0';
}

function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    let html = '';
    for (let i = 0; i < fullStars; i++) {
        html += '<i class="bi bi-star-fill text-warning"></i>';
    }
    if (halfStar) {
        html += '<i class="bi bi-star-half text-warning"></i>';
    }
    for (let i = 0; i < emptyStars; i++) {
        html += '<i class="bi bi-star text-warning"></i>';
    }
    return html;
}
