const Hotspot = require("../models/hotspot.model");

const getHotspots = async (req, res) => {
    try{
        const hotspots = await Hotspot.find();
        return res.status(200).json({message: "Hotspots fetched successfully", data: hotspots});
    }catch(error){
        console.log("Error fetching hotspots: ", error);
        return res.status(500).json({message: "Error fetching hotspots"});
    }
}

const getHotspotById = async (req, res) => {
    try{
        const hotspot = await Hotspot.findById(req.params.id);
        return res.status(200).json({message: "Hotspot fetched successfully", data: hotspot});
    }catch(error){
        console.log("Error fetching hotspot by ID: ", error);
        return res.status(500).json({message: "Error fetching hotspot by ID"});
    }
}

const getHotspotByArea = async (req, res) => {
    try{
        const hotspots = await Hotspot.find({area: req.query.area});
        return res.status(200).json({message: "Hotspots fetched successfully", data: hotspots});
    }catch(error){
        console.log("Error fetching hotspots by area: ", error);
        return res.status(500).json({message: "Error fetching hotspots by area"});
    }
}

module.exports = { getHotspots, getHotspotById, getHotspotByArea };
