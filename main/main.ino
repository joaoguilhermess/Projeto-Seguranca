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

#define LED_PIN 33
#define FLASH_PIN 4

#define SSID "Rede2"
#define PASSWORD "Nada2806"

// #define HOST "192.168.1.10"
#define HOST "192.168.1.3"
#define PORT 3000

#define CHUNK 1024

#define INTERVAL 1000/10

#define ID "85dcbb66a0cc4183b7698864f46f3bcf"

WiFiClient socket;
sensor_t* sensor;
String lastConfig = "";

void reset() {
	digitalWrite(LED_PIN, HIGH);
	digitalWrite(FLASH_PIN, LOW);
	lastConfig = "";
}

void connectWifi() {
	if (WiFi.status() == WL_CONNECTED) {return;}

	reset();

	// Serial.print("Trying to Connect on SSID: ");
	// Serial.print(SSID);
	// Serial.print(" With Password: ");
	// Serial.println(PASSWORD);

	WiFi.begin(SSID, PASSWORD);

	while (WiFi.status() != WL_CONNECTED) {
		// Serial.print(".");

		delay(INTERVAL);
	}

	// Serial.println();
	// Serial.println("Wifi Connected");
}

void restart() {
	// Serial.println("Restarting...");
	// Serial.println("");

	delay(INTERVAL);

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
	config.jpeg_quality = 10;
	config.fb_count = 2;

	esp_err_t e = esp_camera_init(&config);

	sensor = esp_camera_sensor_get();

	if (e != ESP_OK) {
		// Serial.print("Camera Error: 0x");
		// Serial.println(e);

		restart();
	}
}

void sendSize(size_t size) {
	String length = String(size);

	while(length.length() < 10) {
		length = "0" + length;
	}

	// Serial.print("length: ");
	// Serial.println(length);

	socket.print(length);
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

String getConfig() {
	String json = "{";

	json += "\"id\": \"";
	json += ID;
	json += "\",\"framesize\": ";
	json += String(sensor->status.framesize);
	json += ",\"quality\": ";
	json += String(sensor->status.quality);
	json += ",\"brightness\": ";
	json += String(sensor->status.brightness);
	json += ",\"contrast\": ";
	json += String(sensor->status.contrast);
	json += ",\"saturation\": ";
	json += String(sensor->status.saturation);
	json += ",\"special_effect\": ";
	json += String(sensor->status.special_effect);
	json += ",\"awb\": ";
	json += String(sensor->status.awb);
	json += ",\"awb_gain\": ";
	json += String(sensor->status.awb_gain);
	json += ",\"wb_mode\": ";
	json += String(sensor->status.wb_mode);
	json += ",\"aec\": ";
	json += String(sensor->status.aec);
	json += ",\"aec2\": ";
	json += String(sensor->status.aec2);
	json += ",\"ae_level\": ";
	json += String(sensor->status.ae_level);
	json += ",\"aec_value\": ";
	json += String(sensor->status.aec_value);
	json += ",\"agc\": ";
	json += String(sensor->status.agc);
	json += ",\"agc_gain\": ";
	json += String(sensor->status.agc_gain);
	json += ",\"gainceiling\": ";
	json += String(sensor->status.gainceiling);
	json += ",\"bpc\": ";
	json += String(sensor->status.bpc);
	json += ",\"wpc\": ";
	json += String(sensor->status.wpc);
	json += ",\"raw_gma\": ";
	json += String(sensor->status.raw_gma);
	json += ",\"lenc\": ";
	json += String(sensor->status.lenc);
	json += ",\"hmirror\": ";
	json += String(sensor->status.hmirror);
	json += ",\"vflip\": ";
	json += String(sensor->status.vflip);
	json += ",\"dcw\": ";
	json += String(sensor->status.dcw);
	json += ",\"colorbar\": ";
	json += String(sensor->status.colorbar);

	json += "}";

	return json;
}

void runCommand(String command, int value) {
	// Serial.print(command);
	// Serial.print(": ");
	// Serial.println(value);

	if (command == "framesize") {sensor->set_framesize(sensor, (framesize_t) value); return;}
	if (command == "quality") {sensor->set_quality(sensor, value); return;}
	if (command == "brightness") {sensor->set_brightness(sensor, value); return;}
	if (command == "contrast") {sensor->set_contrast(sensor, value); return;}
	if (command == "saturation") {sensor->set_saturation(sensor, value); return;}
	if (command == "special_effect") {sensor->set_special_effect(sensor, value); return;}
	if (command == "whitebal") {sensor->set_whitebal(sensor, value); return;}
	if (command == "awb_gain") {sensor->set_awb_gain(sensor, value); return;}
	if (command == "wb_mode") {sensor->set_wb_mode(sensor, value); return;}
	if (command == "exposure_ctrl") {sensor->set_exposure_ctrl(sensor, value); return;}
	if (command == "aec2") {sensor->set_aec2(sensor, value); return;}
	if (command == "ae_level") {sensor->set_ae_level(sensor, value); return;}
	if (command == "aec_value") {sensor->set_aec_value(sensor, value); return;}
	if (command == "gain_ctrl") {sensor->set_gain_ctrl(sensor, value); return;}
	if (command == "agc_gain") {sensor->set_agc_gain(sensor, value); return;}
	if (command == "gainceiling") {sensor->set_gainceiling(sensor, (gainceiling_t) value); return;}
	if (command == "bpc") {sensor->set_bpc(sensor, value); return;}
	if (command == "wpc") {sensor->set_wpc(sensor, value); return;}
	if (command == "raw_gma") {sensor->set_raw_gma(sensor, value); return;}
	if (command == "lenc") {sensor->set_lenc(sensor, value); return;}
	if (command == "hmirror") {sensor->set_hmirror(sensor, value); return;}
	if (command == "vflip") {sensor->set_vflip(sensor, value); return;}
	if (command == "dcw") {sensor->set_dcw(sensor, value); return;}
	if (command == "colorbar") {sensor->set_colorbar(sensor, value); return;}

	if (command == "led") {
		if (value == 0) {
			digitalWrite(LED_PIN, HIGH);
		} else {
			digitalWrite(LED_PIN, LOW);
		}
	}
	
	if (command == "flash") {
		if (value == 0) {
			digitalWrite(FLASH_PIN, LOW);
		} else {
			digitalWrite(FLASH_PIN, HIGH);
		}
	}
}

void clearFrame(camera_fb_t* buffer) {
	esp_camera_fb_return(buffer);
}

void connectSocket() {
	if (socket.connected()) {return;}

	reset();

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

		delay(INTERVAL);
	}

	// Serial.println();
	// Serial.println("Socket Connected");

	socket.print("POST /stream HTTP/1.1");
	socket.print("\r\n");
	socket.print("Host: ");
	socket.print(HOST);
	socket.print("\r\n");
	socket.print("Upgrade: uploader");
	socket.print("\r\n");
	socket.print("Connection: Upgrade");
	socket.print("\r\n\r\n");

	socket.readStringUntil('\n');
}

void setup() {
	// Serial.begin(115200);

	pinMode(LED_PIN, OUTPUT);
	pinMode(FLASH_PIN, OUTPUT);

	initCamera();
}

void loop() {
	connectWifi();

	connectSocket();

	while (socket.available()) {
		// Serial.print("Available: ");
		// Serial.println(socket.available());

		runCommand(socket.readStringUntil('\n'), socket.readStringUntil('\n').toInt());
	}

	String json = getConfig();

	if (lastConfig != json) {
		socket.print("c");

		sendSize(json.length());

		socket.print(json);

		lastConfig = json;
	}

	socket.print("f");

	camera_fb_t* frame = getFrame();

	size_t size = frame->len;

	sendSize(size);

	for (size_t i = 0; i < size; i += CHUNK) {
		if (i + CHUNK < size) {
			socket.write(frame->buf + i, CHUNK);
		} else if (size - i > 0) {
			socket.write(frame->buf + i, size - i);
		}
	}

	clearFrame(frame);
}