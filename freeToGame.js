const fetch = require('node-fetch');
const express = require("express");
const app = express();
const port = 8000;
const apiUrl = "https://www.freetogame.com/api/games";
const apiUrlSpecific = "https://www.freetogame.com/api/game";

app.get("/f2p-games", async (req, res) => {
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Error fetching free-to-play games:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/f2p-games/:id", async (req, res) => {
    const gameId = req.params.id;
    try {
        const response = await fetch(`${apiUrlSpecific}?id=${gameId}`);
        if (!response.ok) {
            return res.status(response.status).json({ message: "Game not found" });
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error(`Error fetching free-to-play game with ID ${gameId}:`, error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.listen(port, ()=>{
    console.log(`Listening on http://localhost:${port}`);
});