# ─────────────────────────────────────────────────────────────
#  services/camera_manager.py — Camera manager
#  Two sources, one interface:
#    • OpenCV webcam (cv2) — real video capture on the server. Optional
#      dependency (`pip install opencv-python-headless`); used when the
#      server has a camera (kiosk/demo box, GPU box with webcam).
#    • Simulated camera — deterministic synthetic landmark frames
#      (utils/landmarks.generate_hand) so the whole pipeline — capture →
#      predict → sequence → TTS — can run with zero hardware.
#  Resource rule: the capture handle is opened lazily, held for the
#  server's lifetime, and released on shutdown — never per request.
#  Puzzle piece for the WebSocket phase: the browser streams frames;
#  this manager exists for the optional server-side capture fallback.
#  ─────────────────────────────────────────────────────────────
from __future__ import annotations

import logging
from typing import Any, Optional

from app.config import settings
from app.utils import landmarks

log = logging.getLogger('app')

_HAND_SHAPES = ['open', 'peace', 'point', 'fist', 'thumbs_up']  # demo cycle


class CameraSource:
    """Interface — read_frame() returns a 21×3 landmark frame or None."""

    def open(self) -> None: ...
    def close(self) -> None: ...
    def read_frame(self) -> Optional[list[list[float]]]: ...


class OpenCVCamera(CameraSource):
    """Real webcam through OpenCV's MediaPipe pipeline (landmarks out)."""

    def __init__(self, index: int):
        self.index = index
        self._cap: Any = None

    def open(self) -> None:
        import cv2
        self._cap = cv2.VideoCapture(self.index)
        log.info('opened camera %s', self.index)

    def close(self) -> None:
        if self._cap is not None:
            self._cap.release()

    def read_frame(self) -> Optional[list[list[float]]]:
        ok, frame = self._cap.read()
        if not ok:
            return None
        # Real MediaPipe hand-layout extraction lives in the CV service
        # phase; for now the server-side capture path returns None
        # (client-side browser MediaPipe remains the primary source).
        return None


class SimulatedCamera(CameraSource):
    """No hardware, no OpenCV: cycles deterministic synthetic hands.
    The seed advances per frame so shapes look dynamic but reproducible."""

    def __init__(self):
        self._frame = 0

    def open(self) -> None:
        log.info('simulated camera ready (no OpenCV installed)')

    def close(self) -> None:
        pass

    def read_frame(self) -> list[list[float]]:
        shape = _HAND_SHAPES[self._frame % len(_HAND_SHAPES)]
        self._frame += 1
        return landmarks.generate_hand(shape, seed=self._frame)


class CameraManager:
    """Picks the best available source and hands out frames."""

    def __init__(self, index: int):
        self._source: CameraSource = self._build(index)

    def _build(self, index: int) -> CameraSource:
        try:
            import cv2  # noqa: F401
            return OpenCVCamera(index)
        except ImportError:
            log.info('opencv not installed — using simulated camera')
            return SimulatedCamera()

    def open(self) -> None:
        self._source.open()

    def close(self) -> None:
        self._source.close()

    def read_frame(self) -> Optional[list[list[float]]]:
        return self._source.read_frame()

    def status(self) -> dict[str, Any]:
        return {'source': self._source.__class__.__name__}