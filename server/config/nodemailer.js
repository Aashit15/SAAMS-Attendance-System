import nodemailer from 'nodemailer';

// In development, log emails to console instead of actually sending
const createTransporter = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('📧 Email transporter running in DEV mode — emails will be logged to console');
    return {
      sendMail: async (mailOptions) => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 DEV EMAIL (not actually sent):');
        console.log(`   To: ${mailOptions.to}`);
        console.log(`   Subject: ${mailOptions.subject}`);
        console.log(`   Body: ${mailOptions.text || mailOptions.html}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return { messageId: 'dev-mode-' + Date.now() };
      },
    };
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const transporter = createTransporter();

export default transporter;
