import express from "express";
import cors from "cors";
import multer from "multer";
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Allow requests from frontend (dev + production)
app.use(cors({
  origin: ["http://localhost:5173", "https://your-frontend-production-domain.com"],
  methods: ["GET", "POST"],
}));

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer for handling file uploads
const upload = multer();

// Helper to format date/time
function formatDateTime(date) {
  return date.toLocaleString("en-CA", { timeZone: "America/Toronto" });
}

// Send order email
app.post("/send-order", upload.array("attachments"), async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, orderItems } = req.body;

    if (!customerName || !customerEmail || !orderItems) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          content: file.buffer.toString("base64"),
          filename: file.originalname,
          type: file.mimetype,
          disposition: "attachment"
        });
      });
    }

    const orderNumber = `KW-${Date.now()}`;

    // Build HTML content for email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #1a1a1a;">
        <div style="text-align:center; margin-bottom:20px;">
          <img src="https://github.com/UrbanCocoa/my-site/blob/main/src/assets/KW/Instagram.png?raw=true" alt="KooWhips Logo" width="150"/>
        </div>
        <h2 style="color:#FF6F61;">New Order Received</h2>
        <p><strong>Order #:</strong> ${orderNumber}</p>
        <p><strong>Date/Time:</strong> ${formatDateTime(new Date())}</p>
        <hr/>
        <h3>Customer Info</h3>
        <p><strong>Name:</strong> ${customerName}</p>
        <p><strong>Email:</strong> ${customerEmail}</p>
        ${customerPhone ? `<p><strong>Phone:</strong> ${customerPhone}</p>` : ""}
        <hr/>
        <h3>Order Details</h3>
        ${Array.isArray(orderItems) ? orderItems.map((item, idx) => `
          <div style="margin-bottom:15px;">
            <p><strong>Item ${idx + 1}:</strong> ${item.name}</p>
            <p><strong>Number of Projects:</strong> ${item.numProjects}</p>
            <p><strong>Instructions:</strong> ${item.instructions || "N/A"}</p>
            <p><strong>Price:</strong> ${item.currency} ${item.price}</p>
            ${item.imageFiles && item.imageFiles.length > 0 ? `<p><strong>Images:</strong> ${item.imageFiles.map(f => f.name).join(", ")}</p>` : ""}
          </div>
        `).join("") : ""}
        <hr/>
        <p style="text-align:center; color:#777;">This is an automated email from KooWhips</p>
      </div>
    `;

    const msg = {
      to: "celicacoa@gmail.com",
      from: "celicacoa@gmail.com",
      subject: `New KooWhips Order #${orderNumber}`,
      html: htmlContent,
      attachments
    };

    await sgMail.send(msg);

    res.json({ success: true, message: "Order email sent successfully" });

  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
