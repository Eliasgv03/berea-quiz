import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import questionsData from "./src/data/questions.json";
import logo from "./assets/logo1.png";

type Difficulty = "fácil" | "media" | "difícil";

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

type PlayerStats = {
  name: string;
  games: number;
  bestScore: number;
  totalCorrect: number;
  totalAnswered: number;
  lastPlayedAt: string;
};

const QUESTIONS = questionsData as Question[];
const STARTING_LIVES = 3;
const ALL_FILTER = "todas";
const STORAGE_KEY = "genesis-quiz-stats-v1";

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function prepareRound(questions: Question[]) {
  return shuffle(questions).map((question) => ({
    ...question,
    options: shuffle(question.options),
  }));
}

function pointsFor(difficulty: Difficulty) {
  if (difficulty === "difícil") return 140;
  if (difficulty === "media") return 100;
  return 70;
}

export default function App() {
  const [difficultyFilter, setDifficultyFilter] = useState<string>(ALL_FILTER);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_FILTER);
  const [roundQuestions, setRoundQuestions] = useState<Question[]>(() => prepareRound(QUESTIONS));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const [playerName, setPlayerName] = useState("Jugador");
  const [stats, setStats] = useState<PlayerStats[]>([]);

  const current = roundQuestions[currentIndex];

  const filteredQuestions = useMemo(() => {
    return QUESTIONS.filter((question) => {
      const difficultyMatches = difficultyFilter === ALL_FILTER || question.difficulty === difficultyFilter;
      const categoryMatches = categoryFilter === ALL_FILTER || question.category === categoryFilter;
      return difficultyMatches && categoryMatches;
    });
  }, [categoryFilter, difficultyFilter]);

  const difficulties = useMemo(() => {
    return Array.from(new Set(QUESTIONS.map((question) => question.difficulty))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, []);

  const categories = useMemo(() => {
    return Array.from(new Set(QUESTIONS.map((question) => question.category))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, []);

  useEffect(() => {
    async function loadStats() {
      const rawStats = await AsyncStorage.getItem(STORAGE_KEY);
      if (rawStats) {
        setStats(JSON.parse(rawStats) as PlayerStats[]);
      }
    }
    loadStats();
  }, []);

  function startRound(source = filteredQuestions) {
    setRoundQuestions(prepareRound(source));
    setCurrentIndex(0);
    setSelected(null);
    setLives(STARTING_LIVES);
    setScore(0);
    setCorrect(0);
    setFinished(false);
  }

  function answer(option: string) {
    if (!current || selected || finished) return;

    setSelected(option);
    if (option === current.answer) {
      setCorrect((value) => value + 1);
      setScore((value) => value + pointsFor(current.difficulty));
      return;
    }
    setLives((value) => value - 1);
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

  async function saveStats() {
    const cleanName = playerName.trim() || "Jugador";
    const existing = stats.find((entry) => entry.name.toLowerCase() === cleanName.toLowerCase());
    const nextEntry: PlayerStats = {
      name: cleanName,
      games: (existing?.games ?? 0) + 1,
      bestScore: Math.max(existing?.bestScore ?? 0, score),
      totalCorrect: (existing?.totalCorrect ?? 0) + correct,
      totalAnswered: (existing?.totalAnswered ?? 0) + roundQuestions.length,
      lastPlayedAt: new Date().toISOString(),
    };
    const nextStats = [nextEntry, ...stats.filter((entry) => entry.name.toLowerCase() !== cleanName.toLowerCase())]
      .sort((a, b) => b.bestScore - a.bestScore)
      .slice(0, 20);
    setStats(nextStats);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextStats));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.eyebrow}>Berea</Text>
          <Text style={styles.title}>Quiz bíblico de Génesis</Text>
          <Text style={styles.subtitle}>Estudia, responde y guarda tu progreso.</Text>
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.stat}>{score} pts</Text>
          <Text style={styles.stat}>{correct}/{roundQuestions.length}</Text>
          <Text style={styles.stat}>{lives} vidas</Text>
        </View>

        <View style={styles.filters}>
          <Text style={styles.filterTitle}>Dificultad</Text>
          <View style={styles.chips}>
            {[ALL_FILTER, ...difficulties].map((difficulty) => (
              <Pressable
                key={difficulty}
                onPress={() => setDifficultyFilter(difficulty)}
                style={[styles.chip, difficultyFilter === difficulty && styles.chipActive]}
              >
                <Text style={[styles.chipText, difficultyFilter === difficulty && styles.chipTextActive]}>
                  {difficulty}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.filterTitle}>Categoría</Text>
          <View style={styles.chips}>
            {[ALL_FILTER, ...categories].map((category) => (
              <Pressable
                key={category}
                onPress={() => setCategoryFilter(category)}
                style={[styles.chip, categoryFilter === category && styles.chipActive]}
              >
                <Text style={[styles.chipText, categoryFilter === category && styles.chipTextActive]}>
                  {category}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            disabled={filteredQuestions.length === 0}
            onPress={() => startRound(filteredQuestions)}
            style={[styles.primaryButton, filteredQuestions.length === 0 && styles.disabledButton]}
          >
            <Text style={styles.primaryButtonText}>Nueva ronda ({filteredQuestions.length})</Text>
          </Pressable>
        </View>

        {!finished && current ? (
          <View style={styles.card}>
            <Text style={styles.meta}>
              Pregunta {currentIndex + 1} de {roundQuestions.length} · {current.category} · {current.difficulty}
            </Text>
            <Text style={styles.prompt}>{current.prompt}</Text>
            <View style={styles.options}>
              {current.options.map((option) => {
                const isCorrect = selected && option === current.answer;
                const isWrong = selected === option && option !== current.answer;
                return (
                  <Pressable
                    disabled={Boolean(selected)}
                    key={option}
                    onPress={() => answer(option)}
                    style={[styles.option, isCorrect && styles.correct, isWrong && styles.wrong]}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
            {selected && (
              <View style={styles.feedback}>
                <Text style={[styles.result, selected === current.answer ? styles.resultOk : styles.resultBad]}>
                  {selected === current.answer ? "Correcto." : `Incorrecto. Respuesta correcta: ${current.answer}.`}
                </Text>
                <Text style={styles.sectionTitle}>Contexto</Text>
                <Text style={styles.bodyText}>{current.context}</Text>
                <Text style={styles.sectionTitle}>Explicación</Text>
                <Text style={styles.bodyText}>{current.explanation}</Text>
                <Text style={styles.reference}>Referencia: {current.reference}</Text>
                <Pressable onPress={nextQuestion} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>
                    {lives <= 0 || currentIndex + 1 >= roundQuestions.length ? "Finalizar" : "Siguiente"}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.prompt}>Ronda terminada</Text>
            <Text style={styles.bodyText}>
              Lograste {score} puntos con {correct} respuestas correctas de {roundQuestions.length}.
            </Text>
            <TextInput
              maxLength={24}
              onChangeText={setPlayerName}
              placeholder="Nombre del jugador"
              style={styles.input}
              value={playerName}
            />
            <Pressable onPress={saveStats} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Guardar estadísticas</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Estadísticas locales</Text>
          {stats.length === 0 ? (
            <Text style={styles.bodyText}>Todavía no hay partidas guardadas.</Text>
          ) : (
            stats.map((entry) => (
              <View key={entry.name} style={styles.statLine}>
                <Text style={styles.statName}>{entry.name}</Text>
                <Text style={styles.bodyText}>
                  Mejor: {entry.bestScore} · Partidas: {entry.games} · Aciertos: {entry.totalCorrect}/
                  {entry.totalAnswered}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f7f5",
  },
  container: {
    gap: 16,
    padding: 18,
  },
  header: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
  },
  logo: {
    height: 132,
    width: 180,
  },
  eyebrow: {
    color: "#236c52",
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: "#18231d",
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: "#5f6d64",
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 300,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  stat: {
    flex: 1,
    borderColor: "#d9e2dc",
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#edf3ef",
    color: "#18231d",
    padding: 12,
    textAlign: "center",
    fontWeight: "800",
  },
  filters: {
    borderColor: "#d9e2dc",
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#ffffff",
    gap: 10,
    padding: 14,
  },
  filterTitle: {
    color: "#5f6d64",
    fontSize: 13,
    fontWeight: "800",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderColor: "#d9e2dc",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: "#236c52",
    borderColor: "#236c52",
  },
  chipText: {
    color: "#18231d",
    textTransform: "capitalize",
  },
  chipTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  card: {
    borderColor: "#d9e2dc",
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#ffffff",
    gap: 14,
    padding: 16,
  },
  meta: {
    color: "#5f6d64",
    fontSize: 13,
    textTransform: "capitalize",
  },
  prompt: {
    color: "#18231d",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  options: {
    gap: 10,
  },
  option: {
    borderColor: "#d9e2dc",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 58,
    justifyContent: "center",
    padding: 14,
  },
  correct: {
    backgroundColor: "#e8f6ee",
    borderColor: "#177245",
  },
  wrong: {
    backgroundColor: "#fbeceb",
    borderColor: "#b3261e",
  },
  optionText: {
    color: "#18231d",
    fontSize: 16,
  },
  feedback: {
    backgroundColor: "#edf3ef",
    borderRadius: 8,
    gap: 8,
    padding: 14,
  },
  result: {
    fontWeight: "900",
  },
  resultOk: {
    color: "#177245",
  },
  resultBad: {
    color: "#b3261e",
  },
  sectionTitle: {
    color: "#18231d",
    fontSize: 16,
    fontWeight: "900",
  },
  bodyText: {
    color: "#5f6d64",
    fontSize: 15,
    lineHeight: 22,
  },
  reference: {
    color: "#236c52",
    fontWeight: "800",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#236c52",
    borderRadius: 8,
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  disabledButton: {
    backgroundColor: "#5f6d64",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  input: {
    borderColor: "#d9e2dc",
    borderRadius: 8,
    borderWidth: 1,
    color: "#18231d",
    minHeight: 46,
    paddingHorizontal: 12,
  },
  statLine: {
    borderTopColor: "#d9e2dc",
    borderTopWidth: 1,
    gap: 3,
    paddingTop: 10,
  },
  statName: {
    color: "#18231d",
    fontWeight: "900",
  },
});
