// project info
import { name, version } from "../package.json";

// abstracted server RCON methods
import * as server from "./server";

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

// message
console.info(`Starting (${name} - v${version})... `);

/**
 * RCON Methods
 */
import Rcon from "rcon-srcds";

// run `list` command, and format response
const getPlayers = async (serverInfo: IServerInfo) => {
	// get player list data
	let playerListResponse = await server[serverInfo.TYPE].getList(serverInfo);

	// no response
	if (!playerListResponse) return;

	// init new server data
	let newServerData =
		server[serverInfo.TYPE].parseDataFromList(playerListResponse);

	// update server data and discord presence
	if (newServerData !== serverInfo.data) {
		serverInfo.data = newServerData;
		updateDiscordPresence(serverInfo);
	}
};

// authenticate
const authRCONClient = async (serverInfo: IServerInfo) => {
	// broadcast
	if (serverInfo.connectionAttempts <= 3)
		console.info(
			"Attempting to establish RCON connection..." +
				(serverInfo.connectionAttempts > 1
					? ` (Attempt ${serverInfo.connectionAttempts})`
					: "")
		);
	else if (serverInfo.connectionAttempts == 4)
		console.warn(
			"Failed to connect after 3 attempts! Will continue to attempt reconnecting in 5 minute intervals from now on..."
		);

	// log attempt
	serverInfo.connectionAttempts += 1;

	// attempt auth
	await serverInfo.rconClient
		.authenticate(serverInfo.RCON_PASSWORD as string)
		.then(() => {
			// broadcast
			console.info("RCON connection established!");

			// clear attempts
			serverInfo.connectionAttempts = 0;
		});

	// fetch
	fetchData(serverInfo);
};

// establish RCON connection and begin data fetching
const fetchData = async (serverInfo: IServerInfo) => {
	// check if authenticated
	if (!serverInfo.rconClient.connected) {
		// already tried to connect 3 or more times- try again in 5 minutes
		if (serverInfo.connectionAttempts > 3) {
			setTimeout(authRCONClient, 300000);
		}

		// retry RCON connection immediately
		else {
			authRCONClient(serverInfo);
		}
		return;
	}

	// get players
	await getPlayers(serverInfo);

	// queue next check (1 minute)
	setTimeout(() => {
		fetchData(serverInfo);
	}, 60000);
};

/**
 * Discord Methods
 */
import { ActivityType, Client, Events, GatewayIntentBits } from "discord.js";

// update presence
const updateDiscordPresence = (serverInfo: IServerInfo) => {
	// init state
	let state = serverInfo.rconClient.connected
		? `${emojiNumbers[0]} Online`
		: "OFFLINE";

	// update state
	if (serverInfo.rconClient.connected) {
		if (serverInfo.data.onlinePlayerCount > 0)
			state = `${[...serverInfo.data.onlinePlayerCount.toString()]
				.map((number) => {
					return emojiNumbers[parseInt(number)];
				})
				.join("")} Online (${serverInfo.data.onlinePlayerNames.join(
				", "
			)})`;
	}

	// set presence
	serverInfo.discordClient.user?.setPresence({
		status: serverInfo.rconClient.connected ? "online" : "dnd",
		activities: [
			{
				type: ActivityType.Custom,
				name: "Player Count",
				state,
			},
		],
	});
};

// get config
import config from "../config.json";

// get servers
const servers = config.servers as IServerConfig[];

// create discord and RCON client for each server
for (const server of servers) {
	/**
	 * RCON
	 */

	// init RCON client
	const rconClient = new Rcon({
		host: server.RCON_HOST,
		port: server.RCON_PORT,
	});

	/**
	 * Discord
	 *  */

	// create discord client
	const discordClient = new Client({ intents: [GatewayIntentBits.Guilds] });

	// create new server info var
	let serverInfo = {
		...server,
		...{
			rconClient,
			discordClient,
			connectionAttempts: 0,
			data: {
				onlinePlayerNames: [] as string[],
				onlinePlayerCount: 0,
				maxPlayerCount: 0,
			},
		},
	} as IServerInfo;

	// set up discord bot events
	discordClient.once(Events.ClientReady, (client) => {
		// broadcast
		console.info(`Discord Bot (${client.user.username}) Connected!`);

		// update presence
		updateDiscordPresence(serverInfo);
	});

	// login client
	await discordClient.login(serverInfo.DISCORD_BOT_TOKEN);

	// start RCON connection and data fetching
	fetchData(serverInfo);
}
