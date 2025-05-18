const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const getEmailTemplate = (templateName) => {
  const templatePath = path.join(__dirname, '..', 'email_templates', templateName);
  try {
    return fs.readFileSync(templatePath, 'utf-8');
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    throw new Error('Failed to load email template');
  }
};

require('dotenv').config();

const sendEmailTemplate = async (recipient, subject, templateName, replacements = {}) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  let htmlContent = getEmailTemplate(templateName);

  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    htmlContent = htmlContent.replace(regex, value);
  }

  const mailOptions = {
    from: process.env.GMAIL_EMAIL,
    to: recipient,
    subject,
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmailTemplate; 
