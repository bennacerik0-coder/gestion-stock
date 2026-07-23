(function() {
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = '/dashboard.html';
    return;
  }

  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  const form = document.getElementById('login-form');
  const errorDiv = document.getElementById('login-error');
  const btn = document.getElementById('btn-login');

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    errorDiv.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<span>Connexion en cours...</span>';

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Erreur de connexion');
      }

      localStorage.setItem('token', data.token);
      window.location.href = '/dashboard.html';
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<span>Connexion</span>';
    }
  });
})();

function toggleLoginTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}
