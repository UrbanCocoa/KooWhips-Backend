import express from "express";
import cors from "cors";
import multer from "multer";
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// ✅ Set your SendGrid API key from Render environment variables
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ✅ Enable CORS for local dev and production
app.use(
  cors({
    origin: ["http://localhost:5173", "https://koowhips.netlify.app"], // add your frontend URL here
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

// ✅ Multer for handling file uploads (attachments)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Email route
app.post("/send-order", upload.array("attachments", 10), async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    // Build attachments from uploaded files
    const attachments = (req.files || []).map((file) => ({
      content: file.buffer.toString("base64"),
      filename: file.originalname,
      type: file.mimetype,
      disposition: "attachment",
    }));

    const msg = {
      to: "celicacoa@gmail.com", // your email
      from: "celicacoa@gmail.com", // verified sender
      reply_to: email || "celicacoa@gmail.com",
      subject: `New KooWhips Order from ${name}`,
      text: message,
      attachments,
    };

    console.log("📦 Sending email with", attachments.length, "attachments...");

    await sgMail.send(msg);

    console.log("✅ Email sent successfully!");
    res.json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("❌ Error sending email:", error.response?.body || error);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to send email.",
        error: error.response?.body || error.message,
      });
  }
});

// ✅ Start server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
