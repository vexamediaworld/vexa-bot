const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public")); // optional extra static files
// Package images live in the repo root (001.jpg = Silver, 002.jpg = Gold, 003.jpg = Platinum)
["001.jpg", "002.jpg", "003.jpg"].forEach((f) =>
  app.get("/" + f, (req, res) => res.sendFile(path.join(__dirname, f)))
);

const TOKEN = process.env.TOKEN;       // Meta access token
const PHONE_ID = process.env.PHONE_ID; // Phone Number ID
const VERIFY = process.env.VERIFY;     // your secret word
// Render sets RENDER_EXTERNAL_URL automatically
const BASE_URL = process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL;

async function send(to, body) {
  try {
    await axios.post(
      `https://graph.facebook.com/v25.0/${PHONE_ID}/messages`,
      { messaging_product: "whatsapp", to, ...body },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
  } catch (e) {
    console.error("Send error:", e.response?.data || e.message);
  }
}

const text = (to, msg) => send(to, { type: "text", text: { body: msg } });

const image = (to, file, caption) =>
  send(to, { type: "image", image: { link: `${BASE_URL}/${file}`, caption } });

// Main menu (welcome message + 4 options)
const mainMenu = (to) =>
  send(to, {
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: "Welcome to VEXA Media!\n\nPlease select an option:" },
      action: {
        button: "Open Menu",
        sections: [
          {
            title: "VEXA Media",
            rows: [
              { id: "about", title: "About Us" },
              { id: "services", title: "Our Services" },
              { id: "packages", title: "Our Packages" },
              { id: "support", title: "Contact Support" },
            ],
          },
        ],
      },
    },
  });

// Two buttons shown after About / Services / Packages
const nextButtons = (to) =>
  send(to, {
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: "Please select an option:" },
      action: {
        buttons: [
          { type: "reply", reply: { id: "back", title: "Back to Main Menu" } },
          { type: "reply", reply: { id: "support", title: "Contact Support" } },
        ],
      },
    },
  });

// ---------- EDIT THESE TEXTS ----------
const ABOUT =
  "About VEXA Media\n\n" +
  "VEXA Media is a digital marketing and media company with experience since 2013. " +
  "We help brands grow online with creative content and results-driven marketing.";

const SERVICES =
  "Our Services\n\n" +
  "- Social Media Management\n" +
  "- Website Development\n" +
  "- Video Shooting\n" +
  "- Video Editing\n" +
  "- AI Video Generation\n" +
  "- Image Generation\n" +
  "- Image Editing\n" +
  "- Meta Ads\n" +
  "- Google Ads\n" +
  "- Other digital marketing services";

const SUPPORT =
  "Thank you for contacting VEXA Media!\n\n" +
  "Our team will get in touch with you soon to understand your requirements " +
  "and recommend the most suitable services and package for your business.";
// --------------------------------------

async function handle(to, id) {
  if (id === "about") {
    await text(to, ABOUT);
    return nextButtons(to);
  }
  if (id === "services") {
    await text(to, SERVICES);
    return nextButtons(to);
  }
  if (id === "packages") {
    await text(to, "*VEXA Media - Social Media Packages*\nContent | Management | Growth");
    await image(to, "001.jpg", "*SILVER - Starter Package*\nDaily image posts. Perfect for brands starting their social presence.");
    await image(to, "002.jpg", "*GOLD - Growth Package*\nDaily image posts + 1 video every week. Built to grow your brand.");
    await image(to, "003.jpg", "*PLATINUM - Premium Package*\nDaily image posts + 2 videos every week. Complete content + growth solution.");
    return nextButtons(to);
  }
  if (id === "support") {
    return text(to, SUPPORT);
  }
  return mainMenu(to); // "back" or any other message
}

// Meta verifies your webhook here
app.get("/webhook", (req, res) => {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === VERIFY
  ) {
    return res.status(200).send(req.query["hub.challenge"]);
  }
  res.sendStatus(403);
});

// Incoming customer messages
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  console.log("INCOMING:", JSON.stringify(req.body));
  try {
    const m = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!m) return;
    const id =
      m.interactive?.list_reply?.id || m.interactive?.button_reply?.id || null;
    await handle(m.from, id);
  } catch (e) {
    console.error("Handler error:", e.message);
  }
});

app.get("/", (req, res) => res.send("VEXA Media bot is running"));

app.get("/privacy", (req, res) =>
  res.send(
    "<h1>Privacy Policy - VEXA Media</h1>" +
    "<p>VEXA Media uses WhatsApp to answer customer enquiries. " +
    "We only use the messages and phone numbers you send us to reply to you and provide our services. " +
    "We do not sell or share your data with third parties.</p>" +
    "<p>To request deletion of your data, contact vexamediaworld@gmail.com.</p>"
  )
);

app.get("/data-deletion", (req, res) =>
  res.send(
    "<h1>Data Deletion - VEXA Media</h1>" +
    "<p>To delete your data, email vexamediaworld@gmail.com and we will remove it.</p>"
  )
);

app.listen(process.env.PORT || 3000, () => console.log("Bot running"));
