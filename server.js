import express from "express";
import multer from "multer";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

// Multer setup to handle file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Parse form-data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Your email configuration (update with your SMTP settings)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // or your SMTP host
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER, // your email
    pass: process.env.EMAIL_PASS, // app password or real password
  },
});

// POST route to receive order
app.post("/send-order", upload.array("attachments"), async (req, res) => {
  try {
    const { name, email, phone, instructions, numProjects, price, currency } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Name and email are required" });
    }

    // Generate an order number
    const orderNumber = `KW-${Date.now()}`;

    // Current date/time
    const orderDate = new Date().toLocaleString();

    // Build HTML email
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; background:#f9f9f9; padding:20px;">
        <div style="text-align:center; margin-bottom:20px;">
          <img src="https://github.com/UrbanCocoa/my-site/blob/main/src/assets/KW/Instagram.png?raw=true" alt="KooWhips Logo" width="120" />
          <h2 style="color:#1a1a1a;">New Order Received</h2>
        </div>
        <div style="background:#ffffff; padding:20px; border-radius:8px;">
          <p><strong>Order #:</strong> ${orderNumber}</p>
          <p><strong>Date:</strong> ${orderDate}</p>
          <hr/>
          <h3 style="color:#1a1a1a;">Customer Information</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || "N/A"}</p>
          <hr/>
          <h3 style="color:#1a1a1a;">Order Details</h3>
          <p><strong>Number of Projects:</strong> ${numProjects}</p>
          <p><strong>Price:</strong> ${currency}${price}</p>
          <p><strong>Instructions:</strong> ${instructions || "N/A"}</p>
          <hr/>
          <h3 style="color:#1a1a1a;">Uploaded Images</h3>
          ${req.files && req.files.length > 0 
            ? req.files.map(f => `<p>${f.originalname}</p>`).join("") 
            : "<p>No files uploaded</p>"
          }
        </div>
      </div>
    `;

    // Build attachments for Nodemailer
    const attachments = req.files?.map((file) => ({
      filename: file.originalname,
      content: file.buffer,
    }));

    const mailOptions = {
      from: `"KooWhips Orders" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // send only to yourself
      subject: `New Order: ${orderNumber}`,
      html: htmlContent,
      attachments: attachments,
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "Order email sent successfully" });
  } catch (err) {
    console.error("❌ Error sending email:", err);
    res.status(500).json({ success: false, message: "Failed to send order" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
