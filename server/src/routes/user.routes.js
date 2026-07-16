import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// GET /api/users/me - Returns user profile info (Protected)
router.get("/me", verifyToken, (req, res) => {
  return res.status(200).json({
    message: "User profile fetched successfully",
    user: req.user,
  });
});

export default router;
