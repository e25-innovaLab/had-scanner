from __future__ import annotations


class GeminiAnalysisError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)

    def user_message(self) -> str:
        return self.message
