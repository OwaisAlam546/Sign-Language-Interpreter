# Pretrained ASL alphabet model

`asl_cnn_model.onnx` and `class_names.txt` are loaded by the browser through
ONNX Runtime Web when the AI server has no compatible sequence model.

The `mediapipe/` directory contains the pinned local WASM runtime and hand
landmarker task used by the browser camera pipeline. Keeping these assets
local avoids a CDN outage breaking hand tracking.

The `onnxruntime/` directory contains the ONNX Runtime Web WASM binaries.
They are explicitly configured in the client so Vite does not route a WASM
request to `index.html` during development.

Source: https://github.com/punpuniacitizen/MediaPipe-ASL-sign-language-recognition

The model recognizes static ASL alphabet letters. It does not recognize
motion-based lexical signs such as HELLO, THANK YOU, or SORRY.
