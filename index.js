// server.js

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

// Enable CORS so requests from your Chrome extension are allowed.
app.use(cors({
    origin: '*', // or restrict to your extension's origin if desired
}));
app.use(bodyParser.json());

// ---------- MONGODB CONNECTION ----------
mongoose.connect('mongodb+srv://dharshanrajpa:Dharshan2004@dharshanrajpacluster0.71qop.mongodb.net/linkedin')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// ---------- SCHEMA & MODEL DEFINITIONS ----------

// 1) login Collection (for member login details)
const loginSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // We'll use publicIdentifier as _id
    firstName: { type: String },
    lastName: { type: String },
    premiumSubscriber: { type: Boolean },
    plainId: { type: Number },  // Using Number for Long
    trackingId: { type: String },
    publicIdentifier: { type: String },
    jsessionId: { type: String },
    lastActiveTs: { type: Date, default: Date.now },
    createTs: { type: Date, default: Date.now },
    updateTs: { type: Date, default: Date.now }
});

const Login = mongoose.model('Login', loginSchema);

// 2) person_details Collection
const profileDetailsSchema = new mongoose.Schema({
    memberId: { type: String, required: true },
    publicIdentifier: { type: String, required: true },
    tags: { type: [String], default: [] },
    notes: { type: String, default: "" },
    createTs: { type: Date, default: Date.now },
    updateTs: { type: Date, default: Date.now }
});

const ProfileDetails = mongoose.model('ProfileDetails', profileDetailsSchema);

// ---------- API ENDPOINTS ----------

// POST /login API: Upsert a Login document.
app.post('/login', async (req, res) => {
    try {
        const loginData = req.body;
        // Ensure publicIdentifier is present (and use it as _id)
        if (!loginData.publicIdentifier) {
            return res.status(400).json({ error: "publicIdentifier is required." });
        }
        // Upsert based on publicIdentifier.
        const updatedLogin = await Login.findOneAndUpdate(
            { _id: loginData.publicIdentifier },
            {
                $set: {
                    firstName: loginData.firstName,
                    lastName: loginData.lastName,
                    premiumSubscriber: loginData.premiumSubscriber,
                    plainId: loginData.plainId,
                    trackingId: loginData.trackingId,
                    publicIdentifier: loginData.publicIdentifier,
                    jsessionId: loginData.jsessionId,
                    lastActiveTs: new Date(),
                    updateTs: new Date()
                },
                $setOnInsert: { createTs: new Date() }
            },
            { new: true, upsert: true }
        );
        res.json(updatedLogin);
    } catch (err) {
        console.error("Error in POST /login:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// POST /details API for person_details.
// Payload example:
// {
//   "tags": ["tag1", "tag2"],
//   "notes": "Some notes",
//   "memberId": "someMemberId",
//   "publicIdentifier": "https://www.linkedin.com/in/someprofile"   // any query parameters removed
// }
app.post('/details', async (req, res) => {
    try {
        let { tags, notes, memberId, publicIdentifier } = req.body;
        if (!memberId || !publicIdentifier) {
            return res.status(400).json({ error: "memberId and publicIdentifier are required." });
        }
        // Remove query parameters from publicIdentifier.
        const qIdx = publicIdentifier.indexOf("?");
        if (qIdx !== -1) {
            publicIdentifier = publicIdentifier.substring(0, qIdx);
        }
        const updatedDoc = await PersonDetails.findOneAndUpdate(
            { memberId, publicIdentifier },
            {
                $set: { tags, notes, updateTs: new Date() },
                $setOnInsert: { createTs: new Date() }
            },
            { new: true, upsert: true }
        );
        res.json(updatedDoc);
    } catch (err) {
        console.error("Error in POST /details:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// GET /details API: Retrieve details (tags and notes) for given memberId and publicIdentifier.
app.get('/details', async (req, res) => {
    try {
        let { memberId, publicIdentifier } = req.query;
        if (!memberId || !publicIdentifier) {
            return res.status(400).json({ error: "memberId and publicIdentifier are required." });
        }
        const qIdx = publicIdentifier.indexOf("?");
        if (qIdx !== -1) {
            publicIdentifier = publicIdentifier.substring(0, qIdx);
        }
        const doc = await PersonDetails.findOne(
            { memberId, publicIdentifier },
            { tags: 1, notes: 1, _id: 0 }
        );
        if (!doc) {
            return res.status(404).json({ error: "Details not found for the given memberId and publicIdentifier." });
        }
        res.json(doc);
    } catch (err) {
        console.error("Error in GET /details:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ---------- START SERVER ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
