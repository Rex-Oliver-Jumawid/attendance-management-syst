# Email Configuration Guide for Admins

## Overview

The system can automatically send email notifications to all members when you create a new mass schedule. Emails are sent from your Gmail account, so members can reply directly to you.

## Setup Steps

### 1. Enable 2-Factor Authentication on Gmail

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", select **2-Step Verification**
3. Follow the prompts to enable it if not already enabled

### 2. Generate Gmail App Password

1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. You may need to sign in again
3. Under "Select app", choose **Mail**
4. Under "Select device", choose **Other (Custom name)**
5. Enter a name like "Church Attendance System"
6. Click **Generate**
7. Google will display a 16-character password (example: `abcd efgh ijkl mnop`)
8. **Copy this password** - you won't be able to see it again!

### 3. Configure in Admin Dashboard

1. Log in to your admin account
2. Click on **Profile** tab
3. Scroll down to **Email Configuration** section
4. Paste the 16-character App Password (remove spaces)
5. Click **Save Email Configuration**

### 4. Test It

1. Go to **Mass Schedules** tab
2. Create a new schedule
3. All active members should receive an email notification from your Gmail address

## Important Notes

- **Security**: The App Password is different from your regular Gmail password and is stored securely
- **Sender**: All schedule announcement emails will be sent from your Gmail address
- **Replies**: Members can reply directly to your email
- **Privacy**: Member emails are sent as BCC (members won't see each other's email addresses)
- **Updates**: If you change your Gmail password or revoke the App Password, you'll need to generate a new one and update it in the system

## Troubleshooting

**Emails not sending?**

- Make sure you've enabled 2-Factor Authentication on Gmail
- Verify the App Password is correct (16 characters, no spaces)
- Check that at least one member is marked as "Active"
- Look at the browser console for any error messages

**"Admin email not configured" message?**

- You haven't set up your Gmail App Password yet
- Go to Profile → Email Configuration and follow the setup steps above

## Security Best Practices

1. **Never share** your App Password with anyone
2. **Revoke** App Passwords you're not using from [App Passwords page](https://myaccount.google.com/apppasswords)
3. Keep your admin account credentials secure
4. Use a strong password for your admin account

## Privacy & Compliance

- Member emails are only used for schedule announcements
- Members are BCC'd to protect their privacy
- Emails include an unsubscribe option (members can mark themselves inactive)
- All email data is handled according to data protection guidelines
