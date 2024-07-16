import Util from "../util.js";
import net from "net";

class Emulator {
	static async Init() {
		var buffer = Util.readFile("./image4.jpg");
		// var host = "192.168.1.3";
		var host = "192.168.1.10";
		var chunk = 1024;

		var socket = new net.Socket();

		this.socket = socket;

		await new Promise(function(resolve, reject) {
			socket.connect(3000, host, resolve);
		});

		socket.on("data", function(data) {
			console.log(data.toString());
		});

		console.log("Connected");

		await new Promise(function(resolve, reject) {
			setTimeout(resolve, 2500);
		});

		socket.write("POST /stream HTTP/1.1");
		socket.write("\r\n");
		socket.write("Host: ");
		socket.write(host);
		socket.write("\r\n");
		socket.write("Upgrade: uploader");
		socket.write("\r\n");
		socket.write("Connection: Upgrade");
		socket.write("\r\n\r\n");

		var context = this;

		while (!socket.closed) {
			var config = "{\"id\": \"sdjskdjaka\"}";

			await context.write("c");

			await context.write(context.getLength(config));

			await context.write(config);

			await context.write("f");

			await context.write(context.getLength(buffer));

			await context.write(buffer);

			// var size = buffer.length;

			// for (let i = 0; i < size; i += chunk) {
			// 	if (i + chunk < size) {
			// 		socket.write(buffer.slice(i, chunk));
			// 	} else if (size - i > 0) {
			// 		socket.write(buffer.slice(i, size - i));
			// 	}
			// }

			await this.delay(1000/15);
		}

		console.log("Disconnected");
	}

	static delay(time) {
		return new Promise(function(resolve, reject) {
			setTimeout(resolve, time);
		});
	}

	static async write(content) {
		// console.log(content.length, content.toString("hex"));

		// await this.delay(1000);

		return this.socket.write(content);
	}

	static getLength(object) {
		var length = object.length.toString();

		while (length.length < 10) {
			length = "0" + length;
		}

		return length;
	}
}

Emulator.Init();