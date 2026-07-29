# Cordium Church Attendance System

Cordium is a QR-based church attendance management system with role-based dashboards for members, moderators, and administrators. The frontend is built with static HTML, CSS, and JavaScript, while the backend is a Node.js/Express API backed by MongoDB.

## Features

- Member registration and authentication
- Permanent member QR code generation
- QR code attendance scanning for moderators
- Mass schedule management
- Attendance history and attendance reports
- Moderator assignment and user management
- Contributions, expenses, and available balance tracking
- Optional email notifications for new mass schedules and absence follow-ups
- Role-based access for `member`, `moderator`, and `admin`

## Tech Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- Authentication: JWT
- Email: Nodemailer
- QR codes: `qrcode`

## Project Structure

```text
.
├── backend/
│   ├── src/
│   │   ├── config/        # Database and auth configuration
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Auth, role, and validation middleware
│   │   ├── models/        # Mongoose models
│   │   ├── routes/        # Express routes
│   │   ├── services/      # QR, attendance, email, and report services
│   │   └── utils/         # Validators and error helpers
│   ├── create-admin.js    # Local helper for creating an admin account
│   ├── clear-all-data.js  # Local database cleanup helper
│   └── server.js          # Backend entry point
├── css/                   # Frontend styles
├── html/                  # Frontend pages
├── images/                # Logos and image assets
└── js/                    # Frontend JavaScript
```

## Prerequisites

- Node.js 18 or newer
- npm
- A running MongoDB database, either local or hosted

## Setup

1. Install backend dependencies:

   ```bash
   cd backend
   npm install
   ```

2. Create a backend environment file:

   ```bash
   cp .env.example .env
   ```

   If `.env.example` does not exist yet, create `backend/.env` manually using the example below.

3. Configure environment variables in `backend/.env`:

   ```env
   NODE_ENV=development
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/cordium
   JWT_SECRET=replace-with-a-long-random-secret
   JWT_EXPIRE=7d
   FRONTEND_URL=http://localhost:3000
   QR_EXPIRY_MINUTES=5

   # Optional email notifications
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open the login page:

   ```text
   http://localhost:3000
   ```

The backend serves both the API and the static frontend. The root URL loads `html/login.html`, and API routes are available under `/api`.

## Scripts

Run these from the `backend` directory:

```bash
npm start      # Start the Express server
npm run dev    # Start the Express server with nodemon
```

## Admin Account

The repository includes `backend/create-admin.js` as a local helper for creating an admin user. Before running it, edit the `ADMIN` object in that file with your own username, email, password, and profile details.

```bash
cd backend
node create-admin.js
```

Do not use hard-coded sample credentials in production.

## API Overview

- `GET /api/health` - API health check
- `/api/auth` - authentication routes
- `/api/user` - member QR and attendance routes
- `/api/moderator` - QR scanning, user registration, attendance, contribution, and expense routes
- `/api/admin` - user management, moderator assignment, schedules, reports, and email configuration
- `/api/mass-schedules` - public mass schedule routes

## Email Notifications

Email notifications are optional. If `EMAIL_USER` and `EMAIL_PASSWORD` are not configured, schedule creation still works and email sending is skipped or logged.

For Gmail, enable 2-Step Verification and create an app password. More details are available in [backend/EMAIL_SETUP.md](backend/EMAIL_SETUP.md).

## Development Notes

- Keep secrets in `backend/.env`; do not commit real credentials.
- `js/config.js` builds the API base URL from the current browser host, so the frontend should be served by the Express app during normal local development.
- MongoDB must be reachable before starting the backend.
- There is currently no automated test script defined in `backend/package.json`.
