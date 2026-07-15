const express = require("express");
const router = express.Router();
const { getHotspots, getHotspotById, getHotspotByArea } = require("../controller/hotspot.controller");

router.get("/api/hotspots", getHotspots);
router.get("/api/hotspots/:id",getHotspotById);
router.get("/api/hotspots/area", getHotspotByArea);

module.exports = router;

