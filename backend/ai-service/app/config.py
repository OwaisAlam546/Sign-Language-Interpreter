# ─────────────────────────────────────────────────────────────
#  config.py — AI service configuration
#  Single source of truth for everything environment-specific.
#  Values come from .env (never committed) or sane defaults.
#  ─────────────────────────────────────────────────────────────
import os
from pathlib import Path
from dataclasses import dataclass, field

from dotenv import load_dotenv

# .env lives next to this file (app/../.env → ai-service/.env)
_BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_BASE_DIR / '.env')


def _cors_list(raw: str) -> list[str]:
    """'*' or a comma-separated origin list."""
    if raw == '*':
        return ['*']
    return [o.strip() for o in raw.split(',') if o.strip()]


@dataclass
class Settings:
    host: str = field(default_factory=lambda: os.getenv('AI_HOST', '0.0.0.0'))
    port: int = field(default_factory=lambda: int(os.getenv('AI_PORT', '8000')))
    # Where trained weights live — drop sign_lstm.h5 / .tflite / .onnx here
    model_dir: Path = field(
        default_factory=lambda: Path(os.getenv('AI_MODEL_DIR', str(_BASE_DIR / 'models')))
    )
    # tone = offline synthesized WAV fallback (zero dependencies)
    # gtts = real neural TTS (needs `pip install gTTS` + internet)
    tts_engine: str = field(default_factory=lambda: os.getenv('TTS_ENGINE', 'tone'))
    tts_lang: str = field(default_factory=lambda: os.getenv('TTS_LANG', 'en'))
    cors_origins: list[str] = field(
        default_factory=lambda: _cors_list(os.getenv('CORS_ORIGINS', '*'))
    )
    log_level: str = field(default_factory=lambda: os.getenv('LOG_LEVEL', 'INFO'))
    # Camera index used by the optional OpenCV capture path
    camera_index: int = field(default_factory=lambda: int(os.getenv('CAMERA_INDEX', '0')))
    # ── Phase 8: TensorFlow inference tuning ───────────────────
    model_window: int = field(default_factory=lambda: int(os.getenv('AI_MODEL_WINDOW', '12')))
    confidence_threshold: float = field(
        default_factory=lambda: float(os.getenv('AI_CONFIDENCE_THRESHOLD', '0.55')))
    smoothing_alpha: float = field(
        default_factory=lambda: float(os.getenv('AI_SMOOTHING_ALPHA', '0.6')))
    version: str = '0.1.0'
    service_name: str = 'signspeak-ai'

    def reload(self) -> 'Settings':
        """Re-read .env (used by tests / hot reload)."""
        load_dotenv(_BASE_DIR / '.env', override=True)
        return Settings()


settings = Settings()