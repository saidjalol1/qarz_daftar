# Qarz Daftar - Setup Instructions

## Backend Authentication Setup

This application now has a secure Django backend authentication system.

### Features
- ✅ Secure password hashing with Django's built-in system
- ✅ Session-based authentication with CSRF protection
- ✅ Role-based access control (Super, Manager, Cashier)
- ✅ RESTful API endpoints for authentication
- ✅ Frontend and backend integration

### Setup Steps

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run Migrations**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

3. **Seed Initial Data**
   ```bash
   python manage.py seed_data
   ```

4. **Run the Server**
   ```bash
   python manage.py runserver
   ```

5. **Access the Application**
   - Open browser: http://localhost:8000/
   - Login with default credentials:
     - **Email:** admin@qarzdaftar.uz
     - **Password:** admin123

### Default User Credentials

After running `seed_data`:
- **Email:** admin@qarzdaftar.uz
- **Password:** admin123
- **Role:** Super Admin

⚠️ **Important:** Change the default password in production!

### API Endpoints

#### Authentication
- `POST /api/login/` - User login
  ```json
  {
    "email": "admin@qarzdaftar.uz",
    "password": "admin123"
  }
  ```

- `POST /api/logout/` - User logout (requires authentication)

- `GET /api/me/` - Get current user info (requires authentication)

#### Pages (require authentication)
- `GET /` - Home (redirects to /debts/ if authenticated, /login/ otherwise)
- `GET /login/` - Login page
- `GET /debts/` - Debts management
- `GET /archive/` - Archived debts
- `GET /base/` - Products/base management
- `GET /users/` - User management (Super & Manager only)

### User Roles

1. **Super** - Full access to everything
2. **Manager** - Access to all pages except user management
3. **Cashier** - Limited access, primarily for payments

### Security Features

- Passwords are hashed using Django's PBKDF2 algorithm
- CSRF protection on all forms
- Session-based authentication with HTTP-only cookies
- Login required decorators on protected views
- Role-based access control
- SQL injection protection via Django ORM
- XSS protection with Django template escaping

### Creating Additional Users

Use Django admin or create via shell:

```bash
python manage.py shell
```

```python
from ledger.models import User

# Create a manager
User.objects.create_user(
    email='manager@example.com',
    password='secure_password',
    name='John Manager',
    phone='+998901234567',
    telegram='john_manager',
    role='manager'
)

# Create a cashier
User.objects.create_user(
    email='cashier@example.com',
    password='secure_password',
    name='Jane Cashier',
    phone='+998901234568',
    telegram='jane_cashier',
    role='cashier'
)
```

### Production Deployment Checklist

- [ ] Change SECRET_KEY in settings.py
- [ ] Set DEBUG = False
- [ ] Configure ALLOWED_HOSTS
- [ ] Set SESSION_COOKIE_SECURE = True (requires HTTPS)
- [ ] Set CSRF_COOKIE_SECURE = True (requires HTTPS)
- [ ] Use environment variables for sensitive data
- [ ] Change default admin password
- [ ] Configure proper database (PostgreSQL recommended)
- [ ] Set up static file serving with whitenoise or nginx
- [ ] Configure email backend for password resets
- [ ] Set up proper logging
- [ ] Use strong password validators

### Troubleshooting

**Login not working:**
1. Check if migrations are applied: `python manage.py migrate`
2. Check if user exists: `python manage.py shell` → `User.objects.all()`
3. Check browser console for JavaScript errors
4. Check Django logs for errors

**CSRF errors:**
1. Clear browser cookies
2. Check if CSRF token is present in the form
3. Ensure middleware is properly configured

**Session issues:**
1. Clear browser cache and cookies
2. Check session backend configuration
3. Verify database is accessible
