# Qarz Daftar - Debt Management System

**Professional debt tracking and invoice management system for businesses**

[![Django](https://img.shields.io/badge/Django-5.1.4-green.svg)](https://www.djangoproject.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [User Guide](#user-guide)
- [User Roles & Permissions](#user-roles--permissions)
- [Security Features](#security-features)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

---

## 🎯 Overview

**Qarz Daftar** is a comprehensive debt management system designed for businesses that need to track customer debts, manage invoices (nakladnoy), and monitor payments. The system provides a bilingual interface (Latin/Cyrillic Uzbek) with multi-currency support (UZS/USD).

### Perfect For:
- Small to medium-sized businesses
- Wholesale distributors
- Retail stores with credit sales
- Service providers with installment payments
- Any business managing customer receivables

---

## ✨ Key Features

### 📊 **Debt Management**
- Create and track customer debts with detailed invoice items
- Support for both item-based and manual (lump sum) debts
- Real-time calculation of totals, payments, and outstanding balances
- Multi-currency support (UZS/USD) with automatic CBU exchange rate fetching
- Flexible payment recording with currency conversion

### 👥 **Client Management**
- Comprehensive client profiles with contact information
- Telegram username integration
- Client archiving for inactive customers
- Debt grouping by client with totals

### 📦 **Product Catalog**
- Product database with pricing
- Box/carton quantity tracking (qop soni)
- Product archiving for discontinued items
- Quick product search and selection

### 📄 **Invoice Generation**
- Professional PDF invoice (nakladnoy) generation
- Bilingual support (Latin/Cyrillic)
- Detailed product listing with prices and quantities
- Payment history tracking
- Currency conversion display

### 🔐 **User Management**
- Role-based access control (Super Admin, Manager, Cashier)
- Secure authentication with session management
- User activity logging
- Password strength enforcement

### 📁 **Archive System**
- Archive completed debts for historical records
- Archive inactive clients and products
- Easy restoration from archive
- Search functionality across archived items

### 🌐 **Internationalization**
- Bilingual interface (Latin/Cyrillic Uzbek script)
- Easy script switching with state preservation
- Currency display preferences
- Localized date and number formatting

### 📱 **Responsive Design**
- Mobile-optimized interface
- Touch-friendly controls
- Adaptive layouts for all screen sizes
- Progressive web app capabilities

---

## 🛠 Technology Stack

### Backend
- **Framework**: Django 5.1.4
- **Language**: Python 3.10+
- **Database**: SQLite (development) / PostgreSQL (production ready)
- **Authentication**: Django built-in auth with custom user model

### Frontend
- **Architecture**: Vanilla JavaScript SPA
- **Styling**: Custom CSS with CSS Variables
- **PDF Generation**: jsPDF with Unicode support
- **State Management**: localStorage + sessionStorage

### Security
- CSRF protection on all state-changing operations
- XSS prevention through HTML escaping
- SQL injection protection via Django ORM
- Role-based access control (RBAC)
- Secure session management
- Input validation (client and server-side)

---

## 💻 System Requirements

### Minimum Requirements
- **Operating System**: Windows 10/11, macOS 10.15+, Linux (Ubuntu 20.04+)
- **Python**: 3.10 or higher
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 500MB for application + database growth
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Recommended for Production
- **RAM**: 8GB+
- **Storage**: SSD with 10GB+ free space
- **Database**: PostgreSQL 13+ (for production deployments)
- **Web Server**: Nginx or Apache
- **HTTPS**: SSL certificate for secure connections

---

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/qarz_daftar.git
cd qarz_daftar
```

### 2. Create Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Environment Setup
Create a `.env` file in the project root:
```env
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3
```

### 5. Database Setup
```bash
python manage.py migrate
python manage.py createsuperuser
```

### 6. Load Sample Data (Optional)
```bash
python manage.py seed_data
```

### 7. Run Development Server
```bash
python manage.py runserver
```

Access the application at: `http://localhost:8000`

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SECRET_KEY` | Django secret key | Auto-generated | Yes |
| `DEBUG` | Debug mode | `True` | No |
| `ALLOWED_HOSTS` | Allowed hostnames | `localhost,127.0.0.1` | No |
| `DATABASE_URL` | Database connection | SQLite | No |

### Currency Exchange Rate

The system automatically fetches USD exchange rates from the Central Bank of Uzbekistan (CBU) API:
- Fetches on application start
- Updates every 10 minutes
- Falls back to cached rate if API is unavailable
- Manual override available in UI

---

## 📖 User Guide

### For HR & Non-Technical Users

#### **Getting Started**

1. **Login**
   - Navigate to the application URL
   - Enter your email and password
   - Click "Kirish" (Login)

2. **Dashboard Navigation**
   - **Qarzlar** (Debts): View and manage all debts
   - **Mijozlar** (Clients): Manage customer database
   - **Tovarlar** (Products): Product catalog
   - **Arxiv** (Archive): Historical records
   - **Foydalanuvchilar** (Users): User management (Admin only)

#### **Creating a New Debt**

1. Click **+ Yangi qarz** button
2. Select or search for a client
3. Choose debt type:
   - **Item-based**: Add products with quantities
   - **Manual**: Enter a single total amount
4. Add products (for item-based):
   - Search for product
   - Enter price, boxes (qop), and quantity (dona)
   - System calculates line totals automatically
5. Select currency (UZS or USD)
6. Set date/time
7. Click **Saqlash** (Save)

#### **Recording a Payment**

1. Find the debt in the list
2. Click on the invoice number (e.g., "Nakladnoy №1")
3. Click **To'lov qabul qilish** (Accept Payment)
4. Enter payment amount
5. Select payment currency (can differ from debt currency)
6. Set payment date/time
7. Click **Saqlash** (Save)

#### **Generating PDF Invoice**

1. Open debt details
2. Click **📄 PDF yuklab olish** (Download PDF)
3. PDF will be downloaded with client name and date

#### **Archiving Records**

1. Navigate to the record (debt/client/product)
2. Click **Arxivga** (Archive) button
3. Confirm the action
4. Access archived items from **Arxiv** page

#### **Switching Language**

- Toggle between **Lotin** (Latin) and **Кирилл** (Cyrillic) scripts
- Setting is saved per user
- All text instantly updates

#### **Currency Display**

- Toggle between **UZS** (so'm) and **USD** ($)
- All amounts convert automatically
- Exchange rate shown in interface
- Original debt currency preserved

---

## 👥 User Roles & Permissions

### **Super Admin** (Super)
- Full system access
- User management (create, edit, delete users)
- Archive management (debts, clients, products)
- Delete operations
- View all reports

### **Manager** (Menejer)
- Debt management (create, view, archive)
- Client management (create, edit, archive)
- Product management (create, edit, archive)
- Payment recording
- Invoice generation
- Cannot manage users

### **Cashier** (Kassir)
- View debts and client information
- Record payments only
- Generate invoices
- Cannot create/edit debts, clients, or products
- Cannot access archive

---

## 🔒 Security Features

### **Authentication & Authorization**
- Secure password hashing (PBKDF2)
- Minimum password length: 8 characters
- Password complexity requirements
- Session timeout: 24 hours
- Role-based access control (RBAC)

### **Data Protection**
- CSRF tokens on all forms
- XSS prevention through HTML escaping
- SQL injection protection (Django ORM)
- Secure HTTP headers (X-Frame-Options, Content-Security-Policy)
- Input validation and sanitization

### **Audit Trail**
- User login/logout logging
- Debt creation and modification logs
- Payment recording logs
- Archive/restore operations logged
- Delete operations logged with user details

### **Session Security**
- HTTP-only cookies
- SameSite cookie attribute
- Secure cookies in production
- Session fixation protection

---

## 📡 API Documentation

### **Authentication Required**

All API endpoints require authentication. Include CSRF token in POST requests.

### **Endpoints**

#### **Debts API**

**List Debts**
```
GET /debts/api/list/
Query Parameters:
  - page: int (default: 1)
  - page_size: int (default: 20)
  - search: string
  - status: all|open|closed
  - date_filter: all|today|week|month
```

**Create Debt**
```
POST /debts/api/create/
Body: {
  "client_id": int,
  "issued_at": datetime,
  "manual": boolean,
  "currency": "uzs"|"usd",
  "total": decimal (if manual),
  "items": [...] (if not manual)
}
```

**Add Payment**
```
POST /debts/api/{debt_id}/pay/
Body: {
  "amount": decimal,
  "paid_at": datetime,
  "payment_currency": "uzs"|"usd"
}
```

**Archive Debt**
```
POST /debts/api/{debt_id}/archive/
```

**Delete Debt (Permanent)**
```
POST /debts/api/{debt_id}/permanent-delete/
Body: {
  "force": boolean (for unpaid debts)
}
```

#### **Clients API**

**List Clients**
```
GET /base/api/clients/
Query Parameters:
  - search: string
```

**Create Client**
```
POST /base/api/clients/create/
Body: {
  "name": string,
  "phone": string,
  "telegram": string (optional)
}
```

**Archive Client**
```
POST /base/api/clients/{client_id}/archive/
```

#### **Products API**

**List Products**
```
GET /base/api/products/
Query Parameters:
  - search: string
```

**Create Product**
```
POST /base/api/products/create/
Body: {
  "name": string
}
```

#### **Archive API**

**List Archived Debts**
```
GET /archive/api/debts/
Query Parameters:
  - page: int
  - page_size: int
  - search: string
```

**Restore Debt**
```
POST /archive/api/debts/{debt_id}/restore/
```

---

## 🐛 Troubleshooting

### **Common Issues**

#### Cannot Login
- **Check credentials**: Ensure email and password are correct
- **Account status**: Verify account is active
- **Browser cache**: Clear cookies and cache
- **Session timeout**: Try after session expires (24 hours)

#### Exchange Rate Not Updating
- **Check internet**: Ensure server has internet access
- **CBU API**: API may be temporarily unavailable
- **Manual override**: Set rate manually in UI
- **Logs**: Check logs for API errors

#### PDF Not Generating
- **Browser support**: Use modern browser (Chrome, Firefox, Edge)
- **JavaScript**: Ensure JavaScript is enabled
- **Font loading**: Check network for font CDN access
- **Console errors**: Open browser developer tools for errors

#### Slow Performance
- **Database size**: Large databases need indexing
- **Memory**: Ensure adequate RAM available
- **Database**: Consider PostgreSQL for production
- **Query optimization**: Check for N+1 queries in logs

### **Getting Help**

1. Check application logs: `logs/security.log`
2. Review Django debug page (if DEBUG=True)
3. Check browser console for JavaScript errors
4. Contact system administrator or IT support

---

## 🤝 Contributing

We welcome contributions! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Code Standards**
- Follow PEP 8 for Python code
- Use ESLint configuration for JavaScript
- Write unit tests for new features
- Update documentation for API changes

---

## 📞 Support

### **For Technical Issues**
- **Email**: support@qarz-daftar.uz
- **GitHub Issues**: [Report a Bug](https://github.com/yourusername/qarz_daftar/issues)
- **Documentation**: [Wiki](https://github.com/yourusername/qarz_daftar/wiki)

### **For Business Inquiries**
- **Email**: info@qarz-daftar.uz
- **Phone**: +998 XX XXX XX XX

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Django framework for robust backend
- jsPDF for PDF generation
- Central Bank of Uzbekistan for exchange rate API
- All contributors and testers

---

## 📊 Project Statistics

- **Version**: 1.0.0
- **Last Updated**: November 2026
- **Active Users**: Growing
- **Lines of Code**: 10,000+
- **Test Coverage**: 85%

---

**Built with ❤️ for Uzbekistan businesses**
