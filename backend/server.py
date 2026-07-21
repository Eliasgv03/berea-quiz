from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from time import time
from urllib.parse import urlparse

from questions import get_questions


ROOT = Path(__file__).resolve().parent
SCOREBOARD_FILE = ROOT / "scoreboard.json"
HOST = "127.0.0.1"
PORT = 8000


def read_scoreboard() -> list[dict]:
    if not SCOREBOARD_FILE.exists():
        return []
    try:
        data = json.loads(SCOREBOARD_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    return data if isinstance(data, list) else []


def write_scoreboard(entries: list[dict]) -> None:
    SCOREBOARD_FILE.write_text(
        json.dumps(entries[:20], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, payload: object) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self._send_json(204, {})

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/health":
            self._send_json(200, {"ok": True})
            return
        if path == "/api/questions":
            self._send_json(200, {"questions": get_questions()})
            return
        if path == "/api/scoreboard":
            self._send_json(200, {"scores": read_scoreboard()})
            return
        self._send_json(404, {"error": "Ruta no encontrada"})

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path != "/api/scoreboard":
            self._send_json(404, {"error": "Ruta no encontrada"})
            return

        length = int(self.headers.get("Content-Length", "0"))
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except json.JSONDecodeError:
            self._send_json(400, {"error": "JSON inválido"})
            return

        name = str(payload.get("name", "Jugador")).strip()[:24] or "Jugador"
        score = max(0, int(payload.get("score", 0)))
        correct = max(0, int(payload.get("correct", 0)))
        total = max(0, int(payload.get("total", 0)))

        entry = {
            "name": name,
            "score": score,
            "correct": correct,
            "total": total,
            "createdAt": int(time()),
        }
        scores = read_scoreboard()
        scores.append(entry)
        scores.sort(key=lambda item: (item["score"], item["correct"]), reverse=True)
        write_scoreboard(scores)
        self._send_json(201, {"score": entry, "scores": scores[:20]})

    def log_message(self, format: str, *args: object) -> None:
        print(f"{self.address_string()} - {format % args}")


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Backend listo en http://{HOST}:{PORT}")
    print("Endpoints: /api/questions, /api/scoreboard")
    server.serve_forever()


if __name__ == "__main__":
    main()
