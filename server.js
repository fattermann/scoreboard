const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== DATA HELPERS =====
function readData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Error reading data:', e);
    }
    return { teams: [] };
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ===== API ROUTES =====

// Get all teams
app.get('/api/teams', (req, res) => {
    const data = readData();
    res.json(data.teams);
});

// Add a new team
app.post('/api/teams', (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name ist erforderlich' });
    }
    const data = readData();
    const exists = data.teams.some(t => t.name.toLowerCase() === name.trim().toLowerCase());
    if (exists) {
        return res.status(409).json({ error: 'Team existiert bereits' });
    }
    const team = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: name.trim(),
        score: 0
    };
    data.teams.push(team);
    data.teams.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    writeData(data);
    res.status(201).json(team);
});

// Update team score
app.patch('/api/teams/:id', (req, res) => {
    const { delta } = req.body;
    const data = readData();
    const team = data.teams.find(t => t.id === req.params.id);
    if (!team) return res.status(404).json({ error: 'Team nicht gefunden' });
    team.score += (delta || 0);
    data.teams.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    writeData(data);
    res.json(data.teams);
});

// Delete a team
app.delete('/api/teams/:id', (req, res) => {
    const data = readData();
    const idx = data.teams.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Team nicht gefunden' });
    data.teams.splice(idx, 1);
    writeData(data);
    res.json(data.teams);
});

// Delete all teams
app.delete('/api/teams', (req, res) => {
    writeData({ teams: [] });
    res.json([]);
});

// Fallback: serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Scoreboard server running on port ${PORT}`);
});
