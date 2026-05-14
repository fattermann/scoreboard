const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scoreboard';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== MONGODB CONNECTION =====
let db;
let teamsCollection;

async function connectDB() {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db();
    teamsCollection = db.collection('teams');
    console.log('Connected to MongoDB');
}

// ===== API ROUTES =====

// Get all teams (sorted by score desc, then name asc)
app.get('/api/teams', async (req, res) => {
    try {
        const teams = await teamsCollection.find({}).sort({ score: -1, name: 1 }).toArray();
        res.json(teams.map(t => ({ id: t.id, name: t.name, score: t.score })));
    } catch (e) {
        console.error('GET /api/teams error:', e);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Add a new team
app.post('/api/teams', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Name ist erforderlich' });
        }
        const exists = await teamsCollection.findOne({ nameLower: name.trim().toLowerCase() });
        if (exists) {
            return res.status(409).json({ error: 'Team existiert bereits' });
        }
        const team = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            name: name.trim(),
            nameLower: name.trim().toLowerCase(),
            score: 0
        };
        await teamsCollection.insertOne(team);
        res.status(201).json({ id: team.id, name: team.name, score: team.score });
    } catch (e) {
        console.error('POST /api/teams error:', e);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Update team score
app.patch('/api/teams/:id', async (req, res) => {
    try {
        const { delta } = req.body;
        await teamsCollection.updateOne({ id: req.params.id }, { $inc: { score: delta || 0 } });
        const teams = await teamsCollection.find({}).sort({ score: -1, name: 1 }).toArray();
        res.json(teams.map(t => ({ id: t.id, name: t.name, score: t.score })));
    } catch (e) {
        console.error('PATCH /api/teams error:', e);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Delete a team
app.delete('/api/teams/:id', async (req, res) => {
    try {
        await teamsCollection.deleteOne({ id: req.params.id });
        const teams = await teamsCollection.find({}).sort({ score: -1, name: 1 }).toArray();
        res.json(teams.map(t => ({ id: t.id, name: t.name, score: t.score })));
    } catch (e) {
        console.error('DELETE /api/teams/:id error:', e);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Delete all teams
app.delete('/api/teams', async (req, res) => {
    try {
        await teamsCollection.deleteMany({});
        res.json([]);
    } catch (e) {
        console.error('DELETE /api/teams error:', e);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Fallback: serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== START =====
connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Scoreboard server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    });
