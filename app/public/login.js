document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = {
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
      };

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin'
      });

      const data = await response.json();
      const message = document.getElementById('login-message');
      if (!response.ok) {
        message.textContent = `❌ ${data.message}`;
        return;
      }

      message.textContent = `✅ ${data.message}. Đang chuyển về trang chủ...`;
      setTimeout(() => window.location.href = '/', 800);
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = {
        name: document.getElementById('register-name').value,
        email: document.getElementById('register-email').value,
        password: document.getElementById('register-password').value
      };

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin'
      });

      const data = await response.json();
      const message = document.getElementById('register-message');
      if (!response.ok) {
        message.textContent = `❌ ${data.message}`;
        return;
      }

      message.textContent = `✅ ${data.message}. Đang chuyển về trang chủ...`;
      setTimeout(() => window.location.href = '/', 800);
    });
  }
});
