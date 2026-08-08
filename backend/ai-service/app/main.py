# ─────────────────────────────────────────────────────────────
#  main.py — FastAPI app factory + lifecycle
#  Wire order matters:
#    1. logging    — before anything logs
#    2. services   — model (loaded ONCE), camera, prediction, TTS
#    3. error maps — envelope-consistent responses for every failure
#    4. routers    — /health at root (gateway probes this), the rest
#                    under /api/v1
#  Run:  uvicorn app.main:app --port 8000   (or `python -m app`)
#  ─────────────────────────────────────────────────────────────
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.logging import RequestLogMiddleware, setup_logging
from app.routers import health, model_status, predict, predict_sequence, process_frame, tts
from app.services.camera_manager import CameraManager
from app.services.model_loader import ModelManager
from app.services.pipeline import HandPipeline
from app.services.prediction_service import PredictionService
from app.services.tts_service import TTSManager
from app.utils.envelope import ApiError

log = logging.getLogger('app')


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: build the heavy singletons once. Shutdown: release the
    camera and let the loop wind down (model lives in the process)."""
    model = ModelManager(settings.model_dir)
    camera = CameraManager(settings.camera_index)
    camera.open()
    app.state.model = model
    app.state.camera = camera
    app.state.prediction = PredictionService(
        model, camera,
        window=settings.model_window,
        threshold=settings.confidence_threshold,
        alpha=settings.smoothing_alpha)
    app.state.tts = TTSManager(settings.tts_engine)
    app.state.pipeline = HandPipeline(model)
    log.info('startup complete — engine=%s, camera=%s, tts=%s, tracker=%s',
             model.engine.id, camera.status()['source'], settings.tts_engine,
             app.state.pipeline.tracker)
    yield
    camera.close()


def create_app() -> FastAPI:
    setup_logging(settings.log_level)
    app = FastAPI(
        title=settings.service_name,
        version=settings.version,
        lifespan=lifespan,
        docs_url='/api/docs',          # Swagger stays out of the way
        redoc_url=None,
    )

    # CORS — dev default '*' (the gateway fronts the browser in prod)
    app.add_middleware(CORSMiddleware,
                       allow_origins=settings.cors_origins,
                       allow_methods=['*'], allow_headers=['*'])
    app.add_middleware(RequestLogMiddleware)

    # ── error → envelope (mirrors the gateway's ApiError contract) ──
    @app.exception_handler(ApiError)
    async def on_api_error(_req: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(status_code=exc.status,
                            content={'success': False,
                                     'error': {'code': exc.code, 'message': str(exc)}})

    @app.exception_handler(RequestValidationError)
    async def on_validation_error(_req: Request, exc: RequestValidationError) -> JSONResponse:
        from fastapi.encoders import jsonable_encoder
        return JSONResponse(status_code=422,
                            content={'success': False,
                                     'error': {'code': 'VALIDATION_ERROR',
                                               'message': 'request body failed validation',
                                               'details': jsonable_encoder(exc.errors())}})

    @app.exception_handler(StarletteHTTPException)
    async def on_http_error(_req: Request, exc: StarletteHTTPException) -> JSONResponse:
        """Unknown routes and unsupported methods keep the same envelope
        (the gateway-side contract expects { success, error } everywhere)."""
        code = 'NOT_FOUND' if exc.status_code == 404 else 'METHOD_NOT_ALLOWED'
        return JSONResponse(status_code=exc.status_code,
                            content={'success': False,
                                     'error': {'code': code,
                                               'message': exc.detail}})

    @app.exception_handler(Exception)
    async def on_unexpected(_req: Request, exc: Exception) -> JSONResponse:
        log.exception('unhandled error: %s', exc)
        return JSONResponse(status_code=500,
                            content={'success': False,
                                     'error': {'code': 'INTERNAL_ERROR',
                                               'message': 'something went wrong'}})

    # ── routes ─────────────────────────────────────────────────
    # /health stays at the root — the gateway's /health/ai probes it
    app.include_router(health.router)
    for api_router in (predict.router, predict_sequence.router, process_frame.router,
                       model_status.router, tts.router):
        app.include_router(api_router, prefix='/api/v1')
    return app


app = create_app()