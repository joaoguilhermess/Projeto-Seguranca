import mdns from "multicast-dns";
import cast from "castv2";

class Cast {
	static async Init() {
		this.cast = new cast.Client();

		// var chromecast = await this.search();

		// console.log(chromecast);

		var chromecast = "192.168.1.7";

		await this.connect(chromecast);

		console.log("Casting");

		await this.stop();

		await this.launch("http://192.168.1.10:3000");
	}

	static async search() {
		return await new Promise(function(resolve, reject) {
			var dns = mdns();
			
			dns.on("response", function(response) {
				var list = response.additionals;

				dns.destroy();

				resolve(list[list.length - 1].data);
			});

			dns.query("_googlezone._tcp.local");
		});
	}

	static async connect(chromecast) {
		var context = this;

		await new Promise(function(resolve, reject) {
			context.cast.connect(chromecast, resolve);
		});

		this.connection = this.cast.createChannel("sender-0", "receiver-0", "urn:x-cast:com.google.cast.tp.connection", "JSON");
		this.heartbeat = this.cast.createChannel("sender-0", "receiver-0", "urn:x-cast:com.google.cast.tp.heartbeat", "JSON");
		this.receiver = this.cast.createChannel("sender-0", "receiver-0", "urn:x-cast:com.google.cast.receiver", "JSON");

		this.connection.send({type: "CONNECT"});

		setInterval(function() {
			context.heartbeat.send({type: "PING"});
		}, 5000);
	}

	static async launch(url) {
		this.receiver.send({
			type: "LAUNCH",
			appId: "5CB45E5A",
			requestId: 1
		});

		var context = this;

		this.receiver.on("message", function(data, broadcast) {
			if (data.type == "RECEIVER_STATUS") {
				if (data.status.applications) {
					var transportId = data.status.applications[0].transportId;

					if (transportId && data.status.applications[0].statusText == "URL Cast ready...") {
						var connection = context.cast.createChannel("sender-0", transportId, "urn:x-cast:com.google.cast.tp.connection", "JSON");
						var receiver = context.cast.createChannel("sender-0", transportId, "urn:x-cast:com.url.cast");

						connection.send({type: "CONNECT"});

						receiver.send(JSON.stringify({
							type: "loc",
							url: url
						}));
					}
				}
			}
		});
	}

	static async stop() {
		this.receiver.send({type: "STOP", requestId: 1});

		var context = this;

		var r;

		var status = await new Promise(function(resolve, reject) {
			r = resolve;
			context.receiver.on("message", resolve);
		});

		this.receiver.off("message", r);
	}
}

Cast.Init();