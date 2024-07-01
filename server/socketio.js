import {Server as IO} from "socket.io";
import Server from "./server.js";
import Handler from "./handler.js";

export default class SocketIO {
	static Init() {
		var io = new IO(Server.server);

		io.on("connection", function(socket) {
			socket.on("command", function(alias, value) {
				Handler.sendCommand(alias, value);
			});
		});

		this.io = io;
	}

	static sendEvent(name, value) {
		return this.io.emit(name, value);
	}
}