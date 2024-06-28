import net from "net";

class Test {
	static Init() {
		var app = net.createServer(function(socket) {
			socket.on("readable", async function() {
				console.log(socket.read().toString("hex"));
			});
		});

		app.listen(3000, function() {
			console.log("Ready");
		});
	}
}

Test.Init();