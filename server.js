// server.js
import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import 'dotenv/config';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail', // or use your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validate input
    if (!name || !email || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.YOUR_PERSONAL_EMAIL, // Your email to receive messages
      subject: `Portfolio Contact: ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
        <hr>
        <p>Sent from your portfolio website</p>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Optional: Send auto-reply to user
    const autoReplyOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Thanks for contacting me!',
      html: `
        <h2>Hi ${name},</h2>
        <p>Thank you for reaching out! I've received your message and will get back to you soon.</p>
        <p>Best regards,<br>Your Name</p>
      `,
    };
    
    await transporter.sendMail(autoReplyOptions);

    res.json({ 
      success: true, 
      message: 'Message sent successfully!' 
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send message' 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Contact form backend running on port ${PORT}`);
});
