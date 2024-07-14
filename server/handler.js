import {Server as IO} from "socket.io";
import Encoder from "./encoder.js";
import Server from "./server.js";
import Util from "./util.js";
import crypto from "crypto";
import log from "./log.js";
var sharp;

if (process.platform == "win32") {
	sharp = (await import("sharp")).default;
}

export default class Handler {
	static async Init() {
		this.boundary = "thisisaborder";
		this.receivers = [];
		this.uploaders = [];

		this.configFolder = "./config/";

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

			context.updateReceivers();

			var f = function() {
				socket.destroy();

				context.updateReceivers();
			};

			socket.on("error", f);

			socket.on("end", f);

			log("Receiver Connected");
		});
	}

	static registryHandler() {
		var context = this;

		Server.server.on("upgrade", async function(request, socket, head) {
			if (request.headers.upgrade != "uploader") {return};

			log("Uploader Connected");

			socket.on("error", function(...args) {log("error", ...args);});
			socket.on("timeout", function(...args) {log("timeout", ...args);});
			socket.on("end", function(...args) {log("end", ...args);});
			socket.on("close", function(...args) {log("close", ...args);});

			var f = function() {if (socket.unlock) {socket.unlock();}};

			socket.on("readable", f);
			socket.on("error", f);
			socket.on("end", f);

			socket.write("start\n");

			context.uploaders.push(socket);

			context.updateUploaders();

			socket.id = crypto.randomUUID().replaceAll("-", "");
			
			context.io.emit("uploader", socket.id, "connected");

			socket.config = {};
			socket.encoder;

			while (!socket.closed) {
				if (socket.closeTimeout) {
					clearTimeout(socket.closeTimeout);
				}

				socket.closeTimeout = setTimeout(function() {
					log("closeTimeout");

					if (socket.unlock) {
						socket.unlock();
					}

					socket.end();

					socket.destroy();

					delete socket.closeTimeout;
				}, 1000 * 10);

				let t = (await context.read(socket, 1)).toString();

				if (t.length != 1) {
					break;
				}

				if (t == "c") {
					if (await context.handleConfig(socket)) {return;}
				} else if (t == "f") {
					if (await context.handleFrame(socket)) {return;}
				}
			}

			if (socket.closeTimeout) {
				clearTimeout(socket.closeTimeout);
			}

			socket.encoder.save();

			log("Uploader Disconnected");

			context.updateUploaders();

			context.io.emit("uploader", socket.id, "disconnected");
		});
	}

	static async handleConfig(socket) {
		let length = parseInt((await this.read(socket, 10)).toString());

		let config = (await this.read(socket, length)).toString();

		if (config.length != length) {return true;}

		config = JSON.parse(config);

		let keys = Object.keys(config);

		for (let i = 0; i < keys.length; i++) {
			socket.config[keys[i]] = config[keys[i]];
		};

		if (!Util.verifyPath(this.configFolder)) {
			Util.createFolder(this.configFolder);
		}

		Util.writeJSON(Util.joinPath(this.configFolder, socket.config.id), socket.config);

		if (!socket.encoder) {
			socket.encoder = new Encoder(socket);
		}

		if (socket.config.framesize != socket.encoder.framesize) {
			socket.encoder.save();

			socket.encoder = new Encoder(socket);
		}

		this.io.emit("config", socket.id, socket.config);
	}

	static async handleFrame(socket) {
		let length = parseInt((await this.read(socket, 10)).toString());

		let frame = await this.read(socket, length);

		if (frame.length != length) {return true;}

		let fps = this.getFps(socket);

		this.io.emit("fps", socket.id, fps);

		if (process.platform == "win32") {
			let motion = await this.getMotion(socket, frame);

			if (motion) {
				this.io.emit("motion", socket.id, motion);
				
				// if (motion > 40) {
				// 	if (!socket.commandTimeout) {
				// 		this.startBlinking(socket);
				// 	}
				// }
			}
		}

		if (socket.encoder.getDuration() > 2 * 60 * 1000) {
			socket.encoder.save();

			socket.encoder = new Encoder(socket);
		}

		socket.encoder.write(frame);

		this.sendframe(socket.id, frame);
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

	static updateUploaders() {
		log("Uploaders:", this.uploaders.length);

		var changed = false;

		for (let i = 0; i < this.uploaders.length; i++) {
			if (this.uploaders[i].closed) {
				this.io.emit("uploader", this.uploaders[i].id, "disconnected");

				this.uploaders.splice(i, 1);

				i -= 1;

				changed = true;
			}
		}

		if (changed) {
			log("Uploaders:", this.uploaders.length);
		}
	}

	static updateReceivers(noFirst) {
		if (!noFirst) {
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

	static async sendframe(id, frame) {
		this.updateReceivers(true);

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
			this.sendCommand(command, 1);

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