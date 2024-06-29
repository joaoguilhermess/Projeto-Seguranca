class Main {
	static Init() {
		this.streamUrl = "/stream";

		this.loadStream();
	}

	static loadStream() {
		var img = document.querySelector("img");

		var context = this;

		var fun = async function() {
			console.log("error");

			img.onerror = null;

			img.src = "";

			await new Promise(function(resolve, reject) {
				setTimeout(function() {
					resolve();
				}, 1000);
			});

			img.onerror = fun;

			img.src = context.streamUrl;
		};

		img.onerror = fun;

		img.onload = function() {
			img.onload = null;

			img.style.display = "flex";
		};

		img.src = this.streamUrl;

		this.img = img;
	}
}

Main.Init();