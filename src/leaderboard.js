/**
 * leaderboard.js
 * Local Leaderboard storage and management (Contract v1.3 - Phase 4)
 */

const fs = require('fs');
const path = require('path');

const LEADERBOARD_FILE = path.resolve(__dirname, '..', 'data', 'leaderboard.json');

function ensureDataDir() {
  const dir = path.dirname(LEADERBOARD_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getLeaderboard() {
  ensureDataDir();
  if (!fs.existsSync(LEADERBOARD_FILE)) {
    const initial = { entries: [] };
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const content = fs.readFileSync(LEADERBOARD_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    if (!parsed || !Array.isArray(parsed.entries)) {
      return { entries: [] };
    }
    return parsed;
  } catch (err) {
    return { entries: [] };
  }
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score; // Score descending
    }
    // Tie-breaker: who achieved it first (achieved_at earlier)
    return new Date(a.achieved_at).getTime() - new Date(b.achieved_at).getTime();
  }).slice(0, 10);
}

function saveLeaderboard(leaderboard) {
  ensureDataDir();
  leaderboard.entries = sortEntries(leaderboard.entries);
  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2), 'utf-8');
  return leaderboard;
}

function addEntry({ name, score, nights_won, seed, achieved_at }) {
  if (!name || typeof name !== 'string') {
    throw new Error('Name must be a string');
  }
  const cleanName = name.trim();
  // 3–12 ký tự [A-Za-z0-9_] (cho phép thêm ký tự tiếng Việt Unicode an toàn)
  if (cleanName.length < 3 || cleanName.length > 12) {
    throw new Error('Name length must be between 3 and 12 characters');
  }

  const entry = {
    name: cleanName,
    score: Math.max(0, parseInt(score, 10) || 0),
    nights_won: Math.min(3, Math.max(0, parseInt(nights_won, 10) || 0)),
    achieved_at: achieved_at || new Date().toISOString(),
    seed: parseInt(seed, 10) || 0
  };

  const lb = getLeaderboard();
  lb.entries.push(entry);
  return saveLeaderboard(lb);
}

function exportLeaderboard(outPath) {
  const lb = getLeaderboard();
  const sorted = {
    entries: sortEntries(lb.entries)
  };
  const resolved = path.resolve(process.cwd(), outPath);
  const outDir = path.dirname(resolved);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(resolved, JSON.stringify(sorted, null, 2), 'utf-8');
  return sorted;
}

module.exports = {
  getLeaderboard,
  addEntry,
  exportLeaderboard,
  sortEntries
};
