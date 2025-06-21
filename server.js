const express = require('express');
const path = require('path');
const fetch = require('node-fetch'); // node-fetch v2 사용

const app = express();
const PORT = 3000;

// === 본인의 SmartThings 정보 입력 ===
const SMARTTHINGS_TOKEN = '1a4787af-c105-430b-8308-a8e6abd0ab1f';

const DEVICES = {
  tempHum:   'ca13b73d-bdca-4180-b0ab-8de07f1e443c',
  illumin:   'c2e62570-237a-45fe-b932-4ace47ef18c6',
  door:      '055c1fe4-dd2b-4ec5-ae83-c2c72e503426'
};
// ===================================

let sensorData = {
  temp:      '알 수 없음',
  hum:       '알 수 없음',
  energy:    '알 수 없음',
  illumin:   '알 수 없음',
  door:      '알 수 없음'
};

async function fetchDeviceStatus(deviceId) {
  try {
    const res = await fetch(`https://api.smartthings.com/v1/devices/${deviceId}/status`, {
      headers: { 'Authorization': `Bearer ${SMARTTHINGS_TOKEN}` }
    });
    return await res.json();
  } catch (e) {
    return null;
  }
}

function safe(obj, path, def = null) {
  try {
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : def), obj);
  } catch {
    return def;
  }
}

async function updateSensors() {
  // 온습도 + 에너지 (에너지는 플러그/스테이션이 아니라 온습도 센서에서 측정되는 값 사용)
  try {
    const data = await fetchDeviceStatus(DEVICES.tempHum);
    sensorData.temp = safe(data, 'components.main.temperatureMeasurement.temperature.value', null) !== null ?
      safe(data, 'components.main.temperatureMeasurement.temperature.value') + '°C' : '알 수 없음';
    sensorData.hum = safe(data, 'components.main.relativeHumidityMeasurement.humidity.value', null) !== null ?
      safe(data, 'components.main.relativeHumidityMeasurement.humidity.value') + '%' : '알 수 없음';
    // 에너지 사용량(예시: 누적 전력/에너지)
    sensorData.energy = safe(data, 'components.main.energyMeter.energy.value', null) !== null ?
      safe(data, 'components.main.energyMeter.energy.value') + ' kWh' : '알 수 없음';
  } catch {
    sensorData.temp = '오류';
    sensorData.hum = '오류';
    sensorData.energy = '오류';
  }

  // 조도센서
  try {
    const data = await fetchDeviceStatus(DEVICES.illumin);
    sensorData.illumin = safe(data, 'components.main.illuminanceMeasurement.illuminance.value', null) !== null ?
      safe(data, 'components.main.illuminanceMeasurement.illuminance.value') + ' lux' : '알 수 없음';
  } catch {
    sensorData.illumin = '오류';
  }

  // 문열림 센서
  try {
    const data = await fetchDeviceStatus(DEVICES.door);
    const status = safe(data, 'components.main.contactSensor.contact.value', '알 수 없음');
    sensorData.door =
      status === 'open' ? '열림' :
      status === 'closed' ? '닫힘' :
      '알 수 없음';
  } catch {
    sensorData.door = '오류';
  }
}

// 15초마다 모든 센서 상태 갱신
setInterval(updateSensors, 15000);
updateSensors();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/status', (req, res) => {
  res.json(sensorData);
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
