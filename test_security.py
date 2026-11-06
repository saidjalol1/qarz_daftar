"""
Security and User Management Testing Script
Tests all implemented security features and user CRUD operations
"""

import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"
session = requests.Session()

def print_result(test_name, passed, message=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {test_name}")
    if message:
        print(f"   {message}")
    print()

def get_csrf_token():
    """Get CSRF token from login page"""
    response = session.get(f"{BASE_URL}/login/")
    if 'csrftoken' in session.cookies:
        return session.cookies['csrftoken']
    return None

def test_rate_limiting():
    """Test rate limiting on login endpoint (5 attempts per minute)"""
    print("=" * 60)
    print("TEST 1: Rate Limiting")
    print("=" * 60)
    
    csrf = get_csrf_token()
    headers = {'X-CSRFToken': csrf, 'Content-Type': 'application/json'}
    
    # Try 6 failed login attempts
    for i in range(6):
        response = session.post(
            f"{BASE_URL}/api/login/",
            headers=headers,
            json={"email": "wrong@test.com", "password": "wrongpass"}
        )
        
        if i < 5:
            # First 5 should get 401 Unauthorized
            print_result(
                f"Attempt {i+1}/6",
                response.status_code == 401,
                f"Status: {response.status_code} (expected 401)"
            )
        else:
            # 6th should be rate limited (403 or 429)
            print_result(
                f"Attempt {i+1}/6 (Should be blocked)",
                response.status_code in [403, 429],
                f"Status: {response.status_code} (expected 403 or 429)"
            )
    
    time.sleep(1)  # Wait before next test

def test_login_success():
    """Test successful login"""
    print("=" * 60)
    print("TEST 2: Successful Login")
    print("=" * 60)
    
    # Wait for rate limit to reset (1 minute window)
    print("⏳ Waiting 65 seconds for rate limit to reset...")
    time.sleep(65)
    
    # Use new session to bypass rate limit
    global session
    session = requests.Session()
    
    csrf = get_csrf_token()
    headers = {'X-CSRFToken': csrf, 'Content-Type': 'application/json'}
    
    response = session.post(
        f"{BASE_URL}/api/login/",
        headers=headers,
        json={"email": "admin@qarzdaftar.uz", "password": "admin123"}
    )
    
    data = response.json()
    success = response.status_code == 200 and data.get('success') == True
    
    print_result(
        "Login with valid credentials",
        success,
        f"Status: {response.status_code}, User: {data.get('user', {}).get('name', 'N/A')}"
    )
    
    return success

def test_get_current_user():
    """Test /api/me/ endpoint"""
    print("=" * 60)
    print("TEST 3: Get Current User")
    print("=" * 60)
    
    response = session.get(f"{BASE_URL}/api/me/")
    data = response.json()
    success = response.status_code == 200 and data.get('success') == True
    
    print_result(
        "Get authenticated user info",
        success,
        f"User: {data.get('user', {}).get('name', 'N/A')} ({data.get('user', {}).get('role', 'N/A')})"
    )
    
    return success

def test_list_users():
    """Test listing users"""
    print("=" * 60)
    print("TEST 4: List Users")
    print("=" * 60)
    
    response = session.get(f"{BASE_URL}/api/users/")
    data = response.json()
    success = response.status_code == 200 and data.get('success') == True
    
    user_count = len(data.get('users', []))
    print_result(
        "Get list of users",
        success,
        f"Found {user_count} user(s)"
    )
    
    return success, data.get('users', [])

def test_create_user():
    """Test creating a new user with validation"""
    print("=" * 60)
    print("TEST 5: Create User with Validation")
    print("=" * 60)
    
    csrf = session.cookies.get('csrftoken')
    headers = {'X-CSRFToken': csrf, 'Content-Type': 'application/json'}
    
    # Test 1: Weak password (should fail)
    response = session.post(
        f"{BASE_URL}/api/users/create/",
        headers=headers,
        json={
            "name": "Test User",
            "email": "test@test.com",
            "phone": "+998901234567",
            "telegram": "testuser",
            "password": "123",
            "role": "cashier"
        }
    )
    
    data = response.json()
    print_result(
        "Reject weak password",
        response.status_code == 400 and not data.get('success'),
        f"Error: {data.get('error', 'N/A')}"
    )
    
    # Test 2: Valid user creation
    response = session.post(
        f"{BASE_URL}/api/users/create/",
        headers=headers,
        json={
            "name": "Test Manager",
            "email": "testmanager@test.com",
            "phone": "+998901234567",
            "telegram": "testmanager",
            "password": "SecurePass123!",
            "role": "manager"
        }
    )
    
    data = response.json()
    success = response.status_code == 200 and data.get('success') == True
    user_id = data.get('user', {}).get('id')
    
    print_result(
        "Create valid user",
        success,
        f"Created user ID: {user_id}, Name: {data.get('user', {}).get('name', 'N/A')}"
    )
    
    return success, user_id

def test_update_user(user_id):
    """Test updating a user"""
    print("=" * 60)
    print("TEST 6: Update User")
    print("=" * 60)
    
    csrf = session.cookies.get('csrftoken')
    headers = {'X-CSRFToken': csrf, 'Content-Type': 'application/json'}
    
    response = session.post(
        f"{BASE_URL}/api/users/{user_id}/update/",
        headers=headers,
        json={
            "name": "Test Manager Updated",
            "phone": "+998909876543",
            "telegram": "testmanager_updated",
            "password": "",  # No password change
            "role": "manager"
        }
    )
    
    data = response.json()
    success = response.status_code == 200 and data.get('success') == True
    
    print_result(
        "Update user details",
        success,
        f"Updated user: {data.get('user', {}).get('name', 'N/A')}"
    )
    
    return success

def test_super_admin_protection():
    """Test that super admin cannot be deleted"""
    print("=" * 60)
    print("TEST 7: Super Admin Protection")
    print("=" * 60)
    
    # Get list of users to find super admin
    response = session.get(f"{BASE_URL}/api/users/")
    data = response.json()
    
    super_user = None
    for user in data.get('users', []):
        if user.get('role') == 'super':
            super_user = user
            break
    
    if not super_user:
        print_result("Find super admin", False, "No super admin found")
        return False
    
    # Try to delete super admin (should fail)
    csrf = session.cookies.get('csrftoken')
    headers = {'X-CSRFToken': csrf}
    
    response = session.post(
        f"{BASE_URL}/api/users/{super_user['id']}/delete/",
        headers=headers
    )
    
    data = response.json()
    success = response.status_code == 400 and not data.get('success')
    
    print_result(
        "Block super admin deletion",
        success,
        f"Error message: {data.get('error', 'N/A')}"
    )
    
    return success

def test_delete_user(user_id):
    """Test deleting a user"""
    print("=" * 60)
    print("TEST 8: Delete User")
    print("=" * 60)
    
    csrf = session.cookies.get('csrftoken')
    headers = {'X-CSRFToken': csrf}
    
    response = session.post(
        f"{BASE_URL}/api/users/{user_id}/delete/",
        headers=headers
    )
    
    data = response.json()
    success = response.status_code == 200 and data.get('success') == True
    
    print_result(
        "Delete user",
        success,
        f"Message: {data.get('message', 'N/A')}"
    )
    
    return success

def test_logout():
    """Test logout"""
    print("=" * 60)
    print("TEST 9: Logout")
    print("=" * 60)
    
    csrf = session.cookies.get('csrftoken')
    headers = {'X-CSRFToken': csrf}
    
    response = session.post(f"{BASE_URL}/api/logout/", headers=headers)
    data = response.json()
    success = response.status_code == 200 and data.get('success') == True
    
    print_result(
        "Logout successfully",
        success
    )
    
    return success

def test_unauthorized_access():
    """Test that unauthorized users cannot access protected endpoints"""
    print("=" * 60)
    print("TEST 10: Authorization Check")
    print("=" * 60)
    
    response = session.get(f"{BASE_URL}/api/users/")
    success = response.status_code == 302  # Should redirect to login
    
    print_result(
        "Block unauthorized access",
        success,
        f"Status: {response.status_code} (expected 302 redirect)"
    )
    
    return success

def run_all_tests():
    """Run all security and functionality tests"""
    print("\n")
    print("╔" + "=" * 58 + "╗")
    print("║" + " " * 10 + "SECURITY & USER MANAGEMENT TESTS" + " " * 16 + "║")
    print("╚" + "=" * 58 + "╝")
    print("\n")
    
    try:
        # Test 1: Rate limiting
        test_rate_limiting()
        
        # Test 2-3: Login and authentication
        if not test_login_success():
            print("⚠️  Login failed. Cannot continue with other tests.")
            return
        
        test_get_current_user()
        
        # Test 4: List users
        test_list_users()
        
        # Test 5: Create user
        created, user_id = test_create_user()
        
        # Test 6: Update user (if creation succeeded)
        if created and user_id:
            test_update_user(user_id)
        
        # Test 7: Super admin protection
        test_super_admin_protection()
        
        # Test 8: Delete user (if creation succeeded)
        if created and user_id:
            test_delete_user(user_id)
        
        # Test 9: Logout
        test_logout()
        
        # Test 10: Unauthorized access
        test_unauthorized_access()
        
        print("\n")
        print("╔" + "=" * 58 + "╗")
        print("║" + " " * 18 + "TESTS COMPLETED" + " " * 25 + "║")
        print("╚" + "=" * 58 + "╝")
        print("\n")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}\n")

if __name__ == "__main__":
    print("\nStarting security tests...")
    print("Make sure Django server is running on http://127.0.0.1:8000")
    print("Waiting 2 seconds...\n")
    time.sleep(2)
    
    run_all_tests()
