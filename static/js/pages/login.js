'use strict';

// Wait for DOM to be ready
function initLogin() {
  applyStatic();

  // Password toggle functionality
  const toggleBtn = $('#toggleLoginPass');
  const passInput = $('#lPass');
  const EYE_OPEN = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
  const EYE_SHUT = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
  if (toggleBtn && passInput) {
    toggleBtn.onclick = (e) => {
      e.preventDefault();
      const hide = passInput.type === 'password';
      passInput.type = hide ? 'text' : 'password';
      toggleBtn.querySelector('svg').innerHTML = hide ? EYE_SHUT : EYE_OPEN;
    };
  }

  // Check if already logged in
  fetch('/api/me/')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && data.success) {
        // User is already logged in, redirect to debts
        location.href = '/debts/';
      }
    })
    .catch(() => {});

  // Get form element
  const form = $('#loginForm');
  if (!form) {
    console.error('Login form not found');
    return;
  }

  // Handle login form submission
  form.onsubmit = async (e) => {
    e.preventDefault();
    
    const email = $('#lEmail').value.trim();
    const password = $('#lPass').value;
    const errDiv = $('#lErr');
    
    // Clear previous errors
    errDiv.textContent = '';
    
    if (!email || !password) {
      errDiv.textContent = disp(t('login.err') || 'Email va parol kiritilishi shart');
      return;
    }
    
    try {
      // Get CSRF token
      const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
      
      // Send login request
      const response = await fetch('/api/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken,
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store user in sessionStorage for frontend use
        me = data.user;
        sessionStorage.setItem('qd_me', JSON.stringify(data.user));
        
        // Redirect to debts page
        location.href = '/debts/';
      } else {
        errDiv.textContent = disp(data.error || t('login.err') || 'Email yoki parol noto\'g\'ri');
      }
    } catch (error) {
      console.error('Login error:', error);
      errDiv.textContent = disp(t('login.err') || 'Xatolik yuz berdi');
    }
  };
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLogin);
} else {
  initLogin();
}
