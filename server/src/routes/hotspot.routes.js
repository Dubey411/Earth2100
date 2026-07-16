import express from "express";
import { getHotspots, getHotspotById, getHotspotByArea } from "../controllers/hotspot.controller.js";

const router = express.Router();

// NOTE: /area must be before /:id to avoid "area" being matched as an ID param
router.get("/area", getHotspotByArea);   // GET /api/hotspots/area?area=Asia
router.get("/:id", getHotspotById);      // GET /api/hotspots/:id
router.get("/", getHotspots);            // GET /api/hotspots

export default router;
