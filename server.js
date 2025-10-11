// server.js
import express from "express";
import cors from "cors";
import multer from "multer";
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Allow requests from frontend (dev + production)
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://koowhips.ca", // live frontend
    ],
    methods: ["GET", "POST"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer();

// Helper: format date/time
function formatDateTime(date) {
  return date.toLocaleString("en-CA", { timeZone: "America/Toronto" });
}

// Track order counts by date (resets daily)
const orderCountByDate = {};

// Generate order number format: KW-MMDDYY##
function generateOrderNumber() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);

  const dateKey = `${year}${month}${day}`;
  orderCountByDate[dateKey] = (orderCountByDate[dateKey] || 0) + 1;
  const count = String(orderCountByDate[dateKey]).padStart(2, "0");

  return `KW-${month}${day}${year}${count}`;
}

app.post("/send-order", upload.array("attachments"), async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, orderItems } = req.body;

    if (!customerName || !customerEmail || !orderItems) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        attachments.push({
          content: file.buffer.toString("base64"),
          filename: file.originalname,
          type: file.mimetype,
          disposition: "attachment",
        });
      });
    }

    const parsedItems = JSON.parse(orderItems);
    const orderNumber = generateOrderNumber();

    // Calculate total order price
    const totalPrice = parsedItems.reduce((acc, item) => {
      const price = parseFloat(item.price || 0);
      return acc + (isNaN(price) ? 0 : price);
    }, 0);
    const displayCurrency = parsedItems[0]?.currency || "CAD";

    // Build HTML email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #1a1a1a; background-color:#fafafa; padding:20px;">
        <div style="text-align:center; margin-bottom:20px;">
          <img src="https://raw.githubusercontent.com/UrbanCocoa/KooWhips/main/src/assets/KW/Longbanner.png"
               alt="KooWhips Logo" style="width:100%; max-width:400px; border-radius:8px;" />
        </div>
        <h2 style="color:#FF6F61;">🎨 New Order Received</h2>
        <p><strong>Order #:</strong> ${orderNumber}</p>
        <p><strong>Date/Time:</strong> ${formatDateTime(new Date())}</p>
        <hr style="margin:20px 0; border:none; border-top:1px solid #ddd;"/>

        <h3 style="color:#333;">👤 Customer Info</h3>
        <p><strong>Name:</strong> ${customerName}</p>
        <p><strong>Email:</strong> ${customerEmail}</p>
        ${customerPhone ? `<p><strong>Phone:</strong> ${customerPhone}</p>` : ""}
        <hr style="margin:20px 0; border:none; border-top:1px solid #ddd;"/>

        <h3 style="color:#333;">🛒 Order Details</h3>
        ${Array.isArray(parsedItems)
          ? parsedItems
              .map(
                (item) => `
          <div style="margin-bottom:20px; padding:12px; background:#fff; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
            <p><strong>Product Type:</strong> ${item.type || "N/A"}</p>
            <p><strong>Number of Projects:</strong> ${
              item.numProjects || item.numStickers || 1
            }</p>
            <p><strong>Images Uploaded:</strong> ${
              item.imageFiles ? item.imageFiles.length : 0
            }</p>
            <p><strong>Price:</strong> ${item.currency || "CAD"} ${
                  item.price || "N/A"
                }</p>
            <p><strong>Instructions:</strong> ${
              item.instructions?.trim() || "None provided"
            }</p>
          </div>
        `
              )
              .join("")
          : ""}

        <hr style="margin:20px 0; border:none; border-top:1px solid #ddd;"/>

        <h3 style="color:#333;">💰 Order Summary</h3>
        <p style="font-size:16px;">
          <strong>Total:</strong> ${displayCurrency} ${totalPrice.toFixed(2)}
        </p>

        <hr style="margin:20px 0; border:none; border-top:1px solid #ddd;"/>
        <p style="text-align:center; color:#777;">
          This is an automated order notification from <strong>KooWhips</strong>.
        </p>
      </div>
    `;

    const msg = {
      to: "celicacoa@gmail.com",
      from: "celicacoa@gmail.com",
      subject: `New KooWhips Order #${orderNumber}`,
      html: htmlContent,
      attachments,
    };

    await sgMail.send(msg);

    res.json({ success: true, message: "Order email sent successfully" });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
