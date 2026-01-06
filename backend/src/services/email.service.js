const nodemailer = require("nodemailer");

// Create email transporter
const createTransporter = () => {
  // Using Gmail as an example - you can change this to your preferred email service
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Format schedule date/time for email
const formatScheduleInfo = (schedule) => {
  let dateInfo = "";

  if (schedule.scheduleType === "recurring") {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayNames = schedule.dayOfWeek.map((d) => days[d]).join(", ");
    dateInfo = `Every ${dayNames}`;
  } else {
    const date = new Date(schedule.specificDate);
    dateInfo = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return dateInfo;
};

// Send schedule announcement to members
exports.sendScheduleAnnouncement = async (
  schedule,
  memberEmails,
  adminInfo
) => {
  try {
    if (!adminInfo || !adminInfo.email || !adminInfo.password) {
      console.log("Admin email not configured - skipping email notification");
      return { success: false, message: "Admin email not configured" };
    }

    if (!memberEmails || memberEmails.length === 0) {
      console.log("No member emails to send to");
      return { success: true, message: "No members to notify" };
    }

    // Create transporter with admin's email credentials
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: adminInfo.email,
        pass: adminInfo.password,
      },
    });

    const dateInfo = formatScheduleInfo(schedule);

    const mailOptions = {
      from: `${adminInfo.name} <${adminInfo.email}>`,
      bcc: memberEmails, // Use BCC to hide recipients from each other
      subject: `New Mass Schedule: ${schedule.name}`,
      replyTo: adminInfo.email,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3d5a80; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
            .schedule-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #3d5a80; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #3d5a80; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Mass Schedule Announcement</h1>
            </div>
            <div class="content">
              <p>Dear Member,</p>
              <p>We are pleased to announce a new mass schedule has been created:</p>
              
              <div class="schedule-details">
                <div class="detail-row">
                  <span class="label">Schedule Name:</span> ${schedule.name}
                </div>
                <div class="detail-row">
                  <span class="label">Mass Type:</span> ${schedule.massType}
                </div>
                <div class="detail-row">
                  <span class="label">Date:</span> ${dateInfo}
                </div>
                <div class="detail-row">
                  <span class="label">Time:</span> ${schedule.startTime} - ${schedule.endTime}
                </div>
              </div>
              
              <p>We look forward to seeing you at this mass. Please make sure to bring your QR code for attendance tracking.</p>
              
              <p>God bless!</p>
              <p style="margin-top: 20px; color: #666;">- ${adminInfo.name}</p>
            </div>
            <div class="footer">
              <p>This is an automated message from the Church Attendance System.</p>
              <p>If you have questions, you can reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    console.log(
      `Notified ${memberEmails.length} members about new schedule: ${schedule.name}`
    );

    return {
      success: true,
      message: `Email sent to ${memberEmails.length} members`,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      message: "Failed to send email",
      error: error.message,
    };
  }
};

// Send absence follow-up to members who didn't attend
exports.sendAbsenceFollowUp = async (
  schedule,
  absentMemberEmails,
  adminInfo
) => {
  try {
    if (!adminInfo || !adminInfo.email || !adminInfo.password) {
      console.log("Admin email not configured - skipping email notification");
      return { success: false, message: "Admin email not configured" };
    }

    if (!absentMemberEmails || absentMemberEmails.length === 0) {
      console.log("No absent members to send to");
      return { success: true, message: "No absent members to notify" };
    }

    // Create transporter with admin's email credentials
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: adminInfo.email,
        pass: adminInfo.password,
      },
    });

    const dateInfo = formatScheduleInfo(schedule);

    const mailOptions = {
      from: `${adminInfo.name} <${adminInfo.email}>`,
      bcc: absentMemberEmails,
      subject: `We Missed You at ${schedule.name}`,
      replyTo: adminInfo.email,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3d5a80; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
            .schedule-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ee6c4d; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #3d5a80; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .notice { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>We Missed You</h1>
            </div>
            <div class="content">
              <p>Dear Member,</p>
              
              <p>We noticed that you were not able to attend the following mass schedule:</p>
              
              <div class="schedule-details">
                <div class="detail-row">
                  <span class="label">Schedule Name:</span> ${schedule.name}
                </div>
                <div class="detail-row">
                  <span class="label">Mass Type:</span> ${schedule.massType}
                </div>
                <div class="detail-row">
                  <span class="label">Date:</span> ${dateInfo}
                </div>
                <div class="detail-row">
                  <span class="label">Time:</span> ${schedule.startTime} - ${schedule.endTime}
                </div>
              </div>
              
              <div class="notice">
                <p style="margin: 0;"><strong>We would love to hear from you!</strong></p>
                <p style="margin: 10px 0 0 0;">If you're comfortable sharing, please let us know why you weren't able to attend by replying to this email. Your feedback helps us serve you better.</p>
              </div>
              
              <p>We hope to see you at our next mass. Remember, our church community is always here for you.</p>
              
              <p>May God bless you and keep you in His care.</p>
              <p style="margin-top: 20px; color: #666;">- ${adminInfo.name}</p>
            </div>
            <div class="footer">
              <p>This is an automated message from the Church Attendance System.</p>
              <p>You can reply to this email to share your reason for absence.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Absence follow-up email sent:", info.messageId);
    console.log(
      `Notified ${absentMemberEmails.length} absent members for: ${schedule.name}`
    );

    return {
      success: true,
      message: `Email sent to ${absentMemberEmails.length} absent members`,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Error sending absence follow-up email:", error);
    return {
      success: false,
      message: "Failed to send absence follow-up email",
      error: error.message,
    };
  }
};
