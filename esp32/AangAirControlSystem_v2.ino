/*
 * AANG AIR CONTROL SYSTEM v2.4
 * ESP32 IoT Air Purifier + LG AC IR Control + Firebase Integration
 * + Robot Remote Control via Firebase STREAM (INSTANT Response!)
 * 
 * Sensors:
 * - DHT22 (Temperature & Humidity)
 * - MQ-135 (CO2/Gas Detection - approximated to ppm)
 * - GP2Y1014AU (Dust/PM2.5 Sensor)
 * 
 * Actuators:
 * - Relay Fan (Active LOW)
 * - Relay Ionizer (Active HIGH)
 * - IR Transmitter for LG AC
 * - L298N Motor Driver (Robot Movement)
 * - Servo Motor (Camera Pan)
 * 
 * Communication: Firebase Realtime Database (Cloud Control)
 * 
 * Thresholds:
 * - PM2.5: >35 µg/m³ = Bahaya (activate Fan)
 * - CO2: >606 ppm = Bahaya (activate Fan + Ionizer)
 */

#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <DHT.h>
#include <time.h>

// IR Remote Library
#define DECODE_LG
#define DECODE_DISTANCE_WIDTH
#define DECODE_HASH
#define RAW_BUFFER_LENGTH 750
#define RECORD_GAP_MICROS 12000
#include <IRremote.hpp>

// ================= FIREBASE CONFIG =================
#define FIREBASE_HOST ""
#define FIREBASE_AUTH ""

// ================= WIFI CONFIG =================
#define WIFI_SSID ""
#define WIFI_PASSWORD ""

// ================= PIN DEFINITIONS =================
// Sensors
#define MQ135_PIN       32
#define DUST_ANALOG_PIN 34
#define DUST_LED_PIN    17
#define DHT_PIN         4
#define DHT_TYPE        DHT22

// Actuators - Air Purifier
#define RELAY_FAN       21   // ACTIVE LOW
#define RELAY_IONIZER   22   // ACTIVE HIGH

// IR
#define IR_SEND_PIN     5
#define IR_RECEIVE_PIN  15

// Motor L298N (Robot)
#define ENA 12
#define ENB 13
#define IN1 14
#define IN2 27
#define IN3 33
#define IN4 26

// Servo (Camera Pan)
#define SERVO_PIN 25

// ================= PWM CHANNELS =================
#define CH_ENA    0
#define CH_ENB    1
#define CH_SERVO  2

// ================= PWM CONFIG =================
const int motorFreq = 1000;
const int motorResolution = 8;
const int motorSpeed = 120;

const int servoFreq = 50;
const int servoResolution = 12;
const uint32_t dutyMin = 102;   // ~0.5ms
const uint32_t dutyMax = 512;   // ~2.5ms

// ================= DUST SENSOR TIMING =================
#define SAMPLING_TIME   280
#define DELTA_TIME      40
#define SLEEP_TIME      9680

// ================= TIMING CONFIG =================
#define SEND_INTERVAL           5000   // Send data every 5 seconds
#define COMMAND_CHECK_INTERVAL  200    // Check commands every 200ms
#define ROBOT_CHECK_INTERVAL    50     // Check robot commands every 50ms for fast response
#define NTP_SERVER "pool.ntp.org"
#define GMT_OFFSET_SEC 25200           // GMT+7 Indonesia
#define DAYLIGHT_OFFSET_SEC 0

// ================= OBJECTS =================
FirebaseData fbdo;
FirebaseData fbdoStream;  // Stream for robot commands (real-time)
FirebaseAuth auth;
FirebaseConfig config;
DHT dht(DHT_PIN, DHT_TYPE);

// Stream callback flag
volatile bool robotDataChanged = false;

// ================= STATE VARIABLES =================
struct SensorData {
  float temperature;
  float humidity;
  float gasLevel;      // MQ135 in ppm approximation
  float pm25;          // PM2.5 in mg/m³
  int mq135Raw;        // Raw ADC value
  String timestamp;
};

struct DeviceState {
  bool fanOn;
  bool ionizerOn;
  bool acOn;
  int acTemp;
  bool jetCool;
};

struct RobotState {
  bool active;
  String command;
  int servoAngle;
  String servoCommand;
  unsigned long lastCommandTime;
};

SensorData sensors;
DeviceState devices = {false, false, true, 24, false};
DeviceState lastDevices = {false, false, true, 24, false};
RobotState robot = {false, "stop", 90, "stop", 0};
RobotState lastRobot = {false, "stop", 90, "stop", 0};

unsigned long lastSendTime = 0;
unsigned long lastCommandCheckTime = 0;
unsigned long lastRobotCheckTime = 0;
String deviceId = "AANG_NODE_01";
bool firebaseReady = false;
int currentServoAngle = 90;

// ================= IR RAW DATA FOR LG AC =================
uint16_t lgOnRaw[] = {3400,9950,500,1600,500,550,500,550,500,500,550,1550,500,550,500,550,500,550,500,550,500,550,500,500,550,500,550,500,550,500,500,550,500,550,500,550,500,1550,500,550,500,550,500,550,500,1550,550,500,550,500,500,1600,500,550,500,550,500,550,550};
uint16_t lgOffRaw[] = {3200,9950,500,1550,550,500,550,500,500,550,500,1600,500,550,500,550,500,500,550,1550,550,1550,500,550,500,500,550,500,550,500,500,550,500,550,500,550,500,550,500,500,550,500,550,500,500,1600,500,550,500,1550,550,500,550,500,500,550,500,1600,500};
uint16_t lg16Raw[] = {3400,9950,500,1600,550,500,500,550,500,550,500,1550,550,500,500,550,500,550,500,500,550,500,550,500,500,550,500,1600,500,550,500,550,500,500,550,500,550,500,500,550,500,1600,500,500,550,1550,500,550,500,550,500,1600,500,1600,500,500,550,1550,500};
uint16_t lg17Raw[] = {3350,9950,550,1600,500,550,450,550,500,550,500,1600,500,550,450,600,500,500,550,500,500,550,500,550,450,600,500,1550,500,550,500,550,500,550,500,550,450,600,450,1600,500,550,500,550,500,1550,550,500,550,500,500,1600,500,1600,500,1550,550,500,500};
uint16_t lg18Raw[] = {3350,9950,500,1550,550,550,450,600,500,500,500,1600,500,550,500,550,500,550,450,600,450,600,450,600,450,600,500,1550,500,550,500,550,500,550,500,550,450,600,500,1550,500,1600,500,550,500,1600,500,550,500,500,500,1600,500,1600,500,1550,500,1600,500};
uint16_t lg19Raw[] = {3400,9950,550,1550,500,550,500,550,500,550,500,1550,550,500,550,500,550,500,550,500,500,550,500,550,500,550,500,1550,500,550,500,500,550,550,500,550,500,1600,500,550,500,550,500,500,550,1550,550,500,550,500,500,550,500,550,500,500,550,500,550};
uint16_t lg20Raw[] = {3400,9950,500,1550,550,500,550,500,550,500,500,1600,500,550,500,550,500,500,550,500,550,500,550,500,550,500,1550,500,550,500,550,500,550,500,500,550,1550,500,550,500,1600,500,500,550,1550,500,550,550,500,500,550,500,500,550,500,550,1550,500};
uint16_t lg21Raw[] = {3400,9900,500,1550,550,500,550,500,550,500,500,1600,500,550,500,550,500,500,550,500,550,500,550,500,550,500,1550,500,550,500,550,500,550,500,500,550,1550,500,550,500,1600,500,500,550,1550,500,550,550,500,500,550,500,500,550,500,550,1550,500};
uint16_t lg22Raw[] = {3400,9900,550,1550,550,500,550,500,550,500,500,1600,500,550,500,550,500,500,550,500,550,550,500,500,550,500,550,1550,500,550,500,550,500,550,500,500,550,1550,500,1600,500,1550,550,500,550,1550,500,550,500,550,500,500,550,500,550,1550,500,1600,500};
uint16_t lg23Raw[] = {3400,9950,500,1600,500,550,500,500,550,500,550,1550,550,500,500,550,500,550,500,550,500,550,500,550,500,550,500,1550,550,500,550,500,500,550,500,1550,550,500,550,500,500,550,500,550,500,1600,500,550,500,500,550,500,550,1550,500,550,500,550,500};
uint16_t lg24Raw[] = {3400,9900,500,1600,500,550,500,550,500,550,450,1650,450,550,500,550,500,550,500,550,450,600,450,550,500,550,500,1600,500,550,450,600,500,550,450,1600,500,550,500,550,500,1600,500,500,500,1600,500,550,500,550,500,550,500,1600,500,550,500,1550,500};
uint16_t lg25Raw[] = {3400,9900,500,1600,500,550,500,500,550,500,500,1600,500,550,500,550,500,500,550,500,550,500,500,550,500,550,500,1550,550,500,500,550,500,550,500,1600,500,550,500,1550,550,500,500,550,500,1550,550,500,550,500,550,500,550,1550,500,1600,500,550,500};
uint16_t lgJetOnRaw[] = {3250,9950,500,1550,550,500,550,500,550,500,500,1600,500,550,500,500,550,500,550,500,550,500,500,550,500,1600,500,500,550,500,550,500,550,500,550,500,500,550,500,550,500,500,550,1550,500,550,500,550,500,500,550,1550,500,550,500,550,500,1600,500};
uint16_t lgJetOffRaw[] = {3400,9950,500,1550,550,500,550,500,550,500,500,1600,500,550,500,500,550,500,550,500,550,500,500,550,500,550,500,1550,550,500,500,550,550,500,500,550,500,550,500,1550,550,1550,500,550,550,1500,550,500,550,500,550,1550,500,1600,550,1500,550,1550,550};

// ================= FUNCTION PROTOTYPES =================
void connectWiFi();
void initFirebase();
void initTime();
void readSensors();
void sendSensorData();
void checkDeviceCommands();
void processRobotData();
void executeDeviceControl();
void executeRobotControl();
void sendIRCommand(int temp);
String getTimestamp();
float readDustSensor();
float readGasSensor();
void handleSerialCommand(String cmd);
void streamCallback(FirebaseStream data);
void streamTimeoutCallback(bool timeout);

// ================= MOTOR FUNCTIONS =================
void setServoAngle(int angle) {
  angle = constrain(angle, 0, 180);  // Full range 0-180 degrees
  currentServoAngle = angle;
  uint32_t duty = map(angle, 0, 180, dutyMin, dutyMax);
  ledcWrite(CH_SERVO, duty);
}

void motorEnable() {
  ledcWrite(CH_ENA, motorSpeed);
  ledcWrite(CH_ENB, motorSpeed);
}

void maju() {
  motorEnable();
  digitalWrite(IN1, LOW);  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
}

void mundur() {
  motorEnable();
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);  digitalWrite(IN4, HIGH);
}

void kiri() {
  motorEnable();
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
}

void kanan() {
  motorEnable();
  digitalWrite(IN1, LOW);  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);  digitalWrite(IN4, HIGH);
}

void berhenti() {
  ledcWrite(CH_ENA, 0);
  ledcWrite(CH_ENB, 0);
  digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  delay(1500);

  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║   AANG AIR CONTROL SYSTEM v2.1         ║");
  Serial.println("║   IoT Air Purifier + Robot Control     ║");
  Serial.println("║   Firebase Cloud Control (No IP)       ║");
  Serial.println("╚════════════════════════════════════════╝\n");

  // Initialize ADC
  analogReadResolution(12);

  // Initialize Relay Pins
  pinMode(RELAY_FAN, OUTPUT);
  pinMode(RELAY_IONIZER, OUTPUT);
  digitalWrite(RELAY_FAN, HIGH);      // OFF (Active LOW)
  digitalWrite(RELAY_IONIZER, LOW);   // OFF (Active HIGH)

  // Initialize Dust Sensor LED
  pinMode(DUST_LED_PIN, OUTPUT);
  digitalWrite(DUST_LED_PIN, HIGH);

  // Initialize DHT
  dht.begin();

  // Initialize IR
  IrSender.begin(IR_SEND_PIN);
  IrReceiver.begin(IR_RECEIVE_PIN, DISABLE_LED_FEEDBACK);

  // Initialize Motor Pins
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);

  // Initialize PWM for Motors
  ledcSetup(CH_ENA, motorFreq, motorResolution);
  ledcSetup(CH_ENB, motorFreq, motorResolution);
  ledcAttachPin(ENA, CH_ENA);
  ledcAttachPin(ENB, CH_ENB);

  // Initialize PWM for Servo
  ledcSetup(CH_SERVO, servoFreq, servoResolution);
  ledcAttachPin(SERVO_PIN, CH_SERVO);

  // Set initial positions
  setServoAngle(90);
  berhenti();

  // Connect WiFi
  connectWiFi();

  // Initialize Time
  initTime();

  // Initialize Firebase
  initFirebase();

  // Send initial status
  sendSensorData();

  Serial.println("\n[READY] System initialized successfully!");
  Serial.println("[INFO] Air Purifier + Robot Control Active");
  Serial.println("[INFO] Control via Firebase - No IP Required!\n");
}

// ================= MAIN LOOP =================
void loop() {
  // Check WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Reconnecting...");
    berhenti();  // Stop robot if WiFi disconnects
    connectWiFi();
  }

  // Process robot data immediately when stream callback fires (INSTANT!)
  if (robotDataChanged) {
    robotDataChanged = false;
    executeRobotControl();
  }

  // Check device commands at interval (every 200ms)
  if (millis() - lastCommandCheckTime >= COMMAND_CHECK_INTERVAL) {
    lastCommandCheckTime = millis();
    checkDeviceCommands();
  }

  // Read sensors and send data at interval (every 5 seconds)
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = millis();
    readSensors();
    sendSensorData();
  }

  // Handle Serial commands for debugging
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    cmd.toLowerCase();
    handleSerialCommand(cmd);
  }
}

// ================= WIFI CONNECTION =================
void connectWiFi() {
  Serial.print("[WIFI] Connecting to ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Connected!");
    Serial.print("[WIFI] IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WIFI] Failed! Restarting...");
    ESP.restart();
  }
}

// ================= FIREBASE INITIALIZATION =================
void initFirebase() {
  Serial.println("[FIREBASE] Initializing...");

  config.database_url = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  fbdo.setResponseSize(4096);

  int attempts = 0;
  while (!Firebase.ready() && attempts < 10) {
    Serial.print(".");
    delay(500);
    attempts++;
  }

  if (Firebase.ready()) {
    firebaseReady = true;
    Serial.println("\n[FIREBASE] Connected!");
    
    // Initialize device control defaults
    FirebaseJson controlJson;
    controlJson.set("fan", false);
    controlJson.set("ionizer", false);
    controlJson.set("ac/on", true);
    controlJson.set("ac/temp", 24);
    controlJson.set("ac/jetCool", false);
    Firebase.RTDB.setJSON(&fbdo, "device_control", &controlJson);

    // Initialize robot control defaults
    FirebaseJson robotJson;
    robotJson.set("active", false);
    robotJson.set("command", "stop");
    robotJson.set("servoAngle", 90);
    robotJson.set("servoCommand", "stop");
    robotJson.set("timestamp", 0);
    Firebase.RTDB.setJSON(&fbdo, "robot_control", &robotJson);

    // START REAL-TIME STREAM for robot control (INSTANT response!)
    if (!Firebase.RTDB.beginStream(&fbdoStream, "robot_control")) {
      Serial.printf("[STREAM] Error: %s\n", fbdoStream.errorReason().c_str());
    } else {
      Serial.println("[STREAM] Robot control stream started!");
      Firebase.RTDB.setStreamCallback(&fbdoStream, streamCallback, streamTimeoutCallback);
    }
    
  } else {
    Serial.println("\n[FIREBASE] Connection failed!");
  }
}

// ================= STREAM CALLBACK (INSTANT!) =================
void streamCallback(FirebaseStream data) {
  if (data.dataType() == "json") {
    FirebaseJson &json = data.jsonObject();
    FirebaseJsonData result;
    
    if (json.get(result, "active")) robot.active = result.boolValue;
    if (json.get(result, "command")) robot.command = result.stringValue;
    if (json.get(result, "servoAngle")) robot.servoAngle = result.intValue;
    if (json.get(result, "servoCommand")) robot.servoCommand = result.stringValue;
    
    robotDataChanged = true;
    Serial.printf("[STREAM] cmd=%s servo=%d\n", robot.command.c_str(), robot.servoAngle);
  } 
  else if (data.dataType() == "boolean" || data.dataType() == "int" || data.dataType() == "string") {
    String path = data.dataPath();
    if (path == "/active") robot.active = data.boolData();
    else if (path == "/command") robot.command = data.stringData();
    else if (path == "/servoAngle") robot.servoAngle = data.intData();
    else if (path == "/servoCommand") robot.servoCommand = data.stringData();
    
    robotDataChanged = true;
  }
}

void streamTimeoutCallback(bool timeout) {
  if (timeout) {
    Serial.println("[STREAM] Timeout, reconnecting...");
  }
  if (!fbdoStream.httpConnected()) {
    Serial.printf("[STREAM] Error: %s\n", fbdoStream.errorReason().c_str());
  }
}

// ================= TIME INITIALIZATION =================
void initTime() {
  Serial.println("[TIME] Syncing NTP...");
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);

  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    Serial.printf("[TIME] %04d-%02d-%02d %02d:%02d:%02d\n",
      timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday,
      timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
  }
}

// ================= GET TIMESTAMP =================
String getTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "1970-01-01 00:00:00";
  }
  char buffer[25];
  sprintf(buffer, "%04d-%02d-%02d %02d:%02d:%02d",
    timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday,
    timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
  return String(buffer);
}

// ================= READ DUST SENSOR (GP2Y1014AU) =================
float readDustSensor() {
  digitalWrite(DUST_LED_PIN, LOW);
  delayMicroseconds(SAMPLING_TIME);
  
  int dustADC = analogRead(DUST_ANALOG_PIN);
  
  delayMicroseconds(DELTA_TIME);
  digitalWrite(DUST_LED_PIN, HIGH);
  delayMicroseconds(SLEEP_TIME);

  float dustVolt = dustADC * (3.3 / 4095.0);
  float dustDensity = (0.17 * dustVolt - 0.1);
  
  if (dustDensity < 0) dustDensity = 0;
  if (dustDensity > 0.5) dustDensity = 0.5;

  return dustDensity;
}

// ================= READ GAS SENSOR (MQ-135 - CO2 Approximation) =================
// MQ-135 measures multiple gases, here we approximate CO2 in ppm
// Typical indoor CO2: 400-1000 ppm (normal), >1000 ppm (poor ventilation)
// Fuzzy threshold is 606 ppm for "bahaya"
float readGasSensor() {
  int rawValue = analogRead(MQ135_PIN);
  sensors.mq135Raw = rawValue;
  
  // Convert ADC to voltage (ESP32 12-bit ADC, 3.3V reference)
  float voltage = rawValue * (3.3 / 4095.0);
  
  // MQ-135 CO2 approximation formula (REVISED for better sensitivity)
  // MQ-135 typical output: 0.1-1.0V in clean air, 1.0-2.5V when polluted
  // 
  // NEW Formula: More aggressive scaling to detect changes
  // - Base: 400 ppm (atmospheric baseline)
  // - Multiplier: 800 (was 300) for better sensitivity
  // - This gives: 400 ppm at 0V → 2600+ ppm at 3.3V
  // - Threshold 606 ppm will trigger at ~0.26V (easily reachable!)
  
  float ppm = (voltage * 800.0) + 400.0;
  
  // Clamp to reasonable indoor CO2 range
  if (ppm < 400) ppm = 400;   // Minimum outdoor CO2 level
  if (ppm > 3000) ppm = 3000; // Extended range for detection
  
  return ppm;
}

// ================= READ ALL SENSORS =================
void readSensors() {
  sensors.temperature = dht.readTemperature();
  sensors.humidity = dht.readHumidity();

  if (isnan(sensors.temperature)) sensors.temperature = 25.0;
  if (isnan(sensors.humidity)) sensors.humidity = 60.0;

  sensors.pm25 = readDustSensor();
  sensors.gasLevel = readGasSensor();
  sensors.timestamp = getTimestamp();

  Serial.println("\n╔═══════ SENSOR READING ═══════╗");
  Serial.printf("║ Temperature : %.1f °C        ║\n", sensors.temperature);
  Serial.printf("║ Humidity    : %.1f %%         ║\n", sensors.humidity);
  Serial.printf("║ PM2.5       : %.3f mg/m³     ║\n", sensors.pm25);
  Serial.printf("║ CO2 Level   : %.0f ppm       ║\n", sensors.gasLevel);
  Serial.printf("║ MQ135 Raw   : %d             ║\n", sensors.mq135Raw);
  Serial.println("╚══════════════════════════════╝");
}

// ================= SEND DATA TO FIREBASE =================
void sendSensorData() {
  if (!firebaseReady || !Firebase.ready()) {
    Serial.println("[FIREBASE] Not ready!");
    return;
  }

  float pm25_ugm3 = sensors.pm25 * 1000;
  if (pm25_ugm3 > 500) pm25_ugm3 = 500;

  FirebaseJson sensorJson;
  sensorJson.set("temperature", sensors.temperature);
  sensorJson.set("humidity", sensors.humidity);
  sensorJson.set("pm25", pm25_ugm3);
  sensorJson.set("pm25_raw", sensors.pm25);
  sensorJson.set("gasLevel", sensors.gasLevel);
  sensorJson.set("mq135Raw", sensors.mq135Raw);
  sensorJson.set("timestamp", sensors.timestamp);
  sensorJson.set("deviceId", deviceId);

  if (Firebase.RTDB.setJSON(&fbdo, "sensor_data/latest", &sensorJson)) {
    Serial.println("[FIREBASE] Sensor data sent!");
  } else {
    Serial.printf("[FIREBASE] Error: %s\n", fbdo.errorReason().c_str());
  }

  String historyPath = "sensor_data/history/" + String(millis());
  Firebase.RTDB.setJSON(&fbdo, historyPath.c_str(), &sensorJson);

  FirebaseJson statusJson;
  statusJson.set("online", true);
  statusJson.set("lastSeen", sensors.timestamp);
  statusJson.set("ip", WiFi.localIP().toString());
  statusJson.set("rssi", WiFi.RSSI());
  statusJson.set("deviceId", deviceId);
  statusJson.set("fanState", devices.fanOn);
  statusJson.set("ionizerState", devices.ionizerOn);
  statusJson.set("acState", devices.acOn);
  statusJson.set("acTemp", devices.acTemp);
  statusJson.set("robotActive", robot.active);
  statusJson.set("robotCommand", robot.command);
  statusJson.set("servoAngle", currentServoAngle);
  
  Firebase.RTDB.setJSON(&fbdo, "device_status/" + deviceId, &statusJson);
}

// ================= CHECK DEVICE COMMANDS =================
void checkDeviceCommands() {
  if (!firebaseReady || !Firebase.ready()) return;

  if (Firebase.RTDB.getBool(&fbdo, "device_control/fan")) {
    devices.fanOn = fbdo.boolData();
  }

  if (Firebase.RTDB.getBool(&fbdo, "device_control/ionizer")) {
    devices.ionizerOn = fbdo.boolData();
  }

  if (Firebase.RTDB.getBool(&fbdo, "device_control/ac/on")) {
    devices.acOn = fbdo.boolData();
  }
  if (Firebase.RTDB.getInt(&fbdo, "device_control/ac/temp")) {
    devices.acTemp = fbdo.intData();
  }
  if (Firebase.RTDB.getBool(&fbdo, "device_control/ac/jetCool")) {
    devices.jetCool = fbdo.boolData();
  }

  executeDeviceControl();
}

// Robot commands now handled by Stream callback (streamCallback function)
// No polling needed - INSTANT response!

// ================= EXECUTE DEVICE CONTROL =================
void executeDeviceControl() {
  // Fan Control
  if (devices.fanOn != lastDevices.fanOn) {
    if (devices.fanOn) {
      digitalWrite(RELAY_FAN, LOW);
      Serial.println("[DEVICE] ✔ FAN ON");
    } else {
      digitalWrite(RELAY_FAN, HIGH);
      Serial.println("[DEVICE] ✔ FAN OFF");
    }
    lastDevices.fanOn = devices.fanOn;
  }

  // Ionizer Control
  if (devices.ionizerOn != lastDevices.ionizerOn) {
    if (devices.ionizerOn) {
      digitalWrite(RELAY_IONIZER, HIGH);
      Serial.println("[DEVICE] ✔ IONIZER ON");
    } else {
      digitalWrite(RELAY_IONIZER, LOW);
      Serial.println("[DEVICE] ✔ IONIZER OFF");
    }
    lastDevices.ionizerOn = devices.ionizerOn;
  }

  // AC Control
  if (devices.acOn != lastDevices.acOn) {
    if (devices.acOn) {
      IrSender.sendRaw(lgOnRaw, sizeof(lgOnRaw)/2, 38);
      Serial.println("[DEVICE] ✔ AC ON");
      delay(200);
      sendIRCommand(devices.acTemp);
    } else {
      IrSender.sendRaw(lgOffRaw, sizeof(lgOffRaw)/2, 38);
      Serial.println("[DEVICE] ✔ AC OFF");
    }
    lastDevices.acOn = devices.acOn;
  }

  // AC Temperature
  if (devices.acTemp != lastDevices.acTemp && devices.acOn) {
    sendIRCommand(devices.acTemp);
    Serial.printf("[DEVICE] ✔ AC TEMP SET TO %d°C\n", devices.acTemp);
    lastDevices.acTemp = devices.acTemp;
  }

  // Jet Cool
  if (devices.jetCool != lastDevices.jetCool && devices.acOn) {
    if (devices.jetCool) {
      IrSender.sendRaw(lgJetOnRaw, sizeof(lgJetOnRaw)/2, 38);
      Serial.println("[DEVICE] ✔ JET COOL ON");
    } else {
      IrSender.sendRaw(lgJetOffRaw, sizeof(lgJetOffRaw)/2, 38);
      Serial.println("[DEVICE] ✔ JET COOL OFF");
    }
    lastDevices.jetCool = devices.jetCool;
  }
}

// ================= EXECUTE ROBOT CONTROL =================
void executeRobotControl() {
  // Check if robot is deactivated
  if (!robot.active) {
    if (lastRobot.active) {
      berhenti();
      Serial.println("[ROBOT] Deactivated - Motors stopped");
    }
    lastRobot.active = robot.active;
    return;
  }
  lastRobot.active = robot.active;

  // Movement Control - execute immediately
  if (robot.command != lastRobot.command) {
    if (robot.command == "maju") {
      maju();
      Serial.println("[ROBOT] ▲ FORWARD");
    } else if (robot.command == "mundur") {
      mundur();
      Serial.println("[ROBOT] ▼ BACKWARD");
    } else if (robot.command == "kiri") {
      kiri();
      Serial.println("[ROBOT] ◀ LEFT");
    } else if (robot.command == "kanan") {
      kanan();
      Serial.println("[ROBOT] ▶ RIGHT");
    } else {
      berhenti();
      Serial.println("[ROBOT] ■ STOPPED");
    }
    lastRobot.command = robot.command;
  }

  // Servo Control - Direct angle from Firebase
  if (robot.servoAngle != currentServoAngle) {
    setServoAngle(robot.servoAngle);
    Serial.printf("[ROBOT] 🎯 SERVO: %d°\n", robot.servoAngle);
  }
}

// ================= SEND IR COMMAND FOR TEMPERATURE =================
void sendIRCommand(int temp) {
  switch(temp) {
    case 16: IrSender.sendRaw(lg16Raw, sizeof(lg16Raw)/2, 38); break;
    case 17: IrSender.sendRaw(lg17Raw, sizeof(lg17Raw)/2, 38); break;
    case 18: IrSender.sendRaw(lg18Raw, sizeof(lg18Raw)/2, 38); break;
    case 19: IrSender.sendRaw(lg19Raw, sizeof(lg19Raw)/2, 38); break;
    case 20: IrSender.sendRaw(lg20Raw, sizeof(lg20Raw)/2, 38); break;
    case 21: IrSender.sendRaw(lg21Raw, sizeof(lg21Raw)/2, 38); break;
    case 22: IrSender.sendRaw(lg22Raw, sizeof(lg22Raw)/2, 38); break;
    case 23: IrSender.sendRaw(lg23Raw, sizeof(lg23Raw)/2, 38); break;
    case 24: IrSender.sendRaw(lg24Raw, sizeof(lg24Raw)/2, 38); break;
    case 25: IrSender.sendRaw(lg25Raw, sizeof(lg25Raw)/2, 38); break;
    default: IrSender.sendRaw(lg24Raw, sizeof(lg24Raw)/2, 38); break;
  }
  delay(150);
}

// ================= HANDLE SERIAL COMMANDS =================
void handleSerialCommand(String cmd) {
  if (cmd == "status") {
    readSensors();
  }
  else if (cmd == "fan on") {
    devices.fanOn = true;
    Firebase.RTDB.setBool(&fbdo, "device_control/fan", true);
    executeDeviceControl();
  }
  else if (cmd == "fan off") {
    devices.fanOn = false;
    Firebase.RTDB.setBool(&fbdo, "device_control/fan", false);
    executeDeviceControl();
  }
  else if (cmd == "ion on") {
    devices.ionizerOn = true;
    Firebase.RTDB.setBool(&fbdo, "device_control/ionizer", true);
    executeDeviceControl();
  }
  else if (cmd == "ion off") {
    devices.ionizerOn = false;
    Firebase.RTDB.setBool(&fbdo, "device_control/ionizer", false);
    executeDeviceControl();
  }
  else if (cmd == "on") {
    devices.acOn = true;
    Firebase.RTDB.setBool(&fbdo, "device_control/ac/on", true);
    executeDeviceControl();
  }
  else if (cmd == "off") {
    devices.acOn = false;
    Firebase.RTDB.setBool(&fbdo, "device_control/ac/on", false);
    executeDeviceControl();
  }
  else if (cmd.toInt() >= 16 && cmd.toInt() <= 25) {
    devices.acTemp = cmd.toInt();
    Firebase.RTDB.setInt(&fbdo, "device_control/ac/temp", devices.acTemp);
    executeDeviceControl();
  }
  else if (cmd == "jeton") {
    devices.jetCool = true;
    Firebase.RTDB.setBool(&fbdo, "device_control/ac/jetCool", true);
    executeDeviceControl();
  }
  else if (cmd == "jetoff") {
    devices.jetCool = false;
    Firebase.RTDB.setBool(&fbdo, "device_control/ac/jetCool", false);
    executeDeviceControl();
  }
  // Robot commands via Serial
  else if (cmd == "robot on") {
    robot.active = true;
    Firebase.RTDB.setBool(&fbdo, "robot_control/active", true);
    Serial.println("[ROBOT] Activated");
  }
  else if (cmd == "robot off") {
    robot.active = false;
    Firebase.RTDB.setBool(&fbdo, "robot_control/active", false);
    berhenti();
    Serial.println("[ROBOT] Deactivated");
  }
  else if (cmd == "maju" || cmd == "mundur" || cmd == "kiri" || cmd == "kanan" || cmd == "stop") {
    Firebase.RTDB.setString(&fbdo, "robot_control/command", cmd);
    robot.command = cmd;
    executeRobotControl();
  }
  else {
    Serial.println("✖ COMMAND TIDAK DIKENAL");
    Serial.println("Commands: status, fan on/off, ion on/off, on, off, 16-25, jeton, jetoff");
    Serial.println("Robot: robot on/off, maju, mundur, kiri, kanan, stop");
  }
}
