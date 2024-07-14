import Handler from "./handler.js";
import Encoder from "./encoder.js";
import Server from "./server.js";
import Util from "./util.js";
import log from "./log.js";

class Main {
	static Init() {
		this.port = 3000;

		Server.Init();

		Server.registryFile("/", Util.joinPath("public", "index.html"));

		Server.registryFolder("/public");

		Encoder.Init();

		Handler.Init();

		var context = this;

		Server.start(this.port, function() {
			log("Ready at: http://" + Util.getAddress() + ":" + context.port);
		});
	}
}

Main.Init();