# Email Notification Setup

When an admin creates a new mass schedule, all members (not admins or moderators) will automatically receive an email notification.

## Setup Instructions

### Using Gmail

1. **Enable 2-Factor Authentication**

   - Go to your Google Account settings
   - Security → 2-Step Verification
   - Turn on 2-Step Verification

2. **Generate App Password**

   - Go to https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other" (enter "Church Attendance System")
   - Click "Generate"
   - Copy the 16-character password

3. **Update .env File**
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx  # The 16-character app password
   ```

### Using Other Email Services

You can modify `backend/src/services/email.service.js` to use other email services:

**Outlook/Hotmail:**

```javascript
service: "hotmail";
```

**Yahoo:**

```javascript
service: "yahoo";
```

**Custom SMTP:**

```javascript
host: 'smtp.example.com',
port: 587,
secure: false,
auth: {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASSWORD
}
```

## Installation

After configuring the email settings, install nodemailer:

```bash
cd backend
npm install
```

## Testing

Create a new mass schedule from the admin dashboard. All active members will receive an email with:

- Schedule name
- Mass type
- Date/time information
- Formatted HTML email

## Note

- If email credentials are not configured, the system will skip email notifications but still create the schedule successfully
- Email errors are logged but won't prevent schedule creation
- Only active members receive notifications (not admins or moderators)
- BCC is used to protect member email privacy
