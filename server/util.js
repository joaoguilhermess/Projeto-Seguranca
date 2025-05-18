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

	static readStream(...args) {
		return fs.createReadStream(...args);
	}

	static readFile(path) {
		return fs.readFileSync(path);
	}

	static writeFile(path, content) {
		return fs.writeFileSync(path, content);
	}

	static writeJSON(path, content) {
		return fs.writeFileSync(path, JSON.stringify(content, null, "\t"));
	}

	static readFolder(path) {
		return fs.readdirSync(path);
	}

	static createFolder(path) {
		return fs.mkdirSync(path);
	}

	static getAddress() {
		if (process.platform == "win32") {
			var interfaces = os.networkInterfaces();
			var names = Object.keys(interfaces);

			for (let i = 0; i < names.length; i++) {
				let _interface = interfaces[names[i]];

				for (let c = 0; c < _interface.length; c++) {
					let current = _interface[c];

					if (current.family == "IPv4") {
						if (!current.internal) {
							let args = current.address.split(".");

							if (args[0][0] == "1") {
								if (args[2] == "0") {
									return current.address;
								}
							}
						}
					}
				}
			}
		}
	}

	static formatNumber(n, length = 2) {
		n = n.toString();

		while (n.length < length) {
			n = "0" + n;
		}

		return n;
	}
}