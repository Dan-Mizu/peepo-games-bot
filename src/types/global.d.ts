import { Client } from "discord.js";

declare global {
	interface IServerData {
		onlinePlayerNames: string[];
		onlinePlayerCount: number;
		maxPlayerCount: number;
	}

	interface IConfig {
		servers: IServerConfig[];
	}

	interface IServerConfig {
		TYPE: "palworld";
		DISCORD_BOT_TOKEN: string;
		RCON_HOST: string;
		RCON_PORT: number;
		RCON_PASSWORD: string;
	}

	interface IServerInfo extends IServerConfig {
		discordClient: Client;
		connectionAttempts: number;
		data: IServerData;
	}
}
