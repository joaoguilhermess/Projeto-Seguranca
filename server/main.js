import Server from "./server.js";
import Util from "./util.js";
import SocketIO from "./socketio.js";
import Handler from "./handler.js";

class Main {
	static Init() {
		this.port = 3000;

		Server.Init();

		Server.registryFile("/", Util.joinPath("public", "index.html"));

		Server.registryFolder("/public");

		SocketIO.Init();

		Handler.Init();

		var context = this;

		Server.start(this.port, function() {
			console.log("Ready at: http://" + Util.getAddress() + ":" + context.port);
		});
	}
}

Main.Init();