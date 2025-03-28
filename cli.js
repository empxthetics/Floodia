import GimkitRoom from './index.js';

const roomCode = process.argv[2];
const amount = parseInt(process.argv[3]) || 5;
const botName = process.argv.slice(4).join(" ") || "Bot";

// Validate inputs
if (!roomCode || isNaN(parseInt(roomCode)) || parseInt(roomCode) < 1e4) {
    console.error('Error: Invalid room code. Please provide a valid room code (e.g., 123456).');
    process.exit(1);
}

if (isNaN(amount) || amount < 1 || amount > 60) {
    console.error('Error: Invalid bot count. Please provide a valid number between 1 and 60.');
    process.exit(1);
}

console.log(`Preparing to spawn ${amount} bots in room code: ${roomCode} with the name "${botName}"...`);

const room = new GimkitRoom(roomCode);

// Function to spawn bots with enhanced error handling and logging
async function spawnBots() {
    let connectedBots = 0;
    let failedBots = 0;

    for (let i = 0; i < amount; i++) {
        try {
            await room.spawn(botName);
            console.log(`Bot ${i + 1} connected successfully!`);
            connectedBots++;
        } catch (err) {
            console.error(`Error: Bot ${i + 1} failed to connect. Room might be full.`);
            failedBots++;
        }

        // Pause between bot spawns to avoid overwhelming the server
        if (i < amount - 1) {
            await delay(500); // 500 ms delay between each bot spawn to manage server load
        }
    }

    console.log(`\nBot spawning summary:`);
    console.log(`- Successfully connected: ${connectedBots}`);
    console.log(`- Failed to connect: ${failedBots}`);
    console.log(`\nPress Ctrl+C to exit`);
}

// Delay function to control bot spawn rate
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Start spawning bots
spawnBots();

