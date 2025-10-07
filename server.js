import express from "express";
import cors from "cors";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));

app.post("/send-order", async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, items } = req.body;

    // Generate HTML
    let html = `
      <h1>New Koowhips Order</h1>
      <p><strong>Name:</strong> ${customerName}</p>
      <p><strong>Email:</strong> ${customerEmail}</p>
      <p><strong>Phone:</strong> ${customerPhone || "N/A"}</p>
      <hr/>
    `;

    const attachments = [];

    items.forEach((item, idx) => {
      html += `
        <h2>${item.name}</h2>
        <p><strong>Projects:</strong> ${item.numProjects}</p>
        <p><strong>Price:</strong> ${item.currency} ${item.price}</p>
        <p><strong>Instructions:</strong> ${item.instructions || "None"}</p>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
      `;
      if (item.imageAttachments && item.imageAttachments.length > 0) {
        item.imageAttachments.forEach((base64, i) => {
          attachments.push({
            content: base64,
            filename: `item${idx + 1}_image${i + 1}.jpg`,
            type: "image/jpeg",
            disposition: "attachment",
          });
          // Also inline preview in email
          html += `<img src="data:image/jpeg;base64,${base64}" style="width:150px; height:150px; object-fit:contain; margin:4px;"/>`;
        });
      }
      html += "</div><hr/>";
    });

    const msg = {
      to: "celicacoa@gmail.com",
      from: "celicacoa@gmail.com",
      subject: `🎨 New Koowhips Order from ${customerName}`,
      html,
      attachments,
    };

    await sgMail.send(msg);
    console.log("✅ Email sent successfully!");
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log("Server running...");
});
