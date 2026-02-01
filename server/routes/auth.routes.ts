/**
 * Authentication Routes
 */

import { Router } from "express";

const router = Router();

/**
 * POST /api/login
 * Login with username and password
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    // Simple authentication (in production, use proper password hashing)
    if (password === "admin@123") {
      res.cookie("auth", "true", { 
        httpOnly: true, 
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: "lax"
      });
      res.json({ success: true, username });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

/**
 * POST /api/logout
 * Clear authentication cookie
 */
router.post("/logout", async (req, res) => {
  try {
    res.clearCookie("auth");
    res.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Logout failed" });
  }
});

/**
 * GET /api/auth/check
 * Check if user is authenticated
 */
router.get("/auth/check", async (req, res) => {
  try {
    const authCookie = req.cookies?.auth;
    if (authCookie === "true") {
      res.json({ authenticated: true });
    } else {
      res.status(401).json({ authenticated: false });
    }
  } catch (error) {
    console.error("Auth check error:", error);
    res.status(500).json({ authenticated: false });
  }
});

export default router;
