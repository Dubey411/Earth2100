const mongoose = require("mongoose");

const hotspotSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        area: {
            type: String,
            required: true,
            trim: true, // e.g., "Asia", "Africa", "South America"
        },
        location: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
        },
        severity: {
            type: String,
            enum: ["low", "medium", "high", "critical"],
            default: "medium",
        },
        description: {
            type: String,
            trim: true,
        },
        affectedSpecies: {
            type: [String],
            default: [],
        },
        temperature: {
            type: Number, // in °C
        },
        year: {
            type: Number, // year of observation / projection
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

const Hotspot = mongoose.model("Hotspot", hotspotSchema);

module.exports = Hotspot;
