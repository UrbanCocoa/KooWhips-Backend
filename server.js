import express from "express";
import nodemailer from "nodemailer";
import multer from "multer";
import cors from "cors";
import path from "path";

const app = express();
app.use(cors());

// Use Multer to handle file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST endpoint to receive orders
app.post("/send-order", upload.array("attachments", 10), async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    const attachments = req.files?.map(file => ({
      filename: file.originalname,
      content: file.buffer
    })) || [];

    // Create Nodemailer transporter using environment variables
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER, // Gmail address
        pass: process.env.MAIL_PASS  // Gmail app password
      }
    });

    // Send the email
    const info = await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: process.env.MAIL_USER, // your email
      subject: `New Order from ${name}`,
      text: message,
      attachments
    });

    console.log("Email sent:", info.messageId);
    res.json({ success: true, message: "Email sent successfully." });

  } catch (error) {
    console.error("Error sending email:", error);
    res.json({ success: false, message: "Failed to send email." });
  }
});

// Listen on dynamic port (Render provides PORT)
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
