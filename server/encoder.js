import childProcess from "child_process";
import Util from "./util.js";
import Stream from "stream";

export default class Encoder {
	static Init() {
		this.folder = "./videos/";

		this.resolutions = ["96x96", "160x120", "176x144", "240x176", "240x240", "320x240", "400x296", "480x320", "640x480", "800x600", "1024x768", "1280x720", "1280x1024", "1600x1200"];
		this.framerates = [50, 50, 50, 50, 50, 50, 50, 25, 25, 20, 13, 12, 9, 6];
	}

	static getPath() {
		if (process.platform == "win32") {
			return "C:\\Users\\User\\Desktop\\Projetos\\ffmpeg\\bin\\ffmpeg.exe";
		} else if (process.platform == "android") {
			return "ffmpeg";
		}
	}

	static generateName() {
		return (new Date()).toLocaleString().replaceAll("/", "-").replaceAll(":", "-").replace(", ", "-") + ".mp4";
	}

	constructor(config) {
		if (!Util.verifyPath(Encoder.folder)) {
			Util.createFolder(Encoder.folder);
		}

		var resolution = Encoder.resolutions[config.framesize];
		var framerate = Encoder.framerates[config.framesize];

		var file = Encoder.generateName();

		var stream = new Stream.PassThrough();

		var encoder = childProcess.spawn(Encoder.getPath(), [
			"-y",
			"-f",
			"image2pipe",
			"-s",
			resolution,
			"-r",
			framerate.toString(),
			// "-pix_fmt",
			// "yuv420p",
			"-i",
			"-",
			"-vcodec",
			"h264",
			"-shortest",
			Util.joinPath(Encoder.folder, file)
		]);

		console.log("New Video:", file);

		encoder.on("close", function(status) {
			console.log(status);

			if (status == 0) {
				console.log("Video:", file, "Saved");
			} else {
				console.log("Video:", file, "Failed");
			}
		});

		stream.pipe(encoder.stdin);

		this.encoder = encoder;
		this.stream = stream;
		this.file = file;

		this.framesize = config.framesize;
	}

	write(buffer) {
		this.stream.write(buffer, "utf-8");
	}

	stop() {
		this.stream.end();
	}
}