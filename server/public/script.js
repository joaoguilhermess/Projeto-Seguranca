class Main {
	static Init() {
		this.streamUrl = "/stream";

		this.loadStream();
	}

	static loadStream() {
		var img = document.querySelector("img");

		img.onerror = function() {
			img.src = "";

			img.src = this.streamUrl;
		};

		img.onload = function() {
			img.style.display = "flex";
		};

		img.src = this.streamUrl;
	}
}

Main.Init();