import {Server as IO} from "socket.io";
import Encoder from "./encoder.js";
import Server from "./server.js";
import crypto from "crypto";
var sharp;

if (process.platform == "win32") {
	sharp = (await import("sharp")).default;
}

export default class Handler {
	static async Init() {
		this.boundary = "thisisaborder";
		this.receivers = [];
		this.uploaders = [];

		this.registrySocketIO();

		this.registryStream();

		this.registryHandler();
	}

	static registrySocketIO() {
		var io = new IO(Server.server);

		var context = this;

		io.on("connection", function(socket) {
			socket.on("command", function(id, alias, value) {
				context.sendCommand(alias, value);
			});

			for (let i = 0; i < context.uploaders.length; i++) {
				socket.emit("uploader", context.uploaders[i].id, "connected");
				socket.emit("config", context.uploaders[i].id, context.uploaders[i].config);
			}
		});

		this.io = io;
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

			socket.on("error", function(e) {
				console.log("e:", e);
				
				socket.closed = true;

				socket.destroy();
			});

			socket.on("end", function() {
				socket.closed = true;

				socket.destroy();

				context.updateReceivers();
			});

			console.log("Receiver Connected");

			console.log("Receivers:", context.receivers.length);
		});
	}

	static registryHandler() {
		var context = this;

		Server.server.on("upgrade", async function(request, socket, head) {
			if (request.headers.upgrade != "uploader") {return};

			console.log("Uploader Connected");

			socket.id = "id" + crypto.randomBytes(16).toString("hex");

			socket.on("error", function(...args) {console.log("error", ...args);});
			// socket.on("timeout", function(...args) {console.log("timeout", ...args);});
			// socket.on("end", function(...args) {console.log("end", ...args);});
			// socket.on("close", function(...args) {console.log("close", ...args);});

			socket.write("start\n");

			socket.config = {
				framesize: 11,
				quality: 10,
				brightness: 0,
				contrast: 0,
				saturation: 0,
				special_effect: 0,
				awb: 1,
				awb_gain: 1,
				wb_mode: 0,
				aec: 1,
				aec2: 0,
				ae_level: 0,
				aec_value: 300,
				agc: 1,
				agc_gain: 0,
				gainceiling: 0,
				bpc: 0,
				wpc: 1,
				raw_gma: 1,
				lenc: 1,
				hmirror: 0,
				vflip: 0,
				dcw: 1,
				colorbar: 0
			};

			context.uploaders.push(socket);
			
			context.io.emit("uploader", socket.id, "connected");
			context.io.emit("config", socket.id, socket.config);

			socket.on("readable", function() {if (socket.unlock) {socket.unlock();}});
			socket.on("error", function() {if (socket.unlock) {socket.unlock();}});
			socket.on("end", function() {if (socket.unlock) {socket.unlock();}});

			let encoder = new Encoder(socket.config);

			var encoderInterval = setInterval(function() {
				encoder.save();

				encoder = new Encoder(socket.config);
			}, 10 * 60 * 1000);

			while (!socket.closed) {
				if (socket.closeTimeout) {
					clearTimeout(socket.closeTimeout);
				}

				socket.closeTimeout = setTimeout(function() {
					if (socket.unlock) {
						socket.unlock();
					}

					socket.end();

					socket.destroy();

					delete socket.closeTimeout;
				}, 1000);

				let t = (await context.read(socket, 1)).toString();

				if (t.length != 1) {
					break;
				}

				if (t == "c") {
					let length = parseInt((await context.read(socket, 10)).toString());

					let config = (await context.read(socket, length)).toString();

					if (config.length != length) {break;}

					config = JSON.parse(config);

					let keys = Object.keys(config);

					for (let i = 0; i < keys.length; i++) {
						socket.config[keys[i]] = config[keys[i]];
					};

					if (socket.config.framesize != encoder.framesize) {
						encoder.save();

						encoder = new Encoder(socket.config);
					}

					context.io.emit("config", socket.id, socket.config);
				} else if (t == "f") {
					let length = parseInt((await context.read(socket, 10)).toString());

					let frame = await context.read(socket, length);

					if (frame.length != length) {break;}

					let fps = context.getFps(socket);

					context.io.emit("fps", socket.id, fps);

					if (process.platform == "win32") {
						let motion = await context.getMotion(socket, frame);

						if (motion) {
							context.io.emit("motion", socket.id, motion);
							
							// if (motion > 40) {
							// 	if (!socket.commandTimeout) {
							// 		context.startBlinking(socket);
							// 	}
							// }
						}
					}

					encoder.write(frame);

					context.sendframe(socket.id, frame);
				}
			}

			encoder.save();

			clearInterval(encoderInterval);

			console.log("Uploader Disconnected");

			context.uploaders.splice(context.uploaders.indexOf(socket), 1);

			context.io.emit("uploader", socket.id, "disconnected");
		});
	}

	static async getMotion(socket, frame) {
		var raw = new Uint8ClampedArray(await sharp(frame).resize(32).grayscale().raw().toBuffer());

		if (!socket.last) {
			socket.last = raw;

			return;
		}

		if (socket.last.length == raw.length) {
			var d = 0;

			for (let i = 0; i < raw.length; i++) {
				if (Math.abs(raw[i] - socket.last[i]) > 5) {
					d += 1;
				}
			}

			if (d > 0) {
				var percent = (d / raw.length * 100);

				socket.last = raw;

				return percent;
			}
		}

		socket.last = raw;
	}

	static getFps(socket) {
		if (!socket.fps) {
			socket.fps = [];
		}

		var now = performance.now();

		while (socket.fps.length > 0 && socket.fps[0] <= now - 1000) {
			socket.fps.shift();
		}

		socket.fps.push(now);

		return socket.fps.length;
	}

	static updateReceivers() {
		for (let i = 0; i < this.receivers.length; i++) {
			if (this.receivers[i].closed) {
				this.receivers.splice(i, 1);
				i -= 1;
			}
		}
	}

	static async sendframe(id, frame) {
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

	static async read(socket, length) {
		let chunks = [];
		let read = 0;

		while (!socket.closed && read < length) {
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

	static async sendCommand(alias, value) {
		for (let i = 0; i < this.uploaders.length; i++) {
			let uploader = this.uploaders[i];

			uploader.write(alias + "\n");
			uploader.write(value + "\n");

			uploader.config[alias] = value;

			if (uploader.commandTimeout) {
				clearTimeout(uploader.commandTimeout);
			}

			uploader.commandTimeout = setTimeout(function() {
				delete uploader.commandTimeout;
			}, 2 * 1000);
		}
	}

	static startBlinking(socket) {
		var	context = this;

		var command = "flash";

		if (!socket.blinkInterval) {
			context.sendCommand(command, 1);

			socket.led = true;

			socket.blinkInterval = setInterval(function() {
				if (socket.led) {
					context.sendCommand(command, 0);

					socket.led = false;
				} else {
					context.sendCommand(command, 1);

					socket.led = true;
				}
			}, 1000/2);
		}

		if (!socket.ledTimeout) {
			socket.ledTimeout = setTimeout(function() {
				clearInterval(socket.blinkInterval);

				delete socket.blinkInterval;
				delete socket.led;
				delete socket.ledTimeout;

				context.sendCommand(command, 0);
			}, 5 * 1000);
		}
	}
}