import path from "path";
import fs from "fs";
import os from "os";

export default class Util {
	static joinPath(...args) {
		return path.join(...args);
	}

	static verifyPath(path) {
		return fs.existsSync(path);
	}

	static readStats(path) {
		return fs.lstatSync(path);
	}

	static readStream(path) {
		return fs.createReadStream(path);
	}

	static readFile(path) {
		return fs.readFileSync(path);
	}

	static writeFile(path, content) {
		return fs.writeFileSync(path, content);
	}

	static createFolder(path) {
		return fs.mkdirSync(path);
	}

	static getAddress() {
		if (process.platform == "win32") {
			return os.networkInterfaces()["Ethernet 2"][1].address;
		} else if (process.platform == "android") {
			return os.networkInterfaces().wlan0[1].address;
		}
		
		return "localhost";
	}
}