import childProcess from "child_process";
import Util from "./util.js";

export default class Encoder {
	static Init() {
		this.folder = "./videos/";

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
			return "C:\\Users\\User\\Desktop\\Projetos\\ffmpeg\\bin\\ffmpeg.exe";
		} else if (process.platform == "android") {
			return "ffmpeg";
		}
	}

	static generateName(extension) {
		return (new Date()).toLocaleString().replaceAll("/", "-").replaceAll(":", "-").replace(", ", "-").replaceAll(" ", "") + extension;
	}

	constructor(config) {
		if (!Util.verifyPath(Encoder.folder)) {
			Util.createFolder(Encoder.folder);
		}

		var resolution = Encoder.framerates[config.framesize * 2];
		var framerate = Encoder.framerates[config.framesize * 2 + 1];

		var file = Encoder.generateName(".mp4");

		var encoder = childProcess.spawn(Encoder.getPath(), [
			"-probesize",
			(1024 * 1024).toString(),
			"-f",
			"image2pipe",
			"-s",
			resolution,
			"-framerate",
			framerate.toString(),
			"-i",
			"-",
			"-c:v",
			"libx264",
			"-vf",
			"format=yuv420p",
			"-r",
			"30",
			// "-shortest",
			"-movflags",
			"+faststart",
			Util.joinPath(Encoder.folder, file)
		]);

		console.log("New Video:", file);

		// encoder.stderr.on("data", function(data) {
		// 	console.log(data.toString());
		// });	

		encoder.on("close", function(status) {
			if (status == 0) {
				console.log("Video:", file, "Saved");
			} else {
				console.log("Video:", file, "Failed");
			}
		});

		this.encoder = encoder;
		this.file = file;

		this.framesize = config.framesize;
	}

	write(buffer) {
		this.encoder.stdin.write(buffer);
	}

	stop() {
		this.encoder.stdin.end();
	}
}