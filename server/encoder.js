import childProcess from "child_process";
import Util from "./util.js";
import log from "./log.js";

export default class Encoder {
	static Init(folder) {
		this.folder = folder;

		this.framerates = [
			"96x96", 50,
			"160x120", 50,
			"176x144", 50,
			"240x176", 50,
			"240x240", 50,
			"320x240", 50,
			"400x296", 50,
			"480x320", 25,
			"640x480", 25,
			"800x600", 20,
			"1024x768", 13,
			"1280x720", 12,
			"1280x1024", 9,
			"1600x1200", 6
		];
	}

	static getPath() {
		if (process.platform == "win32") {
			return "ffmpeg.exe";
		} else if (process.platform == "android") {
			return "ffmpeg";
		}
	}

	static generateName(extension) {
		var d = new Date();

		// return [
		// 	Util.formatNumber(d.getDate()),
		// 	Util.formatNumber(d.getMonth() + 1),
		// 	Util.formatNumber(d.getFullYear(), 4),
		// 	Util.formatNumber(d.getHours()),
		// 	Util.formatNumber(d.getMinutes()),
		// 	Util.formatNumber(d.getSeconds()),
		// 	Util.formatNumber(d.getMilliseconds(), 4)
		// ].join("-") + extension;

		return Date.now() + extension;
	}

	constructor(socket) {
		this.startime = Date.now();

		if (!Util.verifyPath(Encoder.folder)) {
			Util.createFolder(Encoder.folder);
		}

		var resolution = Encoder.framerates[socket.config.framesize * 2];
		var framerate = Encoder.framerates[socket.config.framesize * 2 + 1];

		var file = Encoder.generateName(".mp4");

		var encoder = childProcess.spawn(Encoder.getPath(), [
			"-probesize",
			(1024 * 1024).toString(),
			"-f",
			"image2pipe",
			"-s",
			resolution,
			// "-framerate",
			// framerate.toString(),
			"-use_wallclock_as_timestamps",
			"1",
			"-i",
			"-",
			"-c:v",
			"libx264",
			"-vf",
			"format=yuv420p",
			"-r",
			// framerate.toString(),
			"15",
			"-movflags",
			"+faststart",
			"-preset",
			"veryfast",
			"-crf",
			"30",
			Util.joinPath(Encoder.folder, file)
		]);

		log("New Video:", file);

		// encoder.stderr.on("data", function(data) {
			// log(data.toString());
		// });

		encoder.on("close", function(status) {
			if (status == 0) {
				log("Video:", file, "Saved");
			} else {
				log("Video:", file, "Failed");
			}
		});

		this.encoder = encoder;
		this.file = file;

		this.framesize = socket.config.framesize;
	}

	write(buffer) {
		try {
			this.encoder.stdin.write(buffer);
		} catch {}
	}

	save(callback) {
		this.encoder.on("close", callback);

		this.encoder.stdin.end();
	}

	getDuration() {
		return Date.now() - this.startime;
	}
}