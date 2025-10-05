import express from "express";
import cors from "cors";
import multer from "multer";
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Configure CORS to allow your frontend
app.use(cors({
  origin: ["http://localhost:5173", "https://your-production-frontend.com"], // allow local dev + prod URL
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

// Multer config for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(express.json());

app.post("/send-order", upload.array("attachments", 10), async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    const attachments = (req.files || []).map((file) => ({
      content: file.buffer.toString("base64"),
      filename: file.originalname,
      type: file.mimetype,
      disposition: "attachment",
    }));

    const msg = {
      to: "celicacoa@gmail.com",
      from: email, // optional: must be verified in SendGrid
      subject: `New KooWhips Order from ${name}`,
      text: message,
      attachments,
    };

    await sgMail.send(msg);

    res.json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.json({ success: false, message: "Failed to send email.", error: error.toString() });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
