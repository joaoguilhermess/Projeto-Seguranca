import Handler from "./handler.js";
import Encoder from "./encoder.js";
import Server from "./server.js";
import Stream from "./stream.js";
import Videos from "./videos.js";
import Util from "./util.js";
import log from "./log.js";

class Main {
	static Init() {
		this.folder = "./videos/";
		this.port = 3000;

		Server.Init();

		Server.registryFile("/", Util.joinPath("public", "index.html"));

		Server.registryFolder("/public");

		Encoder.Init(this.folder);

		Stream.Init();

		Handler.Init();

		Videos.Init(this.folder);

		var context = this;

		Server.start(this.port, function() {
			log("Ready at: http://" + Util.getAddress() + ":" + context.port);
		});
	}
}

Main.Init();