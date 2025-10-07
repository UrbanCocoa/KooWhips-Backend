import express from "express";
import multer from "multer";
import nodemailer from "nodemailer";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// Multer setup (for file uploads)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Root route for sanity check
app.get("/", (req, res) => {
  res.send("✅ Koowhips backend is running");
});

// Send order route (handles multipart/form-data)
app.post("/send-order", upload.array("attachments"), async (req, res) => {
  try {
    // SAFELY extract body data
    const { customerName, customerEmail, customerPhone } = req.body || {};

    if (!customerName || !customerEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Build readable order details
    const orderEntries = Object.keys(req.body)
      .filter((key) => key.startsWith("order["))
      .reduce((acc, key) => {
        const match = key.match(/order\[(\d+)\]\[(.+)\]/);
        if (match) {
          const [_, index, field] = match;
          if (!acc[index]) acc[index] = {};
          acc[index][field] = req.body[key];
        }
        return acc;
      }, []);

    // Build HTML email summary
    let emailBody = `
      <h2>New Order Received</h2>
      <p><strong>Name:</strong> ${customerName}</p>
      <p><strong>Email:</strong> ${customerEmail}</p>
      <p><strong>Phone:</strong> ${customerPhone || "Not provided"}</p>
      <hr/>
      <h3>Order Details:</h3>
    `;

    orderEntries.forEach((item, index) => {
      emailBody += `
        <div style="margin-bottom: 20px;">
          <h4>Item ${index + 1}</h4>
          <p><strong>Type:</strong> ${item.type || "Custom Artwork"}</p>
          <p><strong>Number of Projects:</strong> ${item.numProjects || "N/A"}</p>
          <p><strong>Instructions:</strong> ${item.instructions || "N/A"}</p>
          <p><strong>Price:</strong> ${item.price || "N/A"}</p>
        </div>
      `;
    });

    // Handle attachments (images)
    const attachments = req.files?.map((file) => ({
      filename: file.originalname,
      content: file.buffer,
    })) || [];

    // Send email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.RECEIVER_EMAIL || process.env.EMAIL_USER,
      subject: `New Koowhips Order from ${customerName}`,
      html: emailBody,
      attachments,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
