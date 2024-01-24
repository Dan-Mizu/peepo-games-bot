import { Client } from "discord.js";
import Rcon from "rcon-srcds";

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
		TYPE: "minecraft" | "palworld";
		DISCORD_BOT_TOKEN: string;
		RCON_HOST: string;
		RCON_PORT: number;
		RCON_PASSWORD: string;
	}

	interface IServerInfo extends IServerConfig {
		rconClient: Rcon;
		discordClient: Client;
		connectionAttempts: number;
		data: IServerData;
	}
}
