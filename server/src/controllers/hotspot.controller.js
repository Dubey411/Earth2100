import Hotspot from "../models/hotspot.model.js";

// GET /api/hotspots — fetch all hotspots
const getHotspots = async (req, res) => {
  try {
    const hotspots = await Hotspot.find();
    return res.status(200).json({ message: "Hotspots fetched successfully", data: hotspots });
  } catch (error) {
    console.error("Error fetching hotspots:", error);
    return res.status(500).json({ message: "Error fetching hotspots" });
  }
};

// GET /api/hotspots/:id — fetch a single hotspot by ID
const getHotspotById = async (req, res) => {
  try {
    const hotspot = await Hotspot.findById(req.params.id);
    if (!hotspot) {
      return res.status(404).json({ message: "Hotspot not found" });
    }
    return res.status(200).json({ message: "Hotspot fetched successfully", data: hotspot });
  } catch (error) {
    console.error("Error fetching hotspot by ID:", error);
    return res.status(500).json({ message: "Error fetching hotspot by ID" });
  }
};

// GET /api/hotspots/area?area=Asia — fetch hotspots filtered by area
const getHotspotByArea = async (req, res) => {
  try {
    const { area } = req.query;
    if (!area) {
      return res.status(400).json({ message: "Query param 'area' is required" });
    }
    const hotspots = await Hotspot.find({ area });
    return res.status(200).json({ message: "Hotspots fetched successfully", data: hotspots });
  } catch (error) {
    console.error("Error fetching hotspots by area:", error);
    return res.status(500).json({ message: "Error fetching hotspots by area" });
  }
};

export { getHotspots, getHotspotById, getHotspotByArea };
