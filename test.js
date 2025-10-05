// server.js
import express from "express";
import cors from "cors";
import multer from "multer";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Multer setup for handling file uploads
const storage = multer.memoryStorage(); // keep files in memory
const upload = multer({ storage });

// POST /send-order
app.post("/send-order", upload.array("attachments", 10), async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    const files = req.files || [];

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER, // your Gmail address
        pass: process.env.MAIL_PASS, // app password
      },
    });

    // Prepare attachments
    const attachments = files.map((file) => ({
      filename: file.originalname,
      content: file.buffer,
    }));

    // Send email
    const mailOptions = {
      from: `"KooWhips Orders" <${process.env.MAIL_USER}>`,
      to: process.env.MAIL_USER, // receive email at your own account
      subject: `New Order from ${name}`,
      text: `${message}\n\nFrom: ${name}\nEmail: ${email}\nPhone: ${phone || "Not provided"}`,
      attachments,
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("Email sending error:", error);
    res.status(500).json({ success: false, message: "Failed to send email." });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
