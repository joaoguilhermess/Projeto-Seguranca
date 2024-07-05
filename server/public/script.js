class Main {
	static Init() {
		this.main = document.body.querySelector("main");
		this.stream = this.main.querySelector("img");
		this.bar = this.main.querySelector("bar");
		this.right = document.body.querySelector("right");

		this.streamUrl = "/stream";

		this.addOnload();

		this.addFullscreen();

		this.InitSocketIO();

		this.addItems();

		this.startStream();

		this.addMenu();
	}

	static addOnload() {
		window.addEventListener("load", function() {
			document.body.style.display = "flex";
		});
	}

	static addFullscreen() {
		window.addEventListener("click", function() {
			if (!document.fullscreen) {
				document.body.requestFullscreen();
			}
		});
	}

	static InitSocketIO() {
		var socket = io();

		var context = this;

		socket.on("uploader", function(status) {
			if (status == "connected") {
				context.startStream();
			} else if (status == "disconnected") {
				context.stopStream();
			}
		});

		this.socket = socket;
	}

	static startStream() {
		var context = this;

		var fun = async function() {
			context.stream.onerror = null;

			context.stream.src = "";

			await new Promise(function(resolve, reject) {
				setTimeout(function() {
					resolve();
				}, 1000);
			});

			context.stream.onerror = fun;

			context.stream.src = context.streamUrl;
		};

		this.stream.onerror = fun;

		this.stream.onload = function() {
			context.stream.onload = null;

			context.stream.style.display = "flex";
		};

		this.stream.src = this.streamUrl;
	}

	static stopStream() {
		this.stream.src = "";
	}

	static addItems() {
		var fps = this.addItem("FPS", 0);

		this.socket.on("fps", function(value) {
			fps.value.textContent = value;
		});

		var motion = this.addItem("Motion", "0%");

		this.socket.on("motion", function(percent) {
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

	static addItem(_title, _value) {
		var item = document.createElement("item");
		var title = document.createElement("title");
		var value = document.createElement("value");

		title.textContent = _title;
		value.textContent = _value;

		item.title = title;
		item.value = value;

		item.append(title);
		item.append(value);

		this.bar.append(item);

		return item;
	}

	static addMenu() {
		var context = this;
		
		var list = [
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

		this.socket.on("config", function(config) {
			console.log(config);
			
			for (let i = 0; i < list.length; i++) {
				let current = list[i];

				if (config[current.alias]) {

					current.item.v.textContent = config[current.alias];

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

				value.textContent = input.value;

				input.addEventListener("input", function(event) {
					value.textContent = input.value;

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

		this.socket.emit("command", item.alias, value);
	}
}

Main.Init();