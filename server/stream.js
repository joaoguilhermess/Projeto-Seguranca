import Server from "./server.js";
import log from "./log.js";

export default class Stream {
	static Init() {
		this.boundary = "thisisaborder";
		this.receivers = [];

		this.registryStream();
	}

	static registryStream() {
		var context = this;

		Server.registryScript("/stream/*", async function(request, response) {
			let socket = request.socket;

			socket.streamId = request.url.split("/")[2];

			socket.write("HTTP/1.1 200 OK\r\n");
			socket.write("Cache-Control: no-store, no-cache, must-revalidate, pre-check=0, post-check=0, max-age=0\r\n");
			socket.write("Pragma: no-cache\r\n");
			socket.write("Connection: close\r\n");
			socket.write("Content-Type: multipart/x-mixed-replace; boundary=" + context.boundary + "\r\n\r\n");

			context.receivers.push(socket);

			context.updateReceivers(true);

			var f = function() {
				socket.destroy();

				context.updateReceivers(true);
			};

			socket.on("error", f);

			socket.on("end", f);

			log("Receiver Connected");
		});
	}

	static updateReceivers(firstLog) {
		if (firstLog) {
			log("Receivers:", this.receivers.length);
		}

		var changed = false;

		for (let i = 0; i < this.receivers.length; i++) {
			if (this.receivers[i].closed) {
				this.receivers.splice(i, 1);

				i -= 1;

				changed = true;
			}
		}

		if (changed) {
			log("Receivers:", this.receivers.length);
		}
	}

	static sendFrame(id, frame) {
		this.updateReceivers();

		for (let i = 0; i < this.receivers.length; i++) {
			let receiver = this.receivers[i];

			if (receiver.streamId != id) {continue;}

			receiver.write("--" + this.boundary + "\r\n");
			receiver.write("Content-Type: image/jpeg\r\n");
			receiver.write("Content-Length: " + frame.length + "\r\n\r\n");

			receiver.write(frame);
		}
	}
}