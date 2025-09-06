// backend/server/routes/zohoRoutes.js
import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config({ path: "./config.env" });

const router = express.Router();

function requiredEnv() {
  const missing = ["ZOHO_CLIENT_ID","ZOHO_CLIENT_SECRET","ZOHO_REFRESH_TOKEN"]
    .filter(k => !process.env[k]);
  return missing;
}

/* -----------------------------------
   Helper: Always get a fresh access_token
----------------------------------- */
async function getZohoAccessToken() {
  const params = new URLSearchParams({
    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type: "refresh_token",
  });

  const { data } = await axios.post(
    "https://accounts.zoho.com/oauth/v2/token",
    params,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  return (data.access_token || "").trim();
}

/* -----------------------------------
   STEP 1: Generate Zoho OAuth URL
----------------------------------- */
router.get("/zoho/oauth/authorize", (req, res) => {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const redirectUri = process.env.ZOHO_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({
      success: false,
      error: "ZOHO_CLIENT_ID or ZOHO_REDIRECT_URI not set in .env",
    });
  }

  const authUrl = `https://accounts.zoho.com/oauth/v2/auth?scope=ZohoMail.organization.READ,ZohoMail.organization.accounts.CREATE,ZohoMail.organization.accounts.READ,ZohoMail.organization.accounts.UPDATE&client_id=${process.env.ZOHO_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(process.env.ZOHO_REDIRECT_URI)}&access_type=offline&prompt=consent`;



  res.json({ success: true, auth_url: authUrl });
});

/* -----------------------------------
   STEP 2: OAuth Callback
   Exchanges "code" for tokens
----------------------------------- */
router.get("/zoho/oauth/callback", async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error) return res.status(400).json({ success: false, error });
    if (!code) return res.status(400).json({ success: false, error: "No code received" });

    const params = new URLSearchParams({
      code,
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      redirect_uri: process.env.ZOHO_REDIRECT_URI,
      grant_type: "authorization_code",
    });

    const { data } = await axios.post(
      "https://accounts.zoho.com/oauth/v2/token",
      params,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    // Show tokens — refresh_token should be saved manually in .env
    res.json({
      success: true,
      message: "Tokens received. Save refresh_token into .env",
      data,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e.response?.data || e.message,
    });
  }
});

/* -----------------------------------
   STEP 3: Fetch Organization Info
----------------------------------- */
router.get("/zoho/org", async (req, res) => {
  try {
    const missing = requiredEnv();
    if (missing.length) {
      return res.status(500).json({
        success: false,
        error: `Missing env vars: ${missing.join(", ")}`
      });
    }

    // 1) refresh access token
    const params = new URLSearchParams();
    params.append("refresh_token", process.env.ZOHO_REFRESH_TOKEN);
    params.append("client_id", process.env.ZOHO_CLIENT_ID);
    params.append("client_secret", process.env.ZOHO_CLIENT_SECRET);
    params.append("grant_type", "refresh_token");

    const tokenResp = await axios.post(
      "https://accounts.zoho.com/oauth/v2/token",
      params.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const t = tokenResp?.data;
    if (!t || !t.access_token) {
      return res.status(500).json({
        success: false,
        error: "No access_token returned from Zoho",
        details: t || tokenResp?.data
      });
    }

    const accessToken = t.access_token.trim();

    // 2) call Zoho Mail org API (US DC)
    const orgResp = await axios.get(
      "https://mail.zoho.com/api/organization",
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );

    return res.json({ success: true, data: orgResp.data });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.response?.data || e.message
    });
  }
});
  

/* -----------------------------------
   STEP 4: Create Mailbox (user)
----------------------------------- */
router.post("/zoho/mailbox/create", async (req, res) => {
  try {
    const { email, firstName, lastName, password } = req.body;
    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const accessToken = await getZohoAccessToken();
    const orgId = process.env.ZOHO_ORG_ID;

    const body = new URLSearchParams({
      primaryEmailAddress: email,
      password,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      role: "member", // or "admin"
    });

    const url = `https://mail.zoho.com/api/organization/${orgId}/accounts`;

    const { data } = await axios.post(url, body, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e.response?.data || e.message,
    });
  }
});

export default router;
