import Util from "./util.js";

export default function log(...args) {
	var d = new Date();

	console.log([
		Util.formatNumber(d.getDate()),
		Util.formatNumber(d.getMonth() + 1),
		Util.formatNumber(d.getFullYear(), 4)
	].join("/"), [
		Util.formatNumber(d.getHours()),
		Util.formatNumber(d.getMinutes()),
		Util.formatNumber(d.getSeconds()),
		Util.formatNumber(d.getMilliseconds(), 4)
	].join(":"), "|", ...args);
}