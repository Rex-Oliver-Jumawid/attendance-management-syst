# Church Management System Refactor - Complete

## Summary of Changes

This refactor transformed the attendance tracking system into a comprehensive church management system with financial tracking capabilities.

## ✅ Completed Tasks

### 1. User Model Schema Update

- **File:** `backend/src/models/User.js`
- Removed 'user' from role enum (only 'moderator' and 'admin' remain)
- Added `qrCode` field (String, unique, indexed)
- Added `qrCodeImage` field (Base64 PNG image)
- Added pre-save hook to automatically generate permanent QR codes
- Uses crypto.randomBytes(32) for unique QR tokens
- Uses qrcode.toDataURL() for PNG generation

### 2. Contribution Model

- **File:** `backend/src/models/Contribution.js`
- Tracks financial contributions per mass schedule
- Fields: userId, scheduleId, amount, recordedBy, date, notes
- Indexes for efficient queries on scheduleId, userId, and date

### 3. Expense Model

- **File:** `backend/src/models/Expense.js`
- Tracks monthly church expenses
- Fields: description, amount, category, month, year, recordedBy, date, notes
- Categories: Utilities, Maintenance, Supplies, Events, Salaries, Charity, Other
- Indexes for monthly queries

### 4. Registration Removal

- **Files:** `backend/src/routes/auth.routes.js`, `html/login.html`
- Removed `registration.html` page
- Removed POST /api/auth/register route
- Removed "Create new account" button from login page
- Only moderators/admins can create new users now

### 5. Moderator User Registration UI

- **Files:** `html/moderator/moderator.html`, `js/moderator/user-registration.js`
- Added "Users" tab to moderator dashboard
- Registration form: firstName, lastName, username, email, password, phoneNumber
- Displays all users with QR codes visible as 50x50 images
- Download QR button for each user (downloads as PNG)
- Activate/Deactivate user status buttons
- Search functionality for filtering users

### 6. Moderator User Registration Backend

- **Files:** `backend/src/routes/moderator.routes.js`, `backend/src/controllers/moderator.controller.js`
- POST /api/moderator/users/register - creates user with permanent QR code
- GET /api/moderator/users - lists all users
- PATCH /api/moderator/users/:id/status - activate/deactivate users
- Validates required fields and checks for duplicate username/email
- Automatically generates QR code via User model pre-save hook

### 7. Contribution Tracking UI

- **Files:** `html/moderator/moderator.html`, `js/moderator/contributions.js`
- Added "Contributions" section to moderator dashboard
- Form to record contributions: select user, schedule, amount, notes
- Table showing all contributions with filters
- Filter by schedule and date
- Displays user, schedule, amount, recorded by moderator, notes

### 8. Expense Tracking UI

- **Files:** `html/moderator/moderator.html`, `js/moderator/expenses.js`
- Added "Expenses" section to moderator dashboard
- Form to record expenses: description, amount, category, month, year, notes
- Table showing all expenses with filters
- Filter by month, year, and category
- Auto-populates current year in form

### 9. Admin Finance Dashboard

- **Files:** `html/admin/admin.html`, `js/admin/finance.js`
- Added "Finance" tab to admin dashboard
- Summary cards: Total Contributions, Total Expenses, Net Balance
- Filter by month and year
- Tabs to switch between Contributions and Expenses views
- Monthly breakdown table showing contributions, expenses, and balance per month
- Refresh button to reload data

### 10. Authentication & Role System Updates

- **File:** `backend/src/controllers/moderator.controller.js`
- Updated scanQR() to work with permanent QR codes instead of sessions
- Finds user by permanent qrCode field
- Checks for duplicate attendance on same day for same schedule
- No longer uses AttendanceSession model for scanning
- **File:** `backend/src/models/AttendanceRecord.js`
- Made sessionId optional (not required for permanent QR codes)
- **File:** `backend/migrate-qr-codes.js`
- Migration script to add QR codes to existing users

## API Endpoints Added

### Moderator Endpoints

- POST `/api/moderator/users/register` - Register new user
- GET `/api/moderator/users` - Get all users
- PATCH `/api/moderator/users/:id/status` - Update user status
- POST `/api/moderator/contributions` - Record contribution
- GET `/api/moderator/contributions` - Get all contributions
- POST `/api/moderator/expenses` - Record expense
- GET `/api/moderator/expenses` - Get all expenses

### Updated Endpoints

- POST `/api/moderator/scan` - Now accepts permanent QR codes and scheduleId

## Database Models

### New Models

1. **Contribution**

   - Tracks who contributed, how much, for which schedule
   - Links to User, MassSchedule, and recorded by moderator

2. **Expense**
   - Monthly expense tracking with categories
   - Recorded by moderator with notes

### Updated Models

1. **User**

   - Added qrCode and qrCodeImage fields
   - Role enum changed from ['user', 'moderator', 'admin'] to ['moderator', 'admin']
   - Pre-save hook generates permanent QR codes automatically

2. **AttendanceRecord**
   - sessionId now optional (for permanent QR codes)

## Migration Steps

To migrate existing database:

```bash
cd backend
node migrate-qr-codes.js
```

This will:

- Find all users without QR codes
- Generate permanent QR codes for them
- Save QR code images as Base64 PNG

## Key Changes from Old System

### Before (Temporary QR Codes)

- Users generated temporary QR codes (5-minute expiry)
- QR codes were single-use
- Required AttendanceSession model
- Users self-registered

### After (Permanent QR Codes)

- Each user has ONE permanent QR code
- QR code never expires
- Can be scanned multiple times (once per schedule per day)
- Only moderators/admins can register users
- Financial tracking integrated
- No user role - only moderator and admin

## Features Added

✅ Permanent user QR codes
✅ Moderator user registration
✅ Contribution tracking per schedule
✅ Monthly expense tracking with categories
✅ Admin finance dashboard with summaries
✅ Monthly financial breakdown
✅ User management by moderators
✅ QR code download as PNG
✅ Duplicate attendance prevention (same day, same schedule)

## Testing Checklist

- [ ] Run migration script for existing users
- [ ] Test moderator user registration
- [ ] Test QR code scanning with permanent codes
- [ ] Test contribution recording
- [ ] Test expense recording
- [ ] Test admin finance dashboard filters
- [ ] Test user activation/deactivation
- [ ] Test QR code download
- [ ] Verify duplicate attendance prevention
- [ ] Test login with moderator/admin accounts

## Notes

- Keep user.html for now (moderators can use it to view their own data)
- Old AttendanceSession functionality still exists but unused for new permanent QR flow
- All financial data uses Philippine Peso (₱) currency
- QR codes are 300x300px for modal display, 50x50px in tables
