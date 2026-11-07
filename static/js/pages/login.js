'use strict';

// Helper to get cookie value
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Wait for DOM to be ready
function initLogin() {
  // Check if $ selector is available (from helpers.js)
  const selector = typeof $ === 'function' ? $ : (s, r = document) => r.querySelector(s);
  
  // Apply i18n if available
  if (typeof applyStatic === 'function') {
    applyStatic();
  }

  // Password toggle functionality
  const toggleBtn = selector('#toggleLoginPass');
  const passInput = selector('#lPass');
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
  fetch('/api/me/', {
    credentials: 'same-origin'
  })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && data.success) {
        // User is already logged in, redirect to debts
        window.location.href = '/debts/';
      }
    })
    .catch(() => {
      // Not logged in, continue with login form
    });

  // Get form element
  const form = selector('#loginForm');
  if (!form) {
    console.error('Login form not found');
    return;
  }

  // Handle login form submission
  form.onsubmit = async (e) => {
    e.preventDefault();
    
    const emailInput = selector('#lEmail');
    const passwordInput = selector('#lPass');
    const errDiv = selector('#lErr');
    
    if (!emailInput || !passwordInput || !errDiv) {
      console.error('Form elements not found');
      return;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // Clear previous errors
    errDiv.textContent = '';
    
    if (!email || !password) {
      // Use disp and t if available, otherwise use plain text
      const errorMsg = typeof disp === 'function' && typeof t === 'function' 
        ? disp(t('login.err')) 
        : 'Email va parol kiritilishi shart';
      errDiv.textContent = errorMsg;
      return;
    }
    
    try {
      // Get CSRF token from cookie
      const csrftoken = getCookie('csrftoken');
      
      if (!csrftoken) {
        const errorMsg = typeof disp === 'function'
          ? disp('CSRF token topilmadi. Sahifani yangilang.')
          : 'CSRF token topilmadi. Sahifani yangilang.';
        errDiv.textContent = errorMsg;
        console.error('CSRF token not found. Available cookies:', document.cookie);
        return;
      }
      
      console.log('Attempting login with email:', email);
      console.log('CSRF token found:', csrftoken.substring(0, 10) + '...');
      
      // Send login request - CSRF token in HEADER, not URL
      const response = await fetch('/api/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      });
      
      console.log('Login response status:', response.status);
      
      const data = await response.json();
      console.log('Login response data:', data);
      
      if (response.ok && data.success) {
        // Store user in sessionStorage for frontend use
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.setItem('qd_me', JSON.stringify(data.user));
        }
        
        console.log('Login successful, redirecting to /debts/');
        
        // Redirect to debts page
        window.location.href = '/debts/';
      } else {
        // Show error message
        const errorMsg = typeof disp === 'function' 
          ? disp(data.error || 'Email yoki parol noto\'g\'ri')
          : (data.error || 'Email yoki parol noto\'g\'ri');
        errDiv.textContent = errorMsg;
        console.error('Login failed:', data.error);
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMsg = typeof disp === 'function' && typeof t === 'function'
        ? disp(t('login.err'))
        : 'Xatolik yuz berdi';
      errDiv.textContent = errorMsg;
    }
  };
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLogin);
} else {
  initLogin();
}
