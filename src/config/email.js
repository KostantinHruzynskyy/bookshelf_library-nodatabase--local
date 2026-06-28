'use strict';

const nodemailer = require('nodemailer');
const path = require('path');
const { logger } = require('./logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: true
      }
    });
  } else {
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.ETHEREAL_USER || 'test@ethereal.email',
        pass: process.env.ETHEREAL_PASS || 'testpass'
      }
    });
  }

  return transporter;
}

function getEmailTemplate(title, content, language = 'it') {
  const greeting = language === 'it' ? 'Ciao' : 'Hello';
  const footer = language === 'it' ? 'Il team di Bookshelf Library' : 'The Bookshelf Library Team';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: 'Georgia', serif; line-height: 1.6; color: #3e2723; background-color: #f5f1eb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border: 2px solid #8b4513; border-radius: 8px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #8b4513, #a0522d); color: #fff; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); }
    .content { padding: 30px; }
    .button { display: inline-block; background: #8b4513; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .button:hover { background: #a0522d; }
    .footer { background: #f5f1eb; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; }
    .code { background: #f5f1eb; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 18px; text-align: center; letter-spacing: 5px; margin: 20px 0; border: 2px dashed #8b4513; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📚 Bookshelf Library</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${footer}.</p>
    </div>
  </div>
</body>
</html>`;
}

async function sendVerificationEmail(email, username, token, language = 'it') {
  const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${token}`;
  
  const content = `
    <h2>Benvenuto in Bookshelf Library!</h2>
    <p>Ciao <strong>${username}</strong>,</p>
    <p>Grazie per esserti registrato! Per completare la registrazione, verifica il tuo indirizzo email cliccando il pulsante qui sotto:</p>
    <p style="text-align: center;">
      <a href="${verificationUrl}" class="button">Verifica Email</a>
    </p>
    <p>Oppure copia e incolla questo link nel tuo browser:</p>
    <p style="word-break: break-all; font-size: 12px; color: #666;">${verificationUrl}</p>
    <p><strong>Nota:</strong> Questo link scade tra 24 ore.</p>
    <p>Se non hai creato un account, ignora questa email.</p>
  `;

  const mailOptions = {
    from: `"Bookshelf Library" <${process.env.SMTP_FROM || 'noreply@bookshelf.local'}>`,
    to: email,
    subject: 'Verifica il tuo indirizzo email - Bookshelf Library',
    html: getEmailTemplate('Verifica Email', content, language),
    text: `Benvenuto ${username}! Verifica la tua email: ${verificationUrl}`
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    logger.info('Verification email sent', { email, messageId: info.messageId });
    
    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      logger.info('Email preview URL', { previewUrl });
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Failed to send verification email', { email, error: error.message });
    return { success: false, error: error.message };
  }
}

async function sendPasswordResetEmail(email, username, token, language = 'it') {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  
  const content = `
    <h2>Reset Password</h2>
    <p>Ciao <strong>${username}</strong>,</p>
    <p>Abbiamo ricevuto una richiesta di reset per la tua password. Clicca il pulsante qui sotto per impostare una nuova password:</p>
    <p style="text-align: center;">
      <a href="${resetUrl}" class="button">Reset Password</a>
    </p>
    <p>Oppure copia e incolla questo link nel tuo browser:</p>
    <p style="word-break: break-all; font-size: 12px; color: #666;">${resetUrl}</p>
    <p><strong>Nota:</strong> Questo link scade tra 1 ora.</p>
    <p>Se non hai richiesto il reset della password, ignora questa email.</p>
  `;

  const mailOptions = {
    from: `"Bookshelf Library" <${process.env.SMTP_FROM || 'noreply@bookshelf.local'}>`,
    to: email,
    subject: 'Reset Password - Bookshelf Library',
    html: getEmailTemplate('Reset Password', content, language),
    text: `Reset password: ${resetUrl}`
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    logger.info('Password reset email sent', { email, messageId: info.messageId });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Failed to send password reset email', { email, error: error.message });
    return { success: false, error: error.message };
  }
}

async function sendWelcomeEmail(email, username, language = 'it') {
  const content = `
    <h2>Benvenuto in Bookshelf Library!</h2>
    <p>Ciao <strong>${username}</strong>,</p>
    <p>Siamo felici di averti con noi! La tua email è stata verificata con successo.</p>
    <p>Ecco cosa puoi fare ora:</p>
    <ul>
      <li>📚 Aggiungi i tuoi libri preferiti</li>
      <li>⭐ Recensisci e valuta i libri</li>
      <li>💬 Commenta e interagisci con altri lettori</li>
      <li>📖 Traccia i tuoi progressi di lettura</li>
      <li>🏷️ Organizza i libri con i tag</li>
    </ul>
    <p style="text-align: center;">
      <a href="${process.env.APP_URL || 'http://localhost:3000'}" class="button">Inizia a Esplorare</a>
    </p>
  `;

  const mailOptions = {
    from: `"Bookshelf Library" <${process.env.SMTP_FROM || 'noreply@bookshelf.local'}>`,
    to: email,
    subject: 'Benvenuto in Bookshelf Library!',
    html: getEmailTemplate('Benvenuto!', content, language),
    text: `Benvenuto ${username}! Grazie per esserti unito a Bookshelf Library.`
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    logger.info('Welcome email sent', { email, messageId: info.messageId });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Failed to send welcome email', { email, error: error.message });
    return { success: false, error: error.message };
  }
}

async function verifyConnection() {
  try {
    await getTransporter().verify();
    logger.info('Email transporter verified successfully');
    return { success: true };
  } catch (error) {
    logger.error('Email transporter verification failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

module.exports = {
  getTransporter,
  getEmailTemplate,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  verifyConnection
};