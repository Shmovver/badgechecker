import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());

// 🔹 Convert username → userId
async function getUserId(username) {
  const res = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      usernames: [username],
      excludeBannedUsers: false
    })
  });

  const data = await res.json();
  if (!data.data || data.data.length === 0) return null;
  return data.data[0].id;
}

async function getUniverseId(placeId) {
  const res = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
  const data = await res.json();
  return data.universeId;
}

async function getGameBadges(universeId) {
  let badges = [];
  let cursor = "";

  do {
    const res = await fetch(
      `https://badges.roblox.com/v1/universes/${universeId}/badges?limit=100&cursor=${cursor}`
    );
    const data = await res.json();
    badges = badges.concat(data.data);
    cursor = data.nextPageCursor;
  } while (cursor);

  return badges;
}

async function getPlayerBadges(userId) {
  let badges = [];
  let cursor = "";

  do {
    const res = await fetch(
      `https://badges.roblox.com/v1/users/${userId}/badges?limit=100&cursor=${cursor}`
    );
    const data = await res.json();
    badges = badges.concat(data.data);
    cursor = data.nextPageCursor;
  } while (cursor);

  return badges;
}

app.get("/api/check", async (req, res) => {
  try {
    const { username, placeId } = req.query;

    if (!username || !placeId) {
      return res.status(400).json({ error: "Missing username or placeId" });
    }

    const userId = await getUserId(username);
    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    const universeId = await getUniverseId(placeId);
    const gameBadges = await getGameBadges(universeId);
    const playerBadges = await getPlayerBadges(userId);

    const ownedIds = new Set(playerBadges.map(b => b.id));

    const owned = [];
    const missing = [];

    for (const badge of gameBadges) {
      if (ownedIds.has(badge.id)) {
        owned.push(badge);
      } else {
        missing.push(badge);
      }
    }

    const percent = gameBadges.length
      ? ((owned.length / gameBadges.length) * 100).toFixed(2)
      : 0;

    res.json({
      total: gameBadges.length,
      owned: owned.length,
      percent,
      missing
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
