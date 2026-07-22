"use client";

import { BarChart3, BookOpen, Moon, RotateCcw, Sun } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Difficulty = "fácil" | "media" | "difícil";
type Screen = "home" | "setup" | "quiz" | "stats";

type Question = {
  id: number;
  category: string;
  type: string;
  difficulty: Difficulty;
  prompt: string;
  options: string[];
  answer: string;
  reference: string;
  context: string;
  explanation: string;
};

type QuestionStat = {
  attempts: number;
  correct: number;
};

type StoredStats = Record<string, QuestionStat>;

const ALL_FILTER = "todas";
const BOOKS = ["Todos", "Génesis"];
const STORAGE_KEY = "berea-web-question-stats-v1";

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function prepareRound(questions: Question[]) {
  return shuffle(questions).map((question) => ({
    ...question,
    options: shuffle(question.options),
  }));
}

function getStat(stats: StoredStats, id: number) {
  return stats[String(id)] ?? { attempts: 0, correct: 0 };
}

function percent(correct: number, total: number) {
  if (!total) return 0;
  return Math.round((correct / total) * 100);
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [darkMode, setDarkMode] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [roundQuestions, setRoundQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [roundFinished, setRoundFinished] = useState(false);
  const [bookFilter, setBookFilter] = useState(BOOKS[0]);
  const [difficultyFilter, setDifficultyFilter] = useState<string>(ALL_FILTER);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_FILTER);
  const [stats, setStats] = useState<StoredStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const current = roundQuestions[currentIndex];
  const difficulties: Difficulty[] = ["fácil", "media", "difícil"];

  const categories = useMemo(() => {
    return Array.from(new Set(questions.map((question) => question.category))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((question) => {
      const difficultyMatches = difficultyFilter === ALL_FILTER || question.difficulty === difficultyFilter;
      const categoryMatches = categoryFilter === ALL_FILTER || question.category === categoryFilter;
      return difficultyMatches && categoryMatches;
    });
  }, [categoryFilter, difficultyFilter, questions]);

  const totalAttempts = useMemo(() => {
    return Object.values(stats).reduce((sum, item) => sum + item.attempts, 0);
  }, [stats]);

  const totalCorrect = useMemo(() => {
    return Object.values(stats).reduce((sum, item) => sum + item.correct, 0);
  }, [stats]);

  const masteredTotal = useMemo(() => {
    return questions.filter((question) => getStat(stats, question.id).correct > 0).length;
  }, [questions, stats]);

  useEffect(() => {
    async function loadQuestions() {
      try {
        const response = await fetch("/api/questions");
        if (!response.ok) throw new Error("No se pudieron cargar las preguntas.");
        const data = (await response.json()) as { questions: Question[] };
        setQuestions(data.questions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido.");
      } finally {
        setLoading(false);
      }
    }

    const storedStats = window.localStorage.getItem(STORAGE_KEY);
    if (storedStats) setStats(JSON.parse(storedStats) as StoredStats);
    loadQuestions();
  }, []);

  function persistStats(nextStats: StoredStats) {
    setStats(nextStats);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStats));
  }

  function recordAnswer(question: Question, isCorrect: boolean) {
    const key = String(question.id);
    const previous = stats[key] ?? { attempts: 0, correct: 0 };
    persistStats({
      ...stats,
      [key]: {
        attempts: previous.attempts + 1,
        correct: previous.correct + (isCorrect ? 1 : 0),
      },
    });
  }

  function startRound() {
    setRoundQuestions(prepareRound(filteredQuestions));
    setCurrentIndex(0);
    setSelected(null);
    setRoundFinished(false);
    setScreen("quiz");
  }

  function answer(option: string) {
    if (!current || selected || roundFinished) return;
    setSelected(option);
    recordAnswer(current, option === current.answer);
  }

  function nextQuestion() {
    if (!selected) return;
    const nextIndex = currentIndex + 1;
    setSelected(null);
    if (nextIndex >= roundQuestions.length) {
      setRoundFinished(true);
      return;
    }
    setCurrentIndex(nextIndex);
  }

  function resetFilters() {
    setBookFilter(BOOKS[0]);
    setDifficultyFilter(ALL_FILTER);
    setCategoryFilter(ALL_FILTER);
  }

  function clearStats() {
    persistStats({});
  }

  if (loading) {
    return <main className="app-shell center">Cargando Berea...</main>;
  }

  if (error) {
    return (
      <main className="app-shell center">
        <section className="card narrow">
          <h1>No se pudo cargar Berea</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  return (
    <main className={darkMode ? "app-shell dark" : "app-shell"}>
      <header className="app-topbar">
        <button className="brand-button" onClick={() => setScreen("home")}>
          <BookOpen size={20} />
          Berea
        </button>
        <div className="top-actions">
          <button aria-label="Cambiar tema" className="icon-button" onClick={() => setDarkMode((value) => !value)}>
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button aria-label="Ver estadísticas" className="icon-button" onClick={() => setScreen("stats")}>
            <BarChart3 size={20} />
          </button>
        </div>
      </header>

      <section className="content-wrap">
        {screen === "home" && (
          <section className="hero-screen">
            <div className="logo-stage">
              <span className="logo-halo" />
              <Image alt="Berea" className="hero-logo" height={260} priority src="/logo.png" width={320} />
            </div>
            <p className="brand-kicker">Berea</p>
            <h1>Quiz bíblico</h1>
            <p>Escudriñando las Escrituras cada día.</p>
            <button className="primary-button" onClick={() => setScreen("setup")}>
              Comenzar
            </button>
          </section>
        )}

        {screen === "setup" && (
          <section className="card setup-card">
            <div className="section-heading">
              <h1>Configurar ronda</h1>
              <button className="icon-button" onClick={resetFilters} title="Limpiar filtros">
                <RotateCcw size={18} />
              </button>
            </div>

            <label className="field">
              Libro
              <select value={bookFilter} onChange={(event) => setBookFilter(event.target.value)}>
                {BOOKS.map((book) => (
                  <option key={book} value={book}>
                    {book}
                  </option>
                ))}
              </select>
            </label>

            <div className="field">
              <span>Dificultad</span>
              <div className="chips">
                {[ALL_FILTER, ...difficulties].map((difficulty) => (
                  <button
                    className={difficultyFilter === difficulty ? "chip active" : "chip"}
                    key={difficulty}
                    onClick={() => setDifficultyFilter(difficulty)}
                  >
                    {difficulty}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span>Categoría</span>
              <div className="chips">
                {[ALL_FILTER, ...categories].map((category) => (
                  <button
                    className={categoryFilter === category ? "chip active" : "chip"}
                    key={category}
                    onClick={() => setCategoryFilter(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="summary-box">
              <p>Libro: {bookFilter}</p>
              <p>Preguntas disponibles: {filteredQuestions.length}</p>
              <p>La ronda continúa hasta agotar las preguntas seleccionadas.</p>
            </div>

            <button className="primary-button" disabled={filteredQuestions.length === 0} onClick={startRound}>
              Iniciar
            </button>
          </section>
        )}

        {screen === "quiz" && (
          <section className="card quiz-card">
            {roundFinished || !current ? (
              <div className="finish-block">
                <h1>Ronda terminada</h1>
                <p>Completaste las preguntas seleccionadas.</p>
                <div className="button-row">
                  <button className="secondary-button" onClick={() => setScreen("setup")}>
                    Configurar
                  </button>
                  <button className="primary-button" onClick={startRound}>
                    Iniciar de nuevo
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="meta">
                  Pregunta {currentIndex + 1} de {roundQuestions.length} · {current.category} · {current.difficulty}
                </p>
                <h1 className="question-title">{current.prompt}</h1>
                <div className="options-grid">
                  {current.options.map((option) => {
                    const isCorrect = selected && option === current.answer;
                    const isWrong = selected === option && option !== current.answer;
                    return (
                      <button
                        className={`option-button ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
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
                  <div className="modal-backdrop" role="dialog" aria-modal="true">
                    <div className="feedback-modal">
                      <p className={selected === current.answer ? "result ok" : "result bad"}>
                        {selected === current.answer
                          ? "Correcto."
                          : `Incorrecto. Respuesta correcta: ${current.answer}.`}
                      </p>
                      <div className="modal-copy">
                        <h2>Contexto</h2>
                        <p>{current.context}</p>
                        <h2>Explicación</h2>
                        <p>{current.explanation}</p>
                        <p className="reference">Referencia: {current.reference}</p>
                        <p>
                          Esta pregunta: {getStat(stats, current.id).correct}/{getStat(stats, current.id).attempts}{" "}
                          aciertos.
                        </p>
                      </div>
                      <button className="primary-button" onClick={nextQuestion}>
                        {currentIndex + 1 >= roundQuestions.length ? "Finalizar" : "Siguiente"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {screen === "stats" && (
          <section className="card stats-card">
            <div className="section-heading">
              <h1>Estadísticas</h1>
              <button className="secondary-button compact" onClick={clearStats}>
                Reiniciar
              </button>
            </div>
            <div className="summary-box">
              <p>Acierto general: {percent(totalCorrect, totalAttempts)}%</p>
              <p>
                Preguntas acertadas al menos una vez: {masteredTotal}/{questions.length}
              </p>
              <p>Intentos registrados: {totalAttempts}</p>
            </div>
            <StatGroup questions={questions} stats={stats} title="Por dificultad" values={difficulties} />
            <StatGroup questions={questions} stats={stats} title="Por categoría" values={categories} />
            <button className="primary-button" onClick={() => setScreen("setup")}>
              Configurar ronda
            </button>
          </section>
        )}
      </section>
    </main>
  );
}

function StatGroup({
  questions,
  stats,
  title,
  values,
}: {
  questions: Question[];
  stats: StoredStats;
  title: string;
  values: string[];
}) {
  return (
    <section className="stat-group">
      <h2>{title}</h2>
      {values.map((value) => {
        const groupQuestions = questions.filter((question) =>
          title === "Por dificultad" ? question.difficulty === value : question.category === value,
        );
        const attempts = groupQuestions.reduce((sum, question) => sum + getStat(stats, question.id).attempts, 0);
        const correct = groupQuestions.reduce((sum, question) => sum + getStat(stats, question.id).correct, 0);
        const mastered = groupQuestions.filter((question) => getStat(stats, question.id).correct > 0).length;
        return (
          <div className="stat-line" key={value}>
            <strong>{value}</strong>
            <span>
              {percent(correct, attempts)}% · {mastered}/{groupQuestions.length} acertadas · faltan{" "}
              {groupQuestions.length - mastered}
            </span>
          </div>
        );
      })}
    </section>
  );
}
