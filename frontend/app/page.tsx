"use client";

import { ArrowRight, Award, Heart, RotateCcw, Send, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Question = {
  id: number;
  category: string;
  type: string;
  difficulty: "fácil" | "media" | "difícil";
  prompt: string;
  options: string[];
  answer: string;
  reference: string;
  context: string;
  explanation: string;
};

type ScoreEntry = {
  name: string;
  score: number;
  correct: number;
  total: number;
  createdAt: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const STARTING_LIVES = 3;
const ALL_FILTER = "todas";

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function difficultyPoints(difficulty: Question["difficulty"]) {
  if (difficulty === "difícil") return 140;
  if (difficulty === "media") return 100;
  return 70;
}

function prepareRound(questions: Question[]) {
  return shuffle(questions)
    .map((question) => ({
      ...question,
      options: shuffle(question.options),
    }));
}

export default function Home() {
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [roundQuestions, setRoundQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const [playerName, setPlayerName] = useState("Jugador");
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState(ALL_FILTER);
  const [categoryFilter, setCategoryFilter] = useState(ALL_FILTER);

  const current = roundQuestions[currentIndex];

  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((question) => {
      const difficultyMatches = difficultyFilter === ALL_FILTER || question.difficulty === difficultyFilter;
      const categoryMatches = categoryFilter === ALL_FILTER || question.category === categoryFilter;
      return difficultyMatches && categoryMatches;
    });
  }, [allQuestions, categoryFilter, difficultyFilter]);

  const categories = useMemo(() => {
    const counts = allQuestions.reduce<Record<string, number>>((acc, question) => {
      acc[question.category] = (acc[question.category] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allQuestions]);

  const difficulties = useMemo(() => {
    return Array.from(new Set(allQuestions.map((question) => question.difficulty))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [allQuestions]);

  useEffect(() => {
    async function load() {
      try {
        const [questionResponse, scoreResponse] = await Promise.all([
          fetch(`${API_URL}/api/questions`),
          fetch(`${API_URL}/api/scoreboard`),
        ]);
        if (!questionResponse.ok || !scoreResponse.ok) {
          throw new Error("No se pudo conectar con el backend.");
        }
        const questionData = (await questionResponse.json()) as { questions: Question[] };
        const scoreData = (await scoreResponse.json()) as { scores: ScoreEntry[] };
        setAllQuestions(questionData.questions);
        setRoundQuestions(prepareRound(questionData.questions));
        setScores(scoreData.scores);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  function restart(source = filteredQuestions) {
    setRoundQuestions(prepareRound(source));
    setCurrentIndex(0);
    setSelected(null);
    setLives(STARTING_LIVES);
    setScore(0);
    setCorrect(0);
    setFinished(false);
    setSaved(false);
  }

  function answer(option: string) {
    if (!current || selected || finished) return;

    setSelected(option);
    const isCorrect = option === current.answer;

    if (isCorrect) {
      setCorrect((value) => value + 1);
      setScore((value) => value + difficultyPoints(current.difficulty));
    } else {
      setLives((value) => value - 1);
    }
  }

  function nextQuestion() {
    if (!selected) return;

    const nextIndex = currentIndex + 1;

    setSelected(null);
    if (lives <= 0 || nextIndex >= roundQuestions.length) {
      setFinished(true);
      return;
    }
    setCurrentIndex(nextIndex);
  }

  async function saveScore() {
    try {
      const response = await fetch(`${API_URL}/api/scoreboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: playerName,
          score,
          correct,
          total: roundQuestions.length,
        }),
      });
      if (!response.ok) throw new Error("No se pudo guardar.");
      const data = (await response.json()) as { scores: ScoreEntry[] };
      setScores(data.scores);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    }
  }

  if (loading) {
    return <main className="shell center">Cargando preguntas...</main>;
  }

  if (error) {
    return (
      <main className="shell center">
        <section className="notice">
          <h1>Backend no disponible</h1>
          <p>{error}</p>
          <p>Ejecuta `python backend/server.py` y recarga esta página.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="game-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Génesis Quiz</p>
            <h1>Preguntas bíblicas por rondas</h1>
          </div>
          <button className="icon-button" onClick={() => restart(filteredQuestions)} title="Reiniciar ronda">
            <RotateCcw size={20} />
          </button>
        </header>

        <div className="stats" aria-label="Estado del juego">
          <span>
            <Trophy size={18} /> {score} pts
          </span>
          <span>
            <Award size={18} /> {correct}/{roundQuestions.length}
          </span>
          <span>
            <Heart size={18} /> {lives}
          </span>
        </div>

        <section className="filters" aria-label="Filtros de preguntas">
          <label>
            Dificultad
            <select value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)}>
              <option value={ALL_FILTER}>Todas</option>
              {difficulties.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {difficulty}
                </option>
              ))}
            </select>
          </label>
          <label>
            Categoría
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value={ALL_FILTER}>Todas</option>
              {categories.map(([category]) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <button disabled={filteredQuestions.length === 0} onClick={() => restart(filteredQuestions)}>
            Nueva ronda
          </button>
          <p>{filteredQuestions.length} preguntas disponibles; la ronda continúa hasta agotarlas.</p>
        </section>

        {!finished && current ? (
          <section className="question-area">
            <div className="question-meta">
              <span>Pregunta {currentIndex + 1} de {roundQuestions.length}</span>
              <span>{current.category}</span>
              <span>{current.type}</span>
              <span>{current.difficulty}</span>
            </div>
            <h2>{current.prompt}</h2>
            <div className="options">
              {current.options.map((option) => {
                const state =
                  selected && option === current.answer
                    ? "correct"
                    : selected === option
                      ? "wrong"
                      : "";
                return (
                  <button
                    className={`option ${state}`}
                    disabled={Boolean(selected)}
                    key={option}
                    onClick={() => answer(option)}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {selected && (
              <div className="feedback-panel">
                <p className={selected === current.answer ? "result correct-text" : "result wrong-text"}>
                  {selected === current.answer ? "Correcto." : `Incorrecto. Respuesta correcta: ${current.answer}.`}
                </p>
                <div>
                  <h3>Contexto</h3>
                  <p>{current.context}</p>
                </div>
                <div>
                  <h3>Explicación</h3>
                  <p>{current.explanation}</p>
                </div>
                <p className="reference">Referencia: {current.reference}</p>
                <button className="next-button" onClick={nextQuestion}>
                  {lives <= 0 || currentIndex + 1 >= roundQuestions.length ? "Finalizar" : "Siguiente"}
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
          </section>
        ) : (
          <section className="finish">
            <h2>Ronda terminada</h2>
            <p>
              Lograste {score} puntos con {correct} respuestas correctas de {roundQuestions.length}.
            </p>
            <div className="save-row">
              <input
                aria-label="Nombre del jugador"
                maxLength={24}
                onChange={(event) => setPlayerName(event.target.value)}
                value={playerName}
              />
              <button disabled={saved} onClick={saveScore}>
                <Send size={18} />
                {saved ? "Guardado" : "Guardar"}
              </button>
            </div>
          </section>
        )}
      </section>

      <aside className="side-panel">
        <section>
          <h2>Tabla de puntuaciones</h2>
          <ol className="score-list">
            {scores.length === 0 && <li>No hay puntuaciones todavía.</li>}
            {scores.slice(0, 10).map((entry, index) => (
              <li key={`${entry.name}-${entry.createdAt}-${index}`}>
                <span>{entry.name}</span>
                <strong>{entry.score}</strong>
                <small>{entry.correct}/{entry.total}</small>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2>Banco de preguntas</h2>
          <div className="category-grid">
            {categories.map(([category, count]) => (
              <span key={category}>
                {category}
                <strong>{count}</strong>
              </span>
            ))}
          </div>
        </section>
      </aside>
    </main>
  );
}
