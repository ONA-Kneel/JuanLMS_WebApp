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

  const authUrl = `https://accounts.zoho.com/oauth/v2/auth?scope=AaaServer.profile.Read,ZohoMail.organization.READ,ZohoMail.organization.accounts.READ,ZohoMail.organization.accounts.CREATE,ZohoMail.organization.accounts.UPDATE,ZohoMail.messages.CREATE,ZohoMail.messages.READ&client_id=${process.env.ZOHO_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(process.env.ZOHO_REDIRECT_URI)}&access_type=offline&prompt=consent`;



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
   STEP 3: Test Access Token
----------------------------------- */
router.get("/zoho/test", async (req, res) => {
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

    // 2) test with user info endpoint
    const userResp = await axios.get(
      "https://accounts.zoho.com/oauth/user/info",
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );

    return res.json({ success: true, data: userResp.data });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.response?.data || e.message
    });
  }
});

/* -----------------------------------
   STEP 4: Fetch Organization Info
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

    // 2) Try Zoho Mail API with organization ID
    const orgResp = await axios.get(
      "https://mail.zoho.com/api/organization/898669091/accounts",
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );

    return res.json({ success: true, data: orgResp.data });
  } catch (e) {
    console.log("Organization endpoint error:", e.response?.data || e.message);
    return res.status(500).json({
      success: false,
      error: e.response?.data || e.message,
      details: e.response?.status,
      fullError: e.toString()
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

    const url = `https://mail.zoho.com/api/organization/898669091/accounts`;

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

/* -----------------------------------
   STEP 5: Create Email Account (Correct Implementation)
----------------------------------- */
router.post("/zoho/create-email", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName) {
      return res.status(400).json({ success: false, error: "Missing firstName or lastName" });
    }

    // Generate email address if not provided
    const emailAddress = email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@sjdefilms.com`;
    // Simple password (letters + numbers only) when not provided
    const userPassword = password || `Pass${Math.random().toString(36).substring(2, 10)}`;

    const accessToken = await getZohoAccessToken();
    const zoid = "898669091"; // Your organization ID

    // Correct JSON body format as per Gemini's information
    const body = {
      primaryEmailAddress: emailAddress,
      password: userPassword,
      firstName: firstName,
      lastName: lastName
    };

    const url = `https://mail.zoho.com/api/organization/${zoid}/accounts`;

    const { data } = await axios.post(url, body, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    res.json({ 
      success: true, 
      message: "Email account created successfully",
      email: emailAddress,
      password: userPassword,
      data 
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e.response?.data || e.message,
    });
  }
});

/* -----------------------------------
   STEP 6: Send Email from Zoho Mail
----------------------------------- */
router.post("/zoho/send-email", async (req, res) => {
  try {
    const { toEmail, subject, content } = req.body;
    if (!toEmail || !subject || !content) {
      return res.status(400).json({ success: false, error: "Missing required fields: toEmail, subject, content" });
    }

    const accessToken = await getZohoAccessToken();
    
    // Use your existing admin account to send emails
    const accountId = "8208068000000008002"; // From the organization data we got earlier
    
    const emailData = {
      fromAddress: "juanlms.sjddefi@sjdefilms.com",
      toAddress: toEmail,
      subject: subject,
      content: content
    };

    const url = `https://mail.zoho.com/api/accounts/${accountId}/messages`;

    const { data } = await axios.post(url, emailData, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    res.json({ 
      success: true, 
      message: "Email sent successfully",
      data 
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e.response?.data || e.message,
    });
  }
});

// Test endpoint to send OTP to Zoho Mail via Brevo
router.post("/zoho/test-brevo-to-zoho", async (req, res) => {
  try {
    const { zohoEmail, firstName = "Test User" } = req.body;
    
    if (!zohoEmail) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required field: zohoEmail" 
      });
    }

    // Generate a test OTP
    const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Import and use the email service
    const emailService = await import('../services/emailService.js');
    
    // Send OTP to Zoho Mail address via Brevo
    const result = await emailService.default.sendOTP(
      zohoEmail,
      firstName,
      testOTP,
      'verification',
      zohoEmail
    );

    res.json({
      success: true,
      message: `Test OTP sent to ${zohoEmail} via Brevo`,
      otp: testOTP,
      result: result
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e.response?.data || e.message,
    });
  }
});

export default router;
