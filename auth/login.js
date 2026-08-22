(() => {
  const form = document.getElementById('loginForm');
  const username = document.getElementById('username');
  const password = document.getElementById('password');
  const error = document.getElementById('loginError');
  const submit = document.getElementById('loginButton');
  const toggle = document.getElementById('togglePassword');

  const params = new URLSearchParams(window.location.search);
  const requestedNext = params.get('next') || '/';
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/';

  toggle?.addEventListener('click', () => {
    const showing = password.type === 'text';
    password.type = showing ? 'password' : 'text';
    toggle.textContent = showing ? 'Ver' : 'Ocultar';
    toggle.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
    password.focus();
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.textContent = '';

    if (!username.value.trim() || !password.value) {
      error.textContent = 'Completá usuario y contraseña.';
      return;
    }

    submit.disabled = true;
    submit.querySelector('span').textContent = 'Ingresando...';

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          username: username.value.trim(),
          password: password.value
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        error.textContent = data.error || 'No se pudo iniciar sesión.';
        password.select();
        return;
      }

      window.location.replace(next);
    } catch {
      error.textContent = 'No se pudo conectar con el servidor.';
    } finally {
      submit.disabled = false;
      submit.querySelector('span').textContent = 'Ingresar';
    }
  });

  username?.focus();
})();
