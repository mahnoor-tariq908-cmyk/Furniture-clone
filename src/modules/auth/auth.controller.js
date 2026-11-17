
import crypto from "crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import User from "../../models/User.model.js";

// ==================== SEND VERIFICATION EMAIL ====================

const sendVerificationEmail = async (email, name, token) => {
  const host = process.env.MAILTRAP_HOST?.trim();
  const port = Number(process.env.MAILTRAP_PORT || 587);
  const username = process.env.MAILTRAP_USER?.trim();
  const password = process.env.MAILTRAP_PASS;
  const sender = process.env.MAIL_FROM?.trim();

  if (!host || !username || !password || !sender) {
    throw new Error("Mailtrap configuration is incomplete.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: username,
      pass: password,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  const frontendUrl = (
    process.env.FRONTEND_URL || "http://localhost:5173"
  ).replace(/\/+$/, "");

  const verificationLink =
    `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

  const safeName = String(name)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const result = await transporter.sendMail({
    from: sender,
    to: email,
    subject: "Verify Your Email - FORM & OAK",

    text: `Hello ${name},

Please verify your FORM & OAK account using this link:
${verificationLink}

This link expires in 15 minutes.`,

    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:24px auto;padding:32px;color:#44352b;background:#fffaf5;border:1px solid #eadfd3;border-radius:12px;">
        <h1 style="color:#795548;">FORM &amp; OAK</h1>
        <h2>Verify Your Email</h2>
        <p>Hello ${safeName},</p>
        <p>Please verify your email address to activate your account.</p>
        <p style="margin:28px 0;">
          <a href="${verificationLink}" style="display:inline-block;padding:14px 24px;background:#795548;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">
            Verify Email
          </a>
        </p>
        <p>This link expires in 15 minutes.</p>
      </div>
    `,
  });

  console.log("Verification email sent successfully:", result.messageId);

  return result;
};

// ==================== REGISTER USER ====================

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name must not exceed 100 characters.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.userIsVerified
          ? "Email is already registered. Please log in."
          : "This email is already registered but not verified.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: "user",
      userIsVerified: false,
      verificationToken: hashedToken,
      verificationTokenExpiry: new Date(
        Date.now() + 15 * 60 * 1000
      ),
    });

    try {
      await sendVerificationEmail(user.email, user.name, rawToken);
    } catch (emailError) {
      console.error("MAILTRAP ERROR:", emailError);

      await User.deleteOne({ _id: user._id });

      return res.status(502).json({
        success: false,
        message: "Unable to send verification email.",
      });
    }

    return res.status(201).json({
      success: true,
      message:
        "Registration successful. Check your email and verify your account.",
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed.",
    });
  }
};

// ==================== VERIFY EMAIL ====================

export const verifyEmail = async (req, res) => {
  try {
    const token =
      typeof req.query.token === "string"
        ? req.query.token.trim()
        : "";

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is missing.",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      verificationToken: hashedToken,
    }).select("+verificationToken +verificationTokenExpiry");

    console.log("Verification request received.");
    console.log("Matching token found:", Boolean(user));

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Verification token does not match a registered user. Please request a new verification email.",
      });
    }

    const expiryTime = user.verificationTokenExpiry
      ? new Date(user.verificationTokenExpiry).getTime()
      : 0;

    if (!expiryTime || expiryTime <= Date.now()) {
      return res.status(400).json({
        success: false,
        message:
          "Verification link has expired. Please register again or request a new verification email.",
      });
    }

    // Important: repeated requests should also return success.
    if (user.userIsVerified) {
      return res.status(200).json({
        success: true,
        alreadyVerified: true,
        message: "Your email is already verified. You can now log in.",
      });
    }

    user.userIsVerified = true;

    // Keep the hashed token until its expiry so duplicate requests
    // can identify this verification link and return success.
    // Never store the original, unhashed token in the database.
    await user.save();

    console.log("Email verification successful.");

    return res.status(200).json({
      success: true,
      alreadyVerified: false,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Email verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Email verification failed due to a server error.",
    });
  }
};

// ==================== LOGIN USER ====================

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password +refreshToken");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.userIsVerified) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email before logging in.",
      });
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed.",
    });
  }
};
