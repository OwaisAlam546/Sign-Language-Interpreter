# ─────────────────────────────────────────────────────────────
#  utils/envelope.py — Response envelope + ApiError
#  Every endpoint returns either:
#    {success: true,  data: …}
#    {success: false, error: {code, message}}
#  This mirrors the gateway's ApiResponse/ApiError contract, so the
#  frontend needs ONE response interceptor for both services.
#  ─────────────────────────────────────────────────────────────


class ApiError(Exception):
    """Anything we control -> an exact HTTP status + machine code."""

    def __init__(self, status: int, code: str, message: str):
        self.status = status
        self.code = code
        super().__init__(message)


def ok(data: dict | list | None = None, meta: dict | None = None) -> dict:
    """Successful envelope; `meta` carries list pagination when relevant."""
    body: dict = {'success': True, 'data': data if data is not None else {}}
    if meta is not None:
        body['meta'] = meta
    return body


def err(status: int, code: str, message: str) -> dict:
    """Error envelope — used by the handlers in main.py."""
    return {'success': False, 'error': {'code': code, 'message': message}}