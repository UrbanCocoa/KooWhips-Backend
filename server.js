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

app.use(
  cors({
    origin: ["http://localhost:5173", "https://koowhips.ca"],
    methods: ["GET", "POST"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer();

// --- Helpers ---
function formatDateTime(date) {
  return date.toLocaleString("en-CA", { timeZone: "America/Toronto" });
}

function getTodayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  return `${month}${day}${year}`;
}

function generateOrderNumber() {
  const key = getTodayKey();
  let data = {};

  try {
    if (fs.existsSync("orderCount.json")) {
      data = JSON.parse(fs.readFileSync("orderCount.json", "utf8"));
    }
  } catch (err) {
    console.error("Error reading orderCount.json:", err);
  }

  data[key] = (data[key] || 0) + 1;

  try {
    fs.writeFileSync("orderCount.json", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing orderCount.json:", err);
  }

  const orderNumber = `KW-${key}${String(data[key]).padStart(2, "0")}`;
  return orderNumber;
}

// --- Email endpoint ---
app.post("/send-order", upload.array("attachments"), async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, orderItems } = req.body;

    if (!customerName || !customerEmail || !orderItems) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const parsedItems = JSON.parse(orderItems);
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

    const orderNumber = generateOrderNumber();

    // ✅ Use a reliable hosted image (you can replace this with your own CDN/Render URL)
    const logoURL = "https://i.imgur.com/YOUR_LOGO_IMAGE.png";

    // Build HTML email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #222; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
        <div style="text-align:center; margin-bottom:20px;">
          <img src="${logoURL}" alt="KooWhips Logo" style="width:160px;"/>
        </div>
        <h2 style="color:#ff6f61; text-align:center;">🎨 New KooWhips Order Received</h2>
        <p><strong>Order #:</strong> ${orderNumber}</p>
        <p><strong>Date/Time:</strong> ${formatDateTime(new Date())}</p>
        <hr style="margin:20px 0;"/>

        <h3>👤 Customer Info</h3>
        <p><strong>Name:</strong> ${customerName}</p>
        <p><strong>Email:</strong> ${customerEmail}</p>
        ${customerPhone ? `<p><strong>Phone:</strong> ${customerPhone}</p>` : ""}

        <hr style="margin:20px 0;"/>

        <h3>🛒 Order Details</h3>
        ${Array.isArray(parsedItems)
          ? parsedItems
              .map(
                (item, idx) => `
            <div style="margin-bottom:20px; padding:10px; background:#fff; border-radius:8px;">
              <p><strong>Item ${idx + 1}</strong></p>
              <p><strong>Product Type:</strong> ${item.productType || "N/A"}</p>
              <p><strong>Number of Projects:</strong> ${
                item.numProjects || item.numStickers || "N/A"
              }</p>
              <p><strong>Instructions:</strong> ${
                item.instructions?.trim() || "None provided"
              }</p>
              <p><strong>Price:</strong> ${item.currency || "CAD"} ${
                  item.price || "0.00"
                }</p>
              ${
                item.imageFiles?.length
                  ? `<p><strong>Images Uploaded:</strong> ${
                      item.imageFiles.length
                    }</p>`
                  : ""
              }
            </div>`
              )
              .join("")
          : "<p>No order items found.</p>"}

        <hr style="margin:20px 0;"/>
        <p style="text-align:center; color:#777; font-size:12px;">
          This is an automated email from KooWhips. Please do not reply.
        </p>
      </div>
    `;

    const msg = {
      to: "celicacoa@gmail.com",
      from: "celicacoa@gmail.com",
      subject: `🧾 KooWhips Order #${orderNumber}`,
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
