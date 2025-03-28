import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import StegCloak from 'stegcloak';
import WebSocket from 'ws';
import { encode } from './network/blueboat.js';

/**
 * @class GimkitRoom
 * Class representing a Gimkit Room where bots can be spawned.
 */
export default class GimkitRoom {
    /**
     * @param {string} roomId The ID of the Gimkit room to spawn bots in.
     */
    constructor(roomId) {
        this.roomId = roomId;
        this.roomInfoReady = new Promise((resolve, reject) => {
            this.resolveRoomInfo = resolve;
            this.rejectRoomInfo = reject;
        });
        this.roomInfo = null;

        // Fetch room info asynchronously upon initialization
        this.getRoomInfo();
    }

    /**
     * Fetches and processes the room information asynchronously.
     * @private
     */
    async getRoomInfo() {
        try {
            console.log(`Fetching room info for room ID: ${this.roomId}`);
            const infoRes = await fetch('https://www.gimkit.com/api/matchmaker/find-info-from-code', {
                method: 'POST',
                body: JSON.stringify({ code: this.roomId }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const info = await infoRes.json();

            if (info.code === 404) throw new Error('Game not found');

            this.roomInfo = info;
            this.resolveRoomInfo();
            console.log('Room info successfully fetched!');
        } catch (error) {
            this.rejectRoomInfo(error);
            console.error(`Failed to get room info: ${error.message}`);
        }
    }

    /**
     * Spawns a bot in the specified room.
     * @param {string} name The name of the bot (defaults to a random string).
     * @returns {Promise<WebSocket>} The WebSocket connection to the bot.
     */
    async spawn(name = Math.random().toString(36).substring(7)) {
        try {
            console.log(`Attempting to spawn bot: ${name}`);
            await this.roomInfoReady;  // Wait for room info to be fetched

            const pageRes = await fetch('https://www.gimkit.com/join');
            const page = await pageRes.text();
            const root = parse(page);
            const jid = root.querySelector("meta[property='int:jid']").getAttribute("content").split("").reverse().join("");
            const clientType = new StegCloak(true, false).hide(jid, "BSKA", "Gimkit Web Client V3.1");

            const joinRes = await fetch('https://www.gimkit.com/api/matchmaker/join', {
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'https://www.gimkit.com',
                    'Referer': 'https://www.gimkit.com/join',
                },
                body: JSON.stringify({
                    clientType,
                    name,
                    roomId: this.roomInfo.roomId,
                }),
                method: 'POST',
            });

            const join = await joinRes.json();
            const ws = await this.connectToGame(join, name);

            return ws;  // Return the WebSocket connection
        } catch (error) {
            console.error(`Failed to spawn bot "${name}": ${error.message}`);
            throw error;  // Rethrow the error for further handling
        }
    }

    /**
     * Connects the bot to the Gimkit server.
     * @private
     * @param {Object} joinResponse The response object from the join API.
     * @param {string} botName The name of the bot.
     * @returns {Promise<WebSocket>} The WebSocket connection to the bot.
     */
    async connectToGame(joinResponse, botName) {
        try {
            const joinSource = joinResponse.source;

            if (joinSource === 'original') {
                console.log(`Connecting bot "${botName}" via Blueboat server...`);
                const wsUrl = `wss${joinResponse.serverUrl.substr(5)}/blueboat/?id=&EIO=3&transport=websocket`;
                const ws = new WebSocket(wsUrl);

                ws.on('open', () => this.handleBlueboatConnection(ws, joinResponse));
                return ws;
            }

            const joinIdUrl = `${joinResponse.serverUrl}/matchmake/joinById/${joinResponse.roomId}`;
            const roomRes = await fetch(joinIdUrl, {
                headers: {
                    'Content-Type': 'application/json',
                },
                method: 'POST',
                body: JSON.stringify({ intentId: joinResponse.intentId }),
            });
            const room = await roomRes.json();
            const wsUrl = `wss${joinResponse.serverUrl.substr(5)}/${room.room.processId}/${room.room.roomId}?sessionId=${room.sessionId}`;

            console.log(`Connecting bot "${botName}" to room "${this.roomId}" via WebSocket...`);
            const ws = new WebSocket(wsUrl);

            ws.once('message', (data) => {
                if (data.toString().includes('{"type":"FULL"')) {
                    ws.close();
                    throw new Error('Room is full');
                } else {
                    console.log(`Bot "${botName}" successfully joined the game!`);
                }
            });
            return ws;
        } catch (error) {
            console.error(`Error connecting bot "${botName}": ${error.message}`);
            throw error;
        }
    }

    /**
     * Handles the connection for Blueboat-based bots.
     * @private
     * @param {WebSocket} ws The WebSocket connection.
     * @param {Object} joinResponse The response object from the join API.
     */
    handleBlueboatConnection(ws, joinResponse) {
        const packet = encode({
            roomId: joinResponse.roomId,
            options: { intent: joinResponse.intentId },
        });

        console.log('Sending join packet to the Blueboat server...');
        ws.send(packet);

        // Send a heartbeat packet periodically
        const heartbeatInterval = setInterval(() => {
            console.log('Sending heartbeat packet...');
            ws.send('2');
        }, 25000);

        ws.on('close', () => {
            console.log('WebSocket connection closed. Stopping heartbeat.');
            clearInterval(heartbeatInterval);
        });
    }
}
