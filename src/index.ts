import { name, version } from "../package.json";

// constants
const emojiNumbers = [
	"0️⃣",
	"1️⃣",
	"2️⃣",
	"3️⃣",
	"4️⃣",
	"5️⃣",
	"6️⃣",
	"7️⃣",
	"8️⃣",
	"9️⃣",
];

// internal
let connectionAttempts: number = 0;
let serverData = {
	onlinePlayerNames: [] as string[],
	onlinePlayerCount: 0,
	maxPlayerCount: 0,
};

// message
console.info(`Starting (${name} - v${version})... `);

/**
 * RCON
 */

import Rcon from "rcon-srcds";

// init RCON client
const rconClient = new Rcon({
	host: process.env.RCON_HOST as string,
	port: Number(process.env.RCON_PORT),
});

// run `list` command, and format response
const getPlayers = async () => {
	// get player list data
	let playerListResponse = await rconClient
		.execute("list")
		.then((response) => {
			return response as string;
		})
		.catch((error) => {
			console.error(error);
			return;
		});

	// no response
	if (!playerListResponse) return;

	// init new server data
	let newServerData = {
		onlinePlayerNames: [] as string[],
		onlinePlayerCount: 0,
		maxPlayerCount: 0,
	};

	// format response and separate player numbers/names
	let numberDataUnparsed, playerNamesUnparsed;
	[numberDataUnparsed, playerNamesUnparsed] = playerListResponse
		.replace("There are ", "")
		.replace(" of a max of", "")
		.replace(" players online", "")
		.split(":");
	newServerData.onlinePlayerNames = playerNamesUnparsed
		.trim()
		.replaceAll(",", "")
		.split(" ");

	// get player counts
	[newServerData.onlinePlayerCount, newServerData.maxPlayerCount] =
		numberDataUnparsed.split(" ").map((string: string) => {
			return parseInt(string);
		});

	// update server data and discord presence
	if (newServerData !== serverData) {
		serverData = newServerData;
		updateDiscordPresence();
	}
};

// authenticate
const authRCONClient = async () => {
	// broadcast
	if (connectionAttempts <= 3)
		console.info(
			"Attempting to establish RCON connection..." +
				(connectionAttempts > 1
					? ` (Attempt ${connectionAttempts})`
					: "")
		);
	else if (connectionAttempts == 4)
		console.warn(
			"Failed to connect after 3 attempts! Will continue to attempt reconnecting in 5 minute intervals from now on..."
		);

	// log attempt
	connectionAttempts += 1;

	// attempt auth
	await rconClient
		.authenticate(process.env.RCON_PASSWORD as string)
		.then(() => {
			// broadcast
			console.info("RCON connection established!");

			// clear attempts
			connectionAttempts = 0;
		});

	// fetch
	fetchData();
};

// establish RCON connection and begin data fetching
const fetchData = async () => {
	// check if authenticated
	if (!rconClient.connected) {
		// already tried to connect 3 or more times- try again in 5 minutes
		if (connectionAttempts > 3) {
			setTimeout(authRCONClient, 300000);
		}

		// retry RCON connection immediately
		else {
			authRCONClient();
		}
		return;
	}

	// get players
	await getPlayers();

	// queue next check (3 seconds)
	setTimeout(fetchData, 3000);
};

// start RCON connection and data fetching
fetchData();

/**
 * Discord Bot
 */

import { ActivityType, Client, Events, GatewayIntentBits } from "discord.js";

// create discord client
const discordClient = new Client({ intents: [GatewayIntentBits.Guilds] });

// update presence
const updateDiscordPresence = () => {
	// init state
	let state = rconClient.connected ? `${emojiNumbers[0]} Online` : "OFFLINE";

	// update state
	if (rconClient.connected) {
		if (serverData.onlinePlayerCount > 0)
			state = `${[...serverData.onlinePlayerCount.toString()]
				.map((number) => {
					return emojiNumbers[parseInt(number)];
				})
				.join("")} Online (${serverData.onlinePlayerNames.join(", ")})`;
	}

	// set presence
	discordClient.user?.setPresence({
		status: rconClient.connected ? "online" : "dnd",
		activities: [
			{
				type: ActivityType.Custom,
				name: "Player Count",
				state,
			},
		],
	});
};

// events
discordClient.once(Events.ClientReady, (client) => {
	// broadcast
	console.info(`Discord Bot (${client.user.username}) Connected!`);

	// update presence
	updateDiscordPresence();
});

// login client
discordClient.login(process.env.DISCORD_BOT_TOKEN);
