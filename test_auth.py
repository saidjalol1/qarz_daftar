"""
Quick test script to verify authentication is working
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from ledger.models import User
from django.contrib.auth import authenticate

print("=" * 50)
print("Testing Authentication System")
print("=" * 50)

# Test 1: Check if user exists
print("\n1. Checking if admin user exists...")
try:
    user = User.objects.get(email='admin@qarzdaftar.uz')
    print(f"✓ User found: {user.name} ({user.email})")
    print(f"  Role: {user.role}")
    print(f"  Is active: {user.is_active}")
    print(f"  Is staff: {user.is_staff}")
except User.DoesNotExist:
    print("✗ User not found!")
    exit(1)

# Test 2: Test authentication
print("\n2. Testing authentication...")
auth_user = authenticate(username='admin@qarzdaftar.uz', password='admin123')
if auth_user:
    print(f"✓ Authentication successful for: {auth_user.email}")
else:
    print("✗ Authentication failed!")
    exit(1)

# Test 3: Test wrong password
print("\n3. Testing wrong password...")
auth_user = authenticate(username='admin@qarzdaftar.uz', password='wrongpassword')
if not auth_user:
    print("✓ Correctly rejected wrong password")
else:
    print("✗ Security issue: accepted wrong password!")
    exit(1)

# Test 4: List all users
print("\n4. Listing all users...")
users = User.objects.all()
print(f"Total users: {users.count()}")
for u in users:
    print(f"  - {u.name} ({u.email}) - Role: {u.role}")

print("\n" + "=" * 50)
print("✅ All authentication tests passed!")
print("=" * 50)
print("\nYou can now start the server with:")
print("  python manage.py runserver")
print("\nThen visit: http://localhost:8000/")
print("Login with:")
print("  Email: admin@qarzdaftar.uz")
print("  Password: admin123")
