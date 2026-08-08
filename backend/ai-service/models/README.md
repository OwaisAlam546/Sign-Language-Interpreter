# Trained weights live here — the model loader scans this folder at
# startup and picks the first loadable file (.h5, .keras, .tflite,
# .onnx, .pkl) as the inference engine.

## How to go from fallback → real model
# 1. Export your trained LSTM from the training notebook:
#      model.save('models/sign_lstm.h5')
# 2. `pip install tensorflow`
# 3. Restart the service — /api/v1/model-status will show
#    `engine: tensorflow, fallback: false`.
#
# Without a weights file (or without the ML runtime) the service
# transparently uses the rule-based fallback recognizer, so every
# other endpoint keeps working.