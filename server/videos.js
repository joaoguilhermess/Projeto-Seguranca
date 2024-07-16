import Encoder from "./encoder.js";
import Server from "./server.js";
import Util from "./util.js";
import log from "./log.js";
import fs from "fs";

export default class Videos {
	static Init(folder) {
		this.folder = folder;

		this.registryList();

		this.registryPlayer();
	}

	static registryList() {
		var context = this;

		Server.registryScript("/videos", async function(request, response) {
			if (!Util.verifyPath(context.folder)) {
				Util.createFolder(context.folder);
			}

			var files = Util.readFolder(context.folder);

			var videos = [];

			var header = Buffer.from("mvhd");

			for (let i = 0; i < files.length; i++) {
				let path = Util.joinPath(context.folder, files[i]);

				let stats = Util.readStats(path);

				let file = fs.openSync(path, "r");

				let buffer = Buffer.alloc(100);

				fs.readSync(file, buffer, 0, 100, 0);

				fs.closeSync(file);

				let start = buffer.indexOf(header) + 17;
				let scale = buffer.readUInt32BE(start, 4);
				let duration = buffer.readUInt32BE(start + 4, 4);

				videos.push({
					start: parseInt(files[i].split(".")[0]),
					duration: Math.floor((duration / scale) * 1000),
					size: stats.size,
					url: files[i]
				});
			}

			response.send(videos);
		});
	}

	static registryPlayer() {
		var context = this;

		Server.registryScript("/videos/*", async function(request, response) {
			var file = request.url.split("/")[2];

			var path = Util.joinPath(context.folder, file);

			if (Util.verifyPath(path)) {
				var total = Util.readStats(path).size;

				response.contentType(file);

				response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, pre-check=0, post-check=0, max-age=0");
				response.setHeader("Pragma", "no-cache");
				
				if (request.headers.range) {
					var range = request.headers.range.slice(6).split("-");

					var start = range[0];

					var end = range[1];

					if (!end) {
						end = total - 1;
					}

					var length = end - start + 1;

					response.setHeader("Accept-Ranges", "bytes");
					response.setHeader("Content-Length", length);
					response.setHeader("Content-Range", "bytes " + start + "-" + end + "/" + total);
					response.writeHead(206);

					var stream = Util.readStream(path, {start: parseInt(start), end: parseInt(end)});

					return stream.pipe(response);
				} else {
					response.setHeader("Content-Length", total);
					var stream = Util.readStream(path);

					response.writeHead(200);

					request.on("end", function() {
						console.log("wasdadsad");
					});

					return stream.pipe(response);
				}
			}

			return response.sendStatus(404);
		});
	}
}