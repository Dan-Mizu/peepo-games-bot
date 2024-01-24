import path from "node:path";
import stripAnsi from "strip-ansi";

export default {
	getList: async (serverInfo: IServerInfo): Promise<string | void> => {
		const arrconLocation = path.join(
			import.meta.dir,
			process.env.ARRCON_PATH as string
		);

		const arrcon = Bun.spawn([
			arrconLocation,
			"-H",
			serverInfo.RCON_HOST,
			"-P",
			String(serverInfo.RCON_PORT),
			"-p",
			serverInfo.RCON_PASSWORD,
			"ShowPlayers",
		]);

		let playerListResponse = stripAnsi(
			await new Response(arrcon.stdout).text()
		)
			.split("\n")
			.slice(1)
			.join("\n");

		arrcon.kill();

		return playerListResponse;
	},
	parseDataFromList: (playerListResponse: string): IServerData => {
		// init new server data
		let newServerData: IServerData = {
			onlinePlayerNames: [] as string[],
			onlinePlayerCount: 0,
			maxPlayerCount: 0,
		};

		// remove unnecessary data and characters
		let formattedResponse = playerListResponse
			.trim()
			.replace(/[\r\n]+/gm, ",")
			.split(",")
			.slice(3);

		// get player name list
		let players: string[] = [];
		let index = 0;
		for (const data of formattedResponse) {
			if (index == 0 || index > 2) {
				players.push(data);
				index = 0;
			}
			index++;
		}

		// set data
		newServerData.onlinePlayerCount = players.length;
		newServerData.onlinePlayerNames = players;

		return newServerData;
	},
};
