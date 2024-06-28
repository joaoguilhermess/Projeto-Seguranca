import Server from "./server.js";

export default class Handler {
	static Init() {
		this.boundary = "626f756e64617279";
		this.frame; 
		this.unlock;
		this.received = 0;

		this.receivers = [];

		this.registryStream();

		this.registryHandler();
	}

	static registryStream() {
		var context = this;

		Server.registryScript("/stream", async function(request, response) {
			request.socket.write("HTTP/1.1 200 OK\r\n");
			request.socket.write("Cache-Control: no-store, no-cache, must-revalidate, pre-check=0, post-check=0, max-age=0\r\n");
			request.socket.write("Pragma: no-cache\r\n");
			request.socket.write("Connection: close\r\n");
			request.socket.write("Content-Type: multipart/x-mixed-replace; boundary=" + context.boundary + "\r\n\r\n");

			context.receivers.push(request.socket);

			request.socket.on("close", function() {
				context.receivers.splice(context.receivers.indexOf(request.socket), 1);
			});

			console.log("Receiver Connected");

			console.log("Receivers:", context.receivers.length);
		});
	}

	static registryHandler() {
		var context = this;

		Server.registryPostScript("/stream", async function(request, response) {
			console.log("Esp32 Connected");

			let socket = request.socket;

			socket.on("readable", function() {
				if (socket.unlock) {
					socket.unlock();
				}
			});

			socket.on("close", function() {
				if (socket.unlock) {
					socket.unlock();
				}
			});

			while (true) {
				let length = await context.read(socket, 10);

				if (length) {
					length = parseInt(length.toString());
				} else {
					break;
				}

				let frame = await context.read(socket, length);

				if (frame.length > 0) {
					for (let i = 0; i < context.receivers.length; i++) {
						context.sendframe(context.receivers[i], frame);
					}
				} else {
					break;
				}
			}
		});
	}

	static async sendframe(socket, frame) {
		socket.write("--" + this.boundary + "\r\n");
		socket.write("Content-Type: image/jpeg\r\n");
		socket.write("Content-Length: " + frame.length + "\r\n\r\n");

		socket.write(frame);
	}

	static async read(socket, length) {
		let chunks = [];
		let read = 0;

		while (read < length) {
			if (socket._readableState.length < length - read) {
				if (socket._readableState.length > 0) {
					let buffer = socket.read();

					chunks.push(buffer);

					read += buffer.length;
				}

				await new Promise(function(resolve, reject) {
					socket.unlock = resolve;
				});
			}

			if (socket._readableState.length >= length - read) {
				let buffer = socket.read(length - read);

				chunks.push(buffer);

				read += buffer.length;
			}
		}

		return Buffer.concat(chunks);
	}
}