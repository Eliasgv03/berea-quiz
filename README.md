# Juego de Preguntas de Génesis

Proyecto local con backend en Python y frontend sencillo en Next.js.

## Requisitos

- Python 3.10+
- Node.js 20+
- npm

## Arranque local

En una terminal:

```powershell
python backend/server.py
```

El backend queda en `http://localhost:8000`.

En otra terminal:

```powershell
cd frontend
npm install
npm run dev
```

El frontend queda en `http://localhost:3000`.

## API

- `GET /api/questions`: devuelve el banco de preguntas.
- `GET /api/scoreboard`: devuelve la tabla de puntuaciones.
- `POST /api/scoreboard`: guarda una puntuación. Body:

```json
{
  "name": "Jugador",
  "score": 1200,
  "correct": 12,
  "total": 15
}
```

