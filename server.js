import express from "express";
import cors from "cors";
import multer from "multer";
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Set your SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Middleware
app.use(cors());
const upload = multer();

// Endpoint to receive orders
app.post("/send-order", upload.array("attachments"), async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      orderItems, // this should be a stringified JSON or simple string of order info
    } = req.body;

    if (!customerName || !customerEmail || !orderItems) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    // Generate order number
    const orderNumber = `KW-${Date.now()}`;

    // Current date/time
    const orderDate = new Date().toLocaleString("en-CA", { timeZone: "America/Vancouver" });

    // Logo URL (GitHub raw link)
    const logoUrl = "https://github.com/UrbanCocoa/my-site/blob/main/src/assets/KW/Instagram.png?raw=true";

    // Build HTML email
    const emailContent = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${logoUrl}" alt="KooWhips Logo" style="width: 150px;"/>
          <h1 style="color: #FF6F61;">New Order Received</h1>
        </div>

        <p><strong>Order #:</strong> ${orderNumber}</p>
        <p><strong>Date/Time:</strong> ${orderDate}</p>

        <h2 style="color: #FF6F61;">Customer Info</h2>
        <p><strong>Name:</strong> ${customerName}</p>
        <p><strong>Email:</strong> ${customerEmail}</p>
        <p><strong>Phone:</strong> ${customerPhone || "N/A"}</p>

        <h2 style="color: #FF6F61;">Order Details</h2>
        <div style="border: 1px solid #FF6F61; padding: 10px; border-radius: 8px;">
          <pre style="white-space: pre-wrap; word-wrap: break-word;">${orderItems}</pre>
        </div>

        <p style="margin-top: 20px;">This order was submitted via the KooWhips website.</p>
      </div>
    `;

    // Process attachments
    const attachments = req.files?.map(file => ({
      content: file.buffer.toString("base64"),
      filename: file.originalname,
      type: file.mimetype,
      disposition: "attachment",
    }));

    const msg = {
      to: "celicacoa@gmail.com",
      from: "celicacoa@gmail.com", // Must match verified sender in SendGrid
      subject: `New Order Received - ${orderNumber}`,
      html: emailContent,
      attachments,
    };

    await sgMail.send(msg);

    res.json({ success: true, orderNumber });
  } catch (err) {
    console.error("❌ Error sending email:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
