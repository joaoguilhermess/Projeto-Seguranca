#include <Arduino.h>
#include <WiFi.h>
#include "esp_camera.h"

#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22

#define SSID "Rede2"
#define PASSWORD "Nada2806"

#define HOST "192.168.1.10"
#define PORT 3000

#define CHUNK 1024

WiFiClient socket;

void connectWifi() {
	if (WiFi.status() == WL_CONNECTED) {return;}

	// Serial.print("Trying to Connect on SSID: ");
	// Serial.print(SSID);
	// Serial.print(" With Password: ");
	// Serial.println(PASSWORD);

	WiFi.begin(SSID, PASSWORD);

	while (WiFi.status() != WL_CONNECTED) {
		// Serial.print(".");

		delay(1000);
	}

	// Serial.println();
	// Serial.println("Wifi Connected");
}

void restart() {
	// Serial.println("Restarting...");
	// Serial.println("");

	delay(1000);

	ESP.restart();
}

void initCamera() {
	camera_config_t config;

	config.ledc_channel = LEDC_CHANNEL_0;
	config.ledc_timer = LEDC_TIMER_0;
	config.pin_d0 = Y2_GPIO_NUM;
	config.pin_d1 = Y3_GPIO_NUM;
	config.pin_d2 = Y4_GPIO_NUM;
	config.pin_d3 = Y5_GPIO_NUM;
	config.pin_d4 = Y6_GPIO_NUM;
	config.pin_d5 = Y7_GPIO_NUM;
	config.pin_d6 = Y8_GPIO_NUM;
	config.pin_d7 = Y9_GPIO_NUM;
	config.pin_xclk = XCLK_GPIO_NUM;
	config.pin_pclk = PCLK_GPIO_NUM;
	config.pin_vsync = VSYNC_GPIO_NUM;
	config.pin_href = HREF_GPIO_NUM;
	config.pin_sscb_sda = SIOD_GPIO_NUM;
	config.pin_sscb_scl = SIOC_GPIO_NUM;
	config.pin_pwdn = PWDN_GPIO_NUM;
	config.pin_reset = RESET_GPIO_NUM;
	config.xclk_freq_hz = 20000000;
	config.frame_size = FRAMESIZE_HD;
	config.pixel_format = PIXFORMAT_JPEG;
	config.grab_mode = CAMERA_GRAB_LATEST;
	config.fb_location = CAMERA_FB_IN_PSRAM;
	config.jpeg_quality = 20;
	config.fb_count = 1;

	esp_err_t e = esp_camera_init(&config);

	if (e != ESP_OK) {
		// Serial.print("Camera Error: 0x");
		// Serial.println(e);

		restart();
	}
}

camera_fb_t* getFrame() {
	camera_fb_t* buffer = esp_camera_fb_get();

	if (buffer) {
		return buffer;
	} else {
		// Serial.println("getFrame Falied");

		restart();
	}
}

void clearFrame(camera_fb_t* buffer) {
	esp_camera_fb_return(buffer);
}

void connectSocket() {
	if (socket.connected()) {return;}

	// Serial.print("Trying to Connect on Server: ");
	// Serial.print(HOST);
	// Serial.print(":");
	// Serial.println(PORT);

	while (!socket.connected()) {
		if (WiFi.status() != WL_CONNECTED) {
			connectWifi();
		}

		socket.connect(HOST, PORT);

		// Serial.print(".");

		delay(1000);
	}

	// Serial.println();
	// Serial.println("Socket Connected");

	socket.print("POST /stream HTTP/1.1");
	socket.print("\r\n");
	socket.print("Host: ");
	socket.print(HOST);
	socket.print("\r\n");
	socket.print("Connection: close");
	socket.print("\r\n\r\n");

	socket.readStringUntil('\r');
}

void setup() {
	// Serial.begin(115200);

	initCamera();
}

void loop() {
	connectWifi();

	connectSocket();

	camera_fb_t* frame = getFrame();

	size_t size = frame->len;

	String length = String(size);

	while (length.length() < 10) {
		length = "0" + length;
	}

	// Serial.print("length: ");
	// Serial.println(length);

	socket.print(length);

	for (size_t i = 0; i < size; i += CHUNK) {
		if (i + CHUNK < size) {
			socket.write(frame->buf + i, CHUNK);
		} else if (size - i > 0) {
			socket.write(frame->buf + i, size - i);
		}
	}

	clearFrame(frame);
}