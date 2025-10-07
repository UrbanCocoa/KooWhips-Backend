import express from "express";
import multer from "multer";
import nodemailer from "nodemailer";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.get("/", (req, res) => {
  res.send("✅ Koowhips backend is running");
});

app.post("/send-order", upload.array("attachments"), async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone } = req.body || {};

    if (!customerName || !customerEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Generate order details
    const orderNumber = "KW-" + Math.floor(100000 + Math.random() * 900000);
    const orderDate = new Date().toLocaleString("en-US", {
      timeZone: "America/Vancouver",
      dateStyle: "long",
      timeStyle: "short",
    });

    // Parse the order array
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

    // Brand settings
    const logoUrl =
      "https://github.com/UrbanCocoa/my-site/blob/main/src/assets/KW/Instagram.png?raw=true";
    const brandColor = "#CDB4DB";
    const textColor = "#1E1E1E";
    const bgColor = "#F8F9FA";

    // Helper function to build HTML for order items
    const buildOrderItems = (entries) =>
      entries
        .map(
          (item, index) => `
          <div style="border: 1px solid ${brandColor}; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
            <h3 style="color: ${brandColor}; margin: 0 0 10px;">Item ${index + 1}</h3>
            <p><strong>Type:</strong> ${item.type || "Custom Artwork"}</p>
            <p><strong>Number of Projects:</strong> ${item.numProjects || "N/A"}</p>
            <p><strong>Instructions:</strong> ${item.instructions || "N/A"}</p>
            <p><strong>Price:</strong> ${item.price || "N/A"}</p>
          </div>`
        )
        .join("");

    // --- 1️⃣ Internal Email (You) ---
    const internalEmailHTML = `
      <div style="font-family: 'Poppins', sans-serif; background-color: ${bgColor}; padding: 30px; border-radius: 12px; color: ${textColor};">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${logoUrl}" alt="Koowhips Logo" style="height: 70px; margin-bottom: 10px; border-radius: 10px;" />
          <h1 style="color: ${brandColor}; font-size: 26px; margin: 0;">New Custom Artwork Order</h1>
          <p style="font-size: 14px; color: #555;">Order #${orderNumber} • ${orderDate}</p>
        </div>

        <div style="background-color: #fff; border-radius: 10px; padding: 20px; box-shadow: 0 3px 10px rgba(0,0,0,0.08);">
          <h2 style="color: ${brandColor}; margin-bottom: 10px;">Customer Information</h2>
          <p><strong>Name:</strong> ${customerName}</p>
          <p><strong>Email:</strong> ${customerEmail}</p>
          <p><strong>Phone:</strong> ${customerPhone || "Not provided"}</p>
        </div>

        <div style="margin-top: 25px; background-color: #fff; border-radius: 10px; padding: 20px; box-shadow: 0 3px 10px rgba(0,0,0,0.08);">
          <h2 style="color: ${brandColor}; margin-bottom: 10px;">Order Details</h2>
          ${buildOrderItems(orderEntries)}
        </div>

        <div style="text-align: center; margin-top: 30px; color: #555;">
          <p>Thank you for choosing <strong style="color:${brandColor};">Koowhips</strong>!</p>
          <p style="font-size: 12px; color: #999;">This order was received on ${orderDate}. A follow-up invoice will be sent shortly.</p>
        </div>
      </div>
    `;

    // --- 2️⃣ Customer Confirmation Email ---
    const customerEmailHTML = `
      <div style="font-family: 'Poppins', sans-serif; background-color: ${bgColor}; padding: 30px; border-radius: 12px; color: ${textColor}; text-align: center;">
        <img src="${logoUrl}" alt="Koowhips Logo" style="height: 70px; margin-bottom: 10px; border-radius: 10px;" />
        <h1 style="color: ${brandColor}; font-size: 24px;">Thank You for Your Order!</h1>
        <p style="font-size: 16px;">Hi <strong>${customerName}</strong>,</p>
        <p style="font-size: 15px; color: #444;">We’ve received your custom artwork request and will review your details soon. Once approved, you’ll receive an invoice and estimated delivery timeframe.</p>
        <div style="margin: 25px auto; max-width: 500px; text-align: left; background: #fff; border-radius: 10px; padding: 20px; box-shadow: 0 3px 10px rgba(0,0,0,0.08);">
          <h2 style="color:${brandColor};">Order Summary</h2>
          <p><strong>Order #:</strong> ${orderNumber}</p>
          <p><strong>Date:</strong> ${orderDate}</p>
          ${buildOrderItems(orderEntries)}
        </div>
        <p style="margin-top: 30px; font-size: 13px; color: #777;">If you have any questions, reply to this email or DM us on Instagram @Koowhips.</p>
        <p style="font-size: 12px; color: #aaa;">© ${new Date().getFullYear()} Koowhips — All rights reserved.</p>
      </div>
    `;

    const attachments =
      req.files?.map((file) => ({
        filename: file.originalname,
        content: file.buffer,
      })) || [];

    // Email transporter (Gmail)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send internal email (to you)
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.RECEIVER_EMAIL || process.env.EMAIL_USER,
      subject: `Koowhips Order #${orderNumber} from ${customerName}`,
      html: internalEmailHTML,
      attachments,
    });

    // Send confirmation email (to customer)
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: `Koowhips Order Confirmation #${orderNumber}`,
      html: customerEmailHTML,
    });

    res.status(200).json({ success: true, orderNumber });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
