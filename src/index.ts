// project info
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

// message
console.info(`Starting (${name} - v${version})... `);

/**
 * Discord Methods
 */
import { ActivityType, Client, Events, GatewayIntentBits } from "discord.js";

// update presence
const updateDiscordPresence = (serverInfo: IServerInfo) => {
	// init state
	let state = `${emojiNumbers[0]} Online`;

	// update state
	if (serverInfo.data.onlinePlayerCount > 0)
		state = `${[...serverInfo.data.onlinePlayerCount.toString()]
			.map((number) => {
				return emojiNumbers[parseInt(number)];
			})
			.join("")} Online (${serverInfo.data.onlinePlayerNames.join(
			", "
		)})`;

	// set presence
	serverInfo.discordClient.user?.setPresence({
		status: "online",
		activities: [
			{
				type: ActivityType.Custom,
				name: "Player Count",
				state,
			},
		],
	});
};

/**
 * Server methods
 */
import * as server from "./server";

const fetchData = async (serverInfo: IServerInfo) => {
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

	// queue next check
	setTimeout(() => {
		fetchData(serverInfo);
	}, Number(process.env.DATA_FETCH_INTERVAL_MS));
};

// get config
import config from "../config.json";

// get servers
const servers = config.servers as IServerConfig[];

// create discord bot for each server
for (const server of servers) {
	/**
	 * Discord
	 *  */

	// create discord client
	const discordClient = new Client({ intents: [GatewayIntentBits.Guilds] });

	// create new server info var
	let serverInfo = {
		...server,
		...{
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

	// start fetching data
	fetchData(serverInfo);
}
