const { desktopCapturer, remote } = require('electron');

const { writeFile } = require('fs');

const { dialog, Menu } = remote;

let audioDevices = [];
navigator.mediaDevices.enumerateDevices().then((input_devices) => {
  audioDevices = input_devices;
});

// Global state
let mediaRecorder; // MediaRecorder instance to capture footage
const recordedChunks = [];

// Buttons
const videoElement = document.querySelector('video');

const startBtn = document.getElementById('startBtn');
startBtn.onclick = e => {
  mediaRecorder.start();
  startBtn.classList.add('is-danger');
  startBtn.innerText = 'Recording';
};

const stopBtn = document.getElementById('stopBtn');

stopBtn.onclick = e => {
  mediaRecorder.stop();
  startBtn.classList.remove('is-danger');
  startBtn.innerText = 'Start';
};

const videoSelectBtn = document.getElementById('videoSelectBtn');
videoSelectBtn.onclick = getVideoSources;

// Get the available video sources
async function getVideoSources() {
  const inputSources = await desktopCapturer.getSources({
    types: ['window', 'screen']
  });

  const videoOptionsMenu = Menu.buildFromTemplate(
    inputSources.map(source => {
      return {
        label: source.name, 
        click: () => selectSource(source)
      };
    })
  );

  videoOptionsMenu.popup();
}

let rec = undefined;
// Change the videoSource window to record
async function selectSource(source) {
  // let combined = new MediaStream([...videoStream.getTracks(), ...audioStream.getTracks()]);
  // let recorder = new MediaRecorder(combined);

  videoSelectBtn.innerText = source.name;

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
        maxFrameRate: 15
      }
    }
  });
    
  const audio_stream = await navigator.mediaDevices.getUserMedia({ audio: true })

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
  console.log('video data available');
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
    defaultPath: `vid-${Date.now()}.webm`
  });

  if (filePath) {
    recordedChunks.length = 0;
    writeFile(filePath, buffer, () => console.log('video saved successfully!'));
  }
}
