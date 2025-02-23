// server.js

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// ---------- MONGODB CONNECTION ----------
mongoose.connect('mongodb+srv://dharshanrajpa:Dharshan2004@dharshanrajpacluster0.71qop.mongodb.net/linkedin', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// ---------- SCHEMA & MODEL DEFINITIONS ----------

// 1) Member Collection
// Use entityUrn as _id.
const memberSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // entityUrn
    firstName: { type: String },
    lastName: { type: String },
    premiumSubscriber: { type: Boolean },
    plainId: { type: String },
    trackingId: { type: String },
    publicIdentifier: { type: String },
    jsessionId: { type: String },
    updateTs: { type: Date, default: Date.now },
    createTs: { type: Date, default: Date.now }
});

const Member = mongoose.model('Member', memberSchema);

// 2) profilesDetails Collection
const profilesDetailsSchema = new mongoose.Schema({
    memberId: { type: String, required: true },
    publicIdentifier: { type: String, required: true },
    tags: { type: [String], default: [] },
    notes: { type: String, default: "" },
    createTs: { type: Date, default: Date.now },
    updateTs: { type: Date, default: Date.now }
});

const ProfilesDetails = mongoose.model('profilesDetails', profilesDetailsSchema);

// ---------- API ENDPOINTS ----------

// POST /member - Update or insert Member document.
app.post('/member', async (req, res) => {
    try {
        const memberData = req.body;
        if (!memberData.entityUrn) {
            return res.status(400).json({ error: "entityUrn is required." });
        }
        // Upsert the Member document based on the entityUrn.
        const updatedMember = await Member.findOneAndUpdate(
            { _id: memberData.entityUrn },
            {
                $set: {
                    firstName: memberData.firstName,
                    lastName: memberData.lastName,
                    premiumSubscriber: memberData.premiumSubscriber,
                    plainId: memberData.plainId,
                    trackingId: memberData.trackingId,
                    publicIdentifier: memberData.publicIdentifier,
                    jsessionId: memberData.jsessionId,
                    updateTs: new Date()
                },
                $setOnInsert: { createTs: new Date() }
            },
            { new: true, upsert: true }
        );
        res.json(updatedMember);
    } catch (err) {
        console.error("Error in POST /member:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// POST /details API for profilesDetails
// Payload example:
// {
//   "tags": ["tag1", "tag2"],
//   "notes": "....",
//   "memberId": "....",
//   "publicIdentifier": "url"  // remove any query string portion
// }
app.post('/details', async (req, res) => {
    try {
        let { tags, notes, memberId, publicIdentifier } = req.body;
        if (!memberId || !publicIdentifier) {
            return res.status(400).json({ error: "memberId and publicIdentifier are required." });
        }
        // Remove query parameters from publicIdentifier if present.
        const qIdx = publicIdentifier.indexOf("?");
        if (qIdx !== -1) {
            publicIdentifier = publicIdentifier.substring(0, qIdx);
        }
        const updatedDoc = await ProfilesDetails.findOneAndUpdate(
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

// GET /details API
// Query parameters: memberId and publicIdentifier.
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
        const doc = await ProfilesDetails.findOne(
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
