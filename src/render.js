const { desktopCapturer, remote } = require('electron');

const { writeFile } = require('fs');

const { dialog, Menu } = remote;

const audioDevices = document.getElementById('audio-devices');
const videoDevices = document.getElementById('video-devices');

let videoDevicesAvaliableOnUser = [];

function selectDevice() {
  const videoDeviceSelected = videoDevicesAvaliableOnUser[videoDevices.value];
  if (videoDeviceSelected)
    selectSource(videoDeviceSelected)
}

const getAvaliableDevices = async () => {
  const inputDevices = await navigator.mediaDevices.enumerateDevices();
  audioDevices.innerHTML = inputDevices.filter(device => device.kind === 'audioinput').map(device => 
    `<option value="${device.deviceId}">${device.label}</option>`
  );

  const inputSources = await desktopCapturer.getSources({
    types: ['window', 'screen']
  });

  videoDevicesAvaliableOnUser = inputSources;

  function truncate(source, size) {
    return source.length > size ? source.slice(0, size - 1) + "…" : source;
  }
  
  videoDevices.innerHTML = inputSources.map((source, index) => 
    `<option value="${index}">${truncate(source.name, 45)}</option>`
  );

  if (inputSources.length > 0) {
    selectDevice();
  }
};
getAvaliableDevices();

// Global state
let mediaRecorder; // MediaRecorder instance to capture footage
const recordedChunks = [];

// Buttons
const videoElement = document.querySelector('video');

const startBtn = document.getElementById('startBtn');
startBtn.onclick = e => {
  audioDevices.toggleAttribute('read-only');
  videoDevices.toggleAttribute('read-only');
  mediaRecorder.start();
  stopBtn.classList.remove('disabled');
  startBtn.classList.add('disabled');
  startBtn.innerText = 'Recording';
};

const stopBtn = document.getElementById('stopBtn');

stopBtn.onclick = e => {
  audioDevices.toggleAttribute('read-only');
  videoDevices.toggleAttribute('read-only');
  mediaRecorder.stop();
  stopBtn.classList.add('disabled');
  startBtn.classList.remove('disabled');
  startBtn.innerText = 'Start';
};

let rec = undefined;
// Change the videoSource window to record
async function selectSource(source) {
  // const constraints = { audio: true, video: { facingMode: { exact: "environment" } } }
  // const constraints = { video: { facingMode: (front? "user" : "environment") } };

  // Create a Stream
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        echoCancellation: true,
        chromeMediaSource: 'desktop',
      }
    },
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source.id,
        maxFrameRate: 24
      }
    }
  });
    
  const audio_stream = await navigator.mediaDevices.getUserMedia({ audio: {
    deviceId: audioDevices.value
  }})

  // Preview the source in a video element
  videoElement.srcObject = stream;
  videoElement.play();

  // Create the Media Recorder
  const options = { 
    audioBitsPerSecond : 128000,
    videoBitsPerSecond : 500000,
    mimeType : 'video/webm'
  }
  // const tracks = [...audio_stream.getAudioTracks()];
  const tracks = [...stream.getVideoTracks(), ...audio_stream.getAudioTracks()];
  mediaRecorder = new MediaRecorder(new MediaStream(tracks), options);

  // Register Event Handlers
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.onstop = handleStop;

  // Updates the UI
}

// Captures all recorded chunks
function handleDataAvailable(e) {
  if (e.data.size > 0)
    recordedChunks.push(e.data);
}

// Saves the video file on stop
async function handleStop(e) {
  const blob = new Blob(recordedChunks, {
    type: 'video/webm'
  });
  
  const buffer = Buffer.from(await blob.arrayBuffer());

  const { filePath } = await dialog.showSaveDialog({
    buttonLabel: 'Salvar vídeo',
    defaultPath: `video-${Date.now()}.webm`
  });

  if (filePath) {
    recordedChunks.length = 0;
    writeFile(filePath, buffer, () => alert('Salvo com sucesso!'));
  }
}
