class Main {
	static Init() {
		this.streams = document.body.querySelector("streams");
		this.right = document.body.querySelector("right");
		this.items = document.body.querySelector("items");
		this.player = document.body.querySelector("player video");

		var context = this;

		new ResizeObserver(function() {
			context.fitStreams();
		}).observe(this.streams);

		this.baseStreamUrl = "/stream/";

		this.addOnload();

		// this.addFullscreen();

		this.InitSocketIO();

		this.addMenu();

		this.updateTimeline();
	}

	static addOnload() {
		window.addEventListener("load", function() {
			document.body.style.display = "flex";
		});
	}

	static addFullscreen() {
		this.streams.addEventListener("click", function() {
			if (!document.fullscreen) {
				document.body.requestFullscreen();
			}
		});
	}

	static InitSocketIO() {
		var socket = io();

		var context = this;

		socket.on("uploader", function(id, status) {
			if (status == "connected") {
				context.addStream(id);
			} else if (status == "disconnected") {
				context.removeStream(id);
			}
		});

		socket.on("timeline", function(id, value) {
			context.updateTimeline();
		});

		socket.on("disconnected", function() {
			var list = context.streams.children;

			for (let i = 0; i < list.length; i++) {
				context.removeStream(list[i].id);
			}
		});

		this.socket = socket;
	}

	static addStream(id) {
		var container = document.createElement("container");
		var stream = document.createElement("img");
		var bar = document.createElement("bar");

		stream.id = id;

		var context = this;

		var fun = async function() {
			stream.onerror = null;

			stream.src = "";

			await new Promise(function(resolve, reject) {
				setTimeout(function() {
					resolve();
				}, 1000);
			});

			stream.onerror = fun;

			stream.src = context.baseStreamUrl + id;
		};

		stream.onerror = fun;

		stream.onload = function() {
			stream.onload = null;

			stream.style.display = "flex";
		};

		stream.src = this.baseStreamUrl + id;

		container.append(stream);
		container.append(bar);

		this.addItems(bar, id);

		stream.addEventListener("click", function() {
			if (context.right.style.display == "flex") {
				return context.right.style.display = "none";
			}

			context.right.style.display = "flex";
		});

		this.streams.append(container);

		this.fitStreams();
	}

	static fitStreams() {
		var list = this.streams.children;
		
		if (list.length == 0) {return;}

		var k = Math.sqrt(list.length);

		if (k - Math.floor(k) > 0) {
			k += 1;
		}

		k = Math.floor(k);

		var a = k;
		var b = k;
		var c = a * b;

		if (list.length == 3) {
			a = 1;
			b = 3;
		}

		while (c - list.length >= k) {
			if (this.streams.offsetWidth >= this.streams.offsetHeight) {
				a -= 1;
			} else {
				b -= 1;
			}

			c = a * b;
		}

		for (let i = 0; i < list.length; i++) {
			list[i].style.maxHeight = 100 / a + "%";
			list[i].style.maxWidth = 100 / b + "%";
		}
	}

	static removeStream(id) {
		var stream = this.streams.querySelector("#" + id);

		stream.onerror = null;

		stream.src = "";

		stream.parentElement.remove();

		stream.remove();

		this.fitStreams();
	}

	static addItems(parent, id) {
		var fps = this.addItem(parent, "FPS", 0);

		this.socket.on("fps", function(_id, value) {
			if (id != _id) {return;}

			fps.value.textContent = value;
		});

		var motion = this.addItem(parent, "Motion", "0%");

		this.socket.on("motion", function(_id, percent) {
			if (id != _id) {return;}

			motion.value.textContent = percent.toFixed(2) + "%";

			if (motion.timeout) {
				clearTimeout(motion.timeout);

				motion.timeout = null;
			}

			motion.timeout = setTimeout(function() {
				motion.value.textContent = "0%";
			}, 1000/4);
		});
	}

	static addItem(parent, _title, _value) {
		var item = document.createElement("item");
		var title = document.createElement("title");
		var value = document.createElement("value");

		title.textContent = _title;
		value.textContent = _value;

		item.title = title;
		item.value = value;

		item.append(title);
		item.append(value);

		parent.append(item);

		return item;
	}

	static addMenu() {
		var context = this;
		
		var list = [
			{alias: "uploader", name: "Uploader", type: "select", default: 0, options: []},
			{alias: "framesize", name: "Resolution", type: "select", default: 11, options: ["96x96", "QQVGA(160x120)", "QCIF(176x144)", "HQVGA(240x176)", "240x240", "QVGA(320x240)", "CIF(400x296)", "HVGA(480x320)", "VGA(640x480)", "SVGA(800x600)", "XGA(1024x768)", "HD(1280x720)", "SXGA(1280x1024)", "UXGA(1600x1200)"]},
			{alias: "jpeg_quality", name: "Quality", type: "slider", default: 10, min: 10, max: 63},
			{alias: "brightness", name: "Brightness", type: "slider", default: 0, min: -2, max: 2},
			{alias: "contrast", name: "Contrast", type: "slider", default: 0, min: -2, max: 2},
			{alias: "saturation", name: "Saturation", type: "slider", default: 0, min: -2, max: 2},
			{alias: "special_effect", name: "Special Effect", type: "select", default: 0, options: ["No Effect", "Negative", "Grayscale", "Red Tint", "Green Tint", "Blue Tint", "Sepia"]},
			{alias: "whitebal", name: "Automatic White Balance", type: "switch", default: 1},
			{alias: "awb_gain", name: "Automatic While Balance Gain", type: "switch", default: 1},
			{alias: "wb_mode", name: "Automatic White Balance Mode", type: "select", default: 0, options: ["Auto", "Sunny", "Cloudy", "Office", "Home"]},
			{alias: "exposure_ctrl", name: "Automatic Exposure Control", type: "switch", default: 1},
			{alias: "aec2", name: "Automatic Exposure Control Digital Signal Processing", type: "switch", default: 0},
			{alias: "ae_level", name: "Automatic Exposure Control Level", type: "slider", default: 0, min: -2, max: 2},
			{alias: "aec_value", name: "Automatic Exposure Control Value", type: "slider", default: 0, min: 0, max: 1200},
			{alias: "gain_ctrl", name: "Gain Control", type: "switch", default: 1},
			{alias: "agc_gain", name: "Automatic Gain Control Gain", type: "slider", default: 0, min: 0, max: 30},
			{alias: "gainceiling", name: "Gain Ceiling", type: "slider", default: 0, min: 0, max: 6},
			{alias: "bpc", name: "Black Point Correction", type: "switch", default: 0},
			{alias: "wpc", name: "White Point Correction", type: "switch", default: 1},
			{alias: "raw_gma", name: "Raw Gamma", type: "switch", default: 1},
			{alias: "lenc", name: "Lenses Correction", type: "switch", default: 1},
			{alias: "hmirror", name: "Horizontal Flip", type: "switch", default: 0},
			{alias: "vflip", name: "Vertical Flip", type: "switch", default: 0},
			{alias: "dcw", name: "DCW", type: "switch", default: 1},
			{alias: "colorbar", name: "Color Bar", type: "switch", default: 0},
			{alias: "rotation", name: "Rotation", type: "select", default: 3, options: ["-270°", "-180°", "-90°", "0°", "90°", "180°", "270°"], fun: function(value) {
				var rotation = [-270, -180, -90, 0, 90, 180, 270][value];

				var fun = function() {
					if ([270, 90].includes(Math.abs(rotation))) {
						var h = context.stream.offsetHeight;
						var w = context.stream.offsetWidth;

						var scale = Math.min(h, w) / Math.max(h,w);

						context.stream.style.transform = "RotateZ(" + rotation + "deg) Scale(" + scale + ")";
					} else {
						context.stream.style.transform = "RotateZ(" + rotation + "deg)";
					}
				}

				fun();

				context.stream.addEventListener("load", fun);
			}},
			{alias: "led", name: "Led", type: "switch", default: 0},
			{alias: "flash", name: "Flash", type: "switch", default: 0}
		];

		this.socket.on("config", function(id, config) {
			for (let i = 0; i < list.length; i++) {
				let current = list[i];

				if (config[current.alias]) {

					if (list[i].type == "select") {
						current.item.v.textContent = config[current.alias] + 1;
					} else {
						current.item.v.textContent = config[current.alias];
					}

					if (list[i].type == "switch") {
						current.item.v.textContent = ["OFF", "ON"][config[current.alias]];
					}

					current.item.i.value = config[current.alias];

					if (current.fun) {
						current.fun(config[current.alias]);
					}
				}
			}
		});

		for (let i = 0; i < list.length; i++) {
			let item = document.createElement("item");
			let title = document.createElement("title");

			title.textContent = list[i].name;

			item.append(title);

			if (list[i].type == "switch") {
				let input = document.createElement("input");
				let value = document.createElement("value");

				input.type = "range";

				input.value = list[i].default;

				input.classList.add("switch");

				input.min = 0;
				input.max = 1;

				value.textContent = ["OFF", "ON"][input.value];
				
				input.addEventListener("input", function(event) {
					value.textContent = ["OFF", "ON"][input.value];

					context.sendCommand(list[i], input.value);
				});

				item.append(value);
				item.append(input);

				item.v = value;
				item.i = input;

				list[i].item = item;
			} else if (list[i].type == "slider") {
				let input = document.createElement("input");
				let min = document.createElement("value");
				let max = document.createElement("value");
				let value = document.createElement("value");
				
				min.textContent = list[i].min;

				input.type = "range";
				input.min = list[i].min;
				input.max = list[i].max;

				input.value = list[i].default;

				max.textContent = list[i].max;

				value.textContent = input.value;

				if (list[i].step) {
					input.step = list[i].step;
				}

				input.addEventListener("input", function(event) {
					value.textContent = input.value;

					context.sendCommand(list[i], input.value);
				});

				item.append(value);
				item.append(min);
				item.append(input);
				item.append(max);

				item.v = value;
				item.i = input;

				list[i].item = item;
			} else if (list[i].type == "select") {
				let input = document.createElement("select");
				let value = document.createElement("value");

				for (let o = 0; o < list[i].options.length; o++) {
					var option = document.createElement("option");

					option.textContent = list[i].options[o];

					option.value = o;

					input.append(option);
				}

				input.value = list[i].default;

				value.textContent = parseInt(input.value) + 1;

				input.addEventListener("input", function(event) {
					value.textContent = parseInt(input.value) + 1;

					context.sendCommand(list[i], input.value);
				});

				item.append(value);
				item.append(input);

				item.v = value;
				item.i = input;

				list[i].item = item;
			}

			this.right.append(item);
		}
	}

	static sendCommand(item, value) {
		if (item.fun) {
			item.fun(value);
		}

		console.log(item.alias, value);

		this.socket.emit("command", "", item.alias, value);
	}

	static formatNumber(n, l = 2) {
		n = n.toString();

		while (n.length < l) {
			n = "0" + n;
		}

		return n;
	}

	static formatSize(s) {
		var kb = 1024;
		var mb = kb * 1024;

		if (s > mb) {
			return (s / mb).toFixed(2) + "mb";
		}

		if (s > kb) {
			return (s / kb).toFixed(2) + "kb";
		}

		return s + "b";
	}

	static async updateTimeline() {
		var f = await fetch("/videos");

		var videos = await f.json();

		videos.sort(function(a, b) {
			return (b.start) - (a.start);
		});

		this.items.innerHTML = "";

		var context = this;

		for (let i = 0; i < videos.length; i++) {
			if (videos[i].duration == 999) {continue;}

			let item = document.createElement("item");
			let time = document.createElement("value");
			let duration = document.createElement("value");
			let size = document.createElement("value");
			let date = document.createElement("value");

			let d = new Date(videos[i].start);

			time.textContent = [this.formatNumber(d.getHours()), this.formatNumber(d.getMinutes()), this.formatNumber(d.getSeconds())].join(":");
			duration.textContent = videos[i].duration/1000 + "s";
			size.textContent = this.formatSize(videos[i].size);
			date.textContent = [this.formatNumber(d.getDate()), this.formatNumber(d.getMonth() + 1), this.formatNumber(d.getFullYear(), 4)].join("-");

			item.append(time);
			item.append(duration);
			item.append(size);
			item.append(date);

			item.addEventListener("click", function() {
				context.player.src = "/videos/" + videos[i].url;
			});

			this.items.append(item);
		}
	}
}

Main.Init();