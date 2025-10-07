import express from "express";
import cors from "cors";
import multer from "multer";
import sendgrid from "@sendgrid/mail";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
app.use(cors());

// ✅ Multer setup to handle multipart/form-data (images + text fields)
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Set SendGrid API key
sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

// ✅ Handle order submissions
app.post("/send-order", upload.array("attachments", 5), async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
    } = req.body;

    // Validate input
    if (!customerName || !customerEmail) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    // Parse order items
    const orderItems = [];
    for (let key in req.body) {
      if (key.startsWith("order[")) {
        const match = key.match(/order\[(\d+)\]\[(.*?)\]/);
        if (match) {
          const [_, index, field] = match;
          if (!orderItems[index]) orderItems[index] = {};
          orderItems[index][field] = req.body[key];
        }
      }
    }

    // ✅ Build email content
    const htmlContent = `
      <h2>🧾 New Order Received</h2>
      <p><strong>Name:</strong> ${customerName}</p>
      <p><strong>Email:</strong> ${customerEmail}</p>
      <p><strong>Phone:</strong> ${customerPhone || "N/A"}</p>
      <h3>Order Details:</h3>
      ${orderItems
        .map(
          (item, i) => `
        <div style="margin-bottom:10px;padding:8px;border:1px solid #ccc;border-radius:8px;">
          <p><strong>Item ${i + 1}</strong></p>
          <p>Type: ${item.type || "N/A"}</p>
          <p>Projects: ${item.numProjects || "N/A"}</p>
          <p>Instructions: ${item.instructions || "N/A"}</p>
          <p>Price: ${item.price || "N/A"}</p>
        </div>
      `
        )
        .join("")}
    `;

    // ✅ Handle attachments
    const attachments = req.files?.map((file) => ({
      content: file.buffer.toString("base64"),
      filename: file.originalname,
      type: file.mimetype,
      disposition: "attachment",
    })) || [];

    // ✅ Send email via SendGrid
    const msg = {
      to: "celicacoa@gmail.com", // your receiving email
      from: "celicacoa@gmail.com", // must match your verified sender
      subject: `New Order from ${customerName}`,
      html: htmlContent,
      attachments,
    };

    await sendgrid.send(msg);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error sending email:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
