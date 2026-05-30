const video = document.getElementById("video");
const canvas = document.getElementById("canvas");

const verifyBlinkBtn = document.getElementById("verifyBlinkBtn");
const blinkStatus = document.getElementById("blinkStatus");

const attendanceBox = document.getElementById("attendanceBox");
const captureBtn = document.getElementById("captureBtn");
const resultBox = document.getElementById("resultBox");
const sessionCodeInput = document.getElementById("sessionCode");

let blinkVerified = false;
let cameraReady = false;
let faceMesh = null;
let blinkChecking = false;

let eyeOpenSeen = false;
let eyeClosedSeen = false;

function showBlink(message, type = "info") {
    blinkStatus.innerHTML = message;

    if (type === "success") {
        blinkStatus.className = "result success";
    } else if (type === "error") {
        blinkStatus.className = "result error";
    } else {
        blinkStatus.className = "result note";
    }
}

function showResult(message, type = "info") {
    resultBox.innerHTML = message;

    if (type === "success") {
        resultBox.className = "result success";
    } else if (type === "error") {
        resultBox.className = "result error";
    } else {
        resultBox.className = "result note";
    }
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        video.srcObject = stream;

        video.onloadedmetadata = () => {
            cameraReady = true;
            showBlink("Camera started. Click 'Start Blink Verification' and blink once.");
        };
    } catch (error) {
        showBlink("Camera permission denied: " + error.message, "error");
    }
}

function getLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported in this browser"));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => resolve(position),
            error => reject(error),
            {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 0
            }
        );
    });
}

function captureImage() {
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.85);
}

function distance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function eyeAspectRatio(landmarks, eyePoints) {
    const p1 = landmarks[eyePoints[0]];
    const p2 = landmarks[eyePoints[1]];
    const p3 = landmarks[eyePoints[2]];
    const p4 = landmarks[eyePoints[3]];
    const p5 = landmarks[eyePoints[4]];
    const p6 = landmarks[eyePoints[5]];

    const vertical1 = distance(p2, p6);
    const vertical2 = distance(p3, p5);
    const horizontal = distance(p1, p4);

    if (horizontal === 0) {
        return 0;
    }

    return (vertical1 + vertical2) / (2.0 * horizontal);
}

async function setupFaceMesh() {
    faceMesh = new FaceMesh({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
    });

    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    faceMesh.onResults(onFaceMeshResults);
}

function onFaceMeshResults(results) {
    if (!blinkChecking || blinkVerified) {
        return;
    }

    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        showBlink("No face detected. Please keep your face in front of camera.", "error");
        return;
    }

    const landmarks = results.multiFaceLandmarks[0];

    const leftEye = [33, 160, 158, 133, 153, 144];
    const rightEye = [362, 385, 387, 263, 373, 380];

    const leftEAR = eyeAspectRatio(landmarks, leftEye);
    const rightEAR = eyeAspectRatio(landmarks, rightEye);
    const avgEAR = (leftEAR + rightEAR) / 2;

    if (avgEAR > 0.22) {
        eyeOpenSeen = true;
        showBlink("Face detected. Now blink once clearly.");
    }

    if (eyeOpenSeen && avgEAR < 0.18) {
        eyeClosedSeen = true;
        showBlink("Blink detected. Open your eyes again...");
    }

    if (eyeOpenSeen && eyeClosedSeen && avgEAR > 0.22) {
        blinkVerified = true;
        blinkChecking = false;

        showBlink("Face + blink verification successful ✅", "success");

        attendanceBox.style.display = "block";
        verifyBlinkBtn.disabled = true;
        verifyBlinkBtn.innerText = "Blink Verified";
    }
}

async function blinkLoop() {
    if (!blinkChecking || blinkVerified) {
        return;
    }

    if (cameraReady && faceMesh) {
        await faceMesh.send({ image: video });
    }

    requestAnimationFrame(blinkLoop);
}

verifyBlinkBtn.addEventListener("click", async function () {
    if (!cameraReady) {
        showBlink("Camera not ready yet. Please wait.", "error");
        return;
    }

    if (!faceMesh) {
        showBlink("Loading face verification model...");
        await setupFaceMesh();
    }

    blinkVerified = false;
    blinkChecking = true;
    eyeOpenSeen = false;
    eyeClosedSeen = false;

    showBlink("Verification started. Keep face visible and blink once clearly.");
    blinkLoop();
});

captureBtn.addEventListener("click", async function () {
    if (!blinkVerified) {
        showResult("Please complete face blink verification first.", "error");
        return;
    }

    const sessionCode = sessionCodeInput.value.trim().toUpperCase();

    if (!sessionCode) {
        showResult("Please enter teacher session code.", "error");
        return;
    }

    showResult("Checking location and marking attendance...");

    try {
        const position = await getLocation();
        const imageData = captureImage();

        const response = await fetch("/api/mark-attendance", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                session_id: window.SESSION_ID,
                session_code: sessionCode,
                image_data: imageData,
                lat: position.coords.latitude,
                lng: position.coords.longitude
            })
        });

        const data = await response.json();

        if (data.success) {
            showResult(
                `<div class="verified-card">
                    <h2>${data.message} ✅</h2>

                    <div class="verified-layout">
                        <div>
                            <p><b>Name:</b> ${data.name}</p>
                            <p><b>Roll No:</b> ${data.roll_no}</p>
                            <p><b>Subject:</b> ${data.subject}</p>
                            <p><b>Distance:</b> ${data.distance} meters</p>
                        </div>

                        <div>
                            <p><b>Verified Photo:</b></p>
                            <img src="${data.proof_image}" class="verified-photo">
                        </div>
                    </div>
                </div>`,
                "success"
            );
        } else {
            showResult(data.message, "error");
        }
    } catch (error) {
        showResult("Error: " + error.message, "error");
    }
});

startCamera();