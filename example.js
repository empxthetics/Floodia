import GimkitRoom from './index.js';

const roomCode = "123456"; // Replace with your room code
const botCount = 3; // Total bots to spawn
const botPrefix = "Bot"; // Prefix for bot names

// Configure the delay (in ms) between spawning each bot to avoid overwhelming the server
const spawnDelay = 500; // Delay in milliseconds between each bot spawn

// Enhanced logging function for clarity and smooth interaction
const logSuccess = (botIndex) => {
    console.log(`✅ Bot ${botIndex + 1} successfully connected to room "${roomCode}".`);
};

const logFailure = (botIndex) => {
    console.error(`❌ Bot ${botIndex + 1} failed to connect. The room is likely full or there's a network issue.`);
};

// Function to introduce delay between bot spawns for smooth performance
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function spawnBots() {
    console.log(`Starting bot spawn process for room code: "${roomCode}"`);
    console.log(`Attempting to spawn ${botCount} bots...`);

    // Initialize the Gimkit room
    const room = new GimkitRoom(roomCode);
    let successfulSpawns = 0;
    let failedSpawns = 0;

    // Loop through and spawn bots asynchronously, but with a delay for pacing
    for (let i = 0; i < botCount; i++) {
        try {
            console.log(`Attempting to spawn Bot ${i + 1}...`);
            await room.spawn(`${botPrefix} ${i + 1}`); // Spawn the bot with the provided name
            logSuccess(i);
            successfulSpawns++;
        } catch (error) {
            logFailure(i);
            failedSpawns++;
        }

        // If not the last bot, wait before spawning the next one to avoid spamming the server
        if (i < botCount - 1) {
            await delay(spawnDelay);
        }
    }

    // Summary report at the end of the spawning process
    console.log('\n=== Spawn Process Complete ===');
    console.log(`Total Bots Attempted: ${botCount}`);
    console.log(`Successfully Connected: ${successfulSpawns}`);
    console.log(`Failed to Connect: ${failedSpawns}`);
    console.log('Use Ctrl+C to exit or press Enter to restart the process.');

    // End of the spawning process
    process.exit(0);
}

// Run the bot spawning process
spawnBots().catch((error) => {
    console.error("An unexpected error occurred:", error);
    process.exit(1);
});
