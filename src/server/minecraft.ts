import Rcon from "rcon-srcds";

export default {
	getList: async (serverInfo: IServerInfo): Promise<string | void> => {
		// get player list data
		let playerListResponse = await serverInfo.rconClient
			.execute("list")
			.then((response) => {
				return response as string;
			})
			.catch((error) => {
				console.error(error);
				return;
			});
		return playerListResponse;
	},
	parseDataFromList: (playerListResponse: string): IServerData => {
		// init new server data
		let newServerData: IServerData = {
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

		return newServerData;
	},
};
