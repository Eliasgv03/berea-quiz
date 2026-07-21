import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import logo from "./assets/logo1.png";
import eventos from "./src/data/genesis/eventos.json";
import lugares from "./src/data/genesis/lugares.json";
import memoria from "./src/data/genesis/memoria.json";
import personas from "./src/data/genesis/personas.json";
import teologia from "./src/data/genesis/teologia.json";

type Difficulty = "fácil" | "media" | "difícil";
type Screen = "home" | "setup" | "quiz" | "stats";
type ThemeName = "light" | "dark";

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

const QUESTIONS = [
  ...(eventos as Question[]),
  ...(lugares as Question[]),
  ...(memoria as Question[]),
  ...(personas as Question[]),
  ...(teologia as Question[]),
].sort((a, b) => a.id - b.id);
const ALL_FILTER = "todas";
const BOOKS = ["Génesis"];
const STORAGE_KEY = "berea-question-stats-v2";

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function prepareRound(questions: Question[]) {
  return shuffle(questions).map((question) => ({
    ...question,
    options: shuffle(question.options),
  }));
}

function percent(correct: number, total: number) {
  if (!total) return 0;
  return Math.round((correct / total) * 100);
}

function getStat(stats: StoredStats, id: number) {
  return stats[String(id)] ?? { attempts: 0, correct: 0 };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [themeName, setThemeName] = useState<ThemeName>("light");
  const [bookFilter] = useState(BOOKS[0]);
  const [difficultyFilter, setDifficultyFilter] = useState<string>(ALL_FILTER);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_FILTER);
  const [roundQuestions, setRoundQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [roundFinished, setRoundFinished] = useState(false);
  const [stats, setStats] = useState<StoredStats>({});

  const theme = themeName === "light" ? lightTheme : darkTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const current = roundQuestions[currentIndex];

  const categories = useMemo(() => {
    return Array.from(new Set(QUESTIONS.map((question) => question.category))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, []);

  const difficulties: Difficulty[] = ["fácil", "media", "difícil"];

  const filteredQuestions = useMemo(() => {
    return QUESTIONS.filter((question) => {
      const difficultyMatches = difficultyFilter === ALL_FILTER || question.difficulty === difficultyFilter;
      const categoryMatches = categoryFilter === ALL_FILTER || question.category === categoryFilter;
      return difficultyMatches && categoryMatches;
    });
  }, [categoryFilter, difficultyFilter]);

  const totalAttempts = useMemo(() => {
    return Object.values(stats).reduce((sum, item) => sum + item.attempts, 0);
  }, [stats]);

  const totalCorrect = useMemo(() => {
    return Object.values(stats).reduce((sum, item) => sum + item.correct, 0);
  }, [stats]);

  const masteredTotal = useMemo(() => {
    return QUESTIONS.filter((question) => getStat(stats, question.id).correct > 0).length;
  }, [stats]);

  useEffect(() => {
    async function loadStats() {
      const rawStats = await AsyncStorage.getItem(STORAGE_KEY);
      if (rawStats) {
        setStats(JSON.parse(rawStats) as StoredStats);
      }
    }
    loadStats();
  }, []);

  async function recordAnswer(question: Question, isCorrect: boolean) {
    const key = String(question.id);
    const previous = stats[key] ?? { attempts: 0, correct: 0 };
    const nextStats = {
      ...stats,
      [key]: {
        attempts: previous.attempts + 1,
        correct: previous.correct + (isCorrect ? 1 : 0),
      },
    };
    setStats(nextStats);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextStats));
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

  function resetSetup() {
    setDifficultyFilter(ALL_FILTER);
    setCategoryFilter(ALL_FILTER);
  }

  async function clearStats() {
    setStats({});
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  function TopBar() {
    return (
      <View style={styles.topBar}>
        <Text style={styles.topBrand}>Berea</Text>
        <View style={styles.topActions}>
          <Pressable onPress={() => setThemeName(themeName === "light" ? "dark" : "light")} style={styles.topButton}>
            <Text style={styles.topButtonText}>{themeName === "light" ? "Oscuro" : "Claro"}</Text>
          </Pressable>
          <Pressable onPress={() => setScreen("stats")} style={styles.topButton}>
            <Text style={styles.topButtonText}>Estadísticas</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function HomeScreen() {
    return (
      <View style={styles.hero}>
        <Image source={logo} style={styles.heroLogo} resizeMode="contain" />
        <Text style={styles.heroBrand}>Berea</Text>
        <Text style={styles.heroTitle}>Quiz bíblico de Génesis</Text>
        <Text style={styles.heroText}>Practica por categoría y dificultad, revisa cada explicación y mide tu avance.</Text>
        <Pressable onPress={() => setScreen("setup")} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Comenzar</Text>
        </Pressable>
      </View>
    );
  }

  function SetupScreen() {
    return (
      <View style={styles.card}>
        <Text style={styles.screenTitle}>Configurar ronda</Text>
        <Text style={styles.label}>Libro</Text>
        <View style={styles.chips}>
          {BOOKS.map((book) => (
            <View key={book} style={[styles.chip, styles.chipActive]}>
              <Text style={[styles.chipText, styles.chipTextActive]}>{book}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.label}>Dificultad</Text>
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

        <Text style={styles.label}>Categoría</Text>
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

        <View style={styles.summaryBox}>
          <Text style={styles.summaryText}>Libro: {bookFilter}</Text>
          <Text style={styles.summaryText}>Preguntas disponibles: {filteredQuestions.length}</Text>
          <Text style={styles.summaryText}>La ronda continúa hasta agotar las preguntas seleccionadas.</Text>
        </View>

        <View style={styles.buttonRow}>
          <Pressable onPress={resetSetup} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Limpiar filtros</Text>
          </Pressable>
          <Pressable
            disabled={filteredQuestions.length === 0}
            onPress={startRound}
            style={[styles.primaryButton, filteredQuestions.length === 0 && styles.disabledButton]}
          >
            <Text style={styles.primaryButtonText}>Iniciar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function QuizScreen() {
    if (roundFinished || !current) {
      return (
        <View style={styles.card}>
          <Text style={styles.screenTitle}>Ronda terminada</Text>
          <Text style={styles.bodyText}>Completaste las preguntas seleccionadas.</Text>
          <View style={styles.buttonRow}>
            <Pressable onPress={() => setScreen("setup")} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Configurar</Text>
            </Pressable>
            <Pressable onPress={startRound} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Iniciar de nuevo</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    const currentStat = getStat(stats, current.id);
    return (
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
            <Text style={styles.bodyText}>
              Esta pregunta: {currentStat.correct}/{currentStat.attempts} aciertos.
            </Text>
            <Pressable onPress={nextQuestion} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>
                {currentIndex + 1 >= roundQuestions.length ? "Finalizar" : "Siguiente"}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  function StatGroup({ title, values }: { title: string; values: string[] }) {
    return (
      <View style={styles.statGroup}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {values.map((value) => {
          const groupQuestions = QUESTIONS.filter((question) =>
            title === "Por dificultad" ? question.difficulty === value : question.category === value,
          );
          const attempts = groupQuestions.reduce((sum, question) => sum + getStat(stats, question.id).attempts, 0);
          const correct = groupQuestions.reduce((sum, question) => sum + getStat(stats, question.id).correct, 0);
          const mastered = groupQuestions.filter((question) => getStat(stats, question.id).correct > 0).length;
          return (
            <View key={value} style={styles.statLine}>
              <Text style={styles.statName}>{value}</Text>
              <Text style={styles.bodyText}>
                {percent(correct, attempts)}% · {mastered}/{groupQuestions.length} acertadas · faltan{" "}
                {groupQuestions.length - mastered}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  function StatsScreen() {
    return (
      <View style={styles.card}>
        <Text style={styles.screenTitle}>Estadísticas</Text>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryText}>Acierto general: {percent(totalCorrect, totalAttempts)}%</Text>
          <Text style={styles.summaryText}>
            Preguntas acertadas al menos una vez: {masteredTotal}/{QUESTIONS.length}
          </Text>
          <Text style={styles.summaryText}>Intentos registrados: {totalAttempts}</Text>
        </View>
        <StatGroup title="Por dificultad" values={difficulties} />
        <StatGroup title="Por categoría" values={categories} />
        <View style={styles.buttonRow}>
          <Pressable onPress={() => setScreen("setup")} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Configurar</Text>
          </Pressable>
          <Pressable onPress={clearStats} style={styles.dangerButton}>
            <Text style={styles.dangerButtonText}>Reiniciar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={themeName === "light" ? "dark" : "light"} />
      <TopBar />
      <ScrollView contentContainerStyle={styles.container}>
        {screen === "home" && <HomeScreen />}
        {screen === "setup" && <SetupScreen />}
        {screen === "quiz" && <QuizScreen />}
        {screen === "stats" && <StatsScreen />}
      </ScrollView>
    </SafeAreaView>
  );
}

const lightTheme = {
  bg: "#f4f7f5",
  panel: "#ffffff",
  panelSoft: "#edf3ef",
  ink: "#18231d",
  muted: "#5f6d64",
  line: "#d9e2dc",
  accent: "#236c52",
  accentStrong: "#174d3a",
  danger: "#b3261e",
  success: "#177245",
  wrongBg: "#fbeceb",
  correctBg: "#e8f6ee",
};

const darkTheme = {
  bg: "#101512",
  panel: "#17211b",
  panelSoft: "#202d25",
  ink: "#edf3ef",
  muted: "#a8b7ad",
  line: "#334239",
  accent: "#72b99b",
  accentStrong: "#9ed9c0",
  danger: "#ff9b91",
  success: "#8be0af",
  wrongBg: "#3b201f",
  correctBg: "#173528",
};

function createStyles(theme: typeof lightTheme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    topBar: {
      alignItems: "center",
      backgroundColor: theme.panel,
      borderBottomColor: theme.line,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    topBrand: {
      color: theme.ink,
      fontSize: 18,
      fontWeight: "900",
    },
    topActions: {
      flexDirection: "row",
      gap: 8,
    },
    topButton: {
      borderColor: theme.line,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    topButtonText: {
      color: theme.ink,
      fontWeight: "800",
    },
    container: {
      gap: 16,
      padding: 18,
    },
    hero: {
      alignItems: "center",
      gap: 10,
      paddingVertical: 28,
    },
    heroLogo: {
      height: 190,
      width: 240,
    },
    heroBrand: {
      color: theme.accent,
      fontSize: 18,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    heroTitle: {
      color: theme.ink,
      fontSize: 31,
      fontWeight: "900",
      textAlign: "center",
    },
    heroText: {
      color: theme.muted,
      fontSize: 16,
      lineHeight: 23,
      maxWidth: 320,
      textAlign: "center",
    },
    card: {
      backgroundColor: theme.panel,
      borderColor: theme.line,
      borderRadius: 8,
      borderWidth: 1,
      gap: 14,
      padding: 16,
    },
    screenTitle: {
      color: theme.ink,
      fontSize: 24,
      fontWeight: "900",
    },
    label: {
      color: theme.muted,
      fontSize: 13,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      borderColor: theme.line,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    chipActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    chipText: {
      color: theme.ink,
      textTransform: "capitalize",
    },
    chipTextActive: {
      color: themeNameSafeText(theme),
      fontWeight: "900",
    },
    summaryBox: {
      backgroundColor: theme.panelSoft,
      borderRadius: 8,
      gap: 5,
      padding: 12,
    },
    summaryText: {
      color: theme.muted,
      fontSize: 15,
      lineHeight: 21,
    },
    buttonRow: {
      flexDirection: "row",
      gap: 10,
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.accent,
      borderRadius: 8,
      flex: 1,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: 14,
    },
    primaryButtonText: {
      color: themeNameSafeText(theme),
      fontWeight: "900",
    },
    secondaryButton: {
      alignItems: "center",
      borderColor: theme.line,
      borderRadius: 8,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: 14,
    },
    secondaryButtonText: {
      color: theme.ink,
      fontWeight: "900",
    },
    dangerButton: {
      alignItems: "center",
      borderColor: theme.danger,
      borderRadius: 8,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: 14,
    },
    dangerButtonText: {
      color: theme.danger,
      fontWeight: "900",
    },
    disabledButton: {
      opacity: 0.45,
    },
    meta: {
      color: theme.muted,
      fontSize: 13,
      textTransform: "capitalize",
    },
    prompt: {
      color: theme.ink,
      fontSize: 22,
      fontWeight: "900",
      lineHeight: 29,
    },
    options: {
      gap: 10,
    },
    option: {
      borderColor: theme.line,
      borderRadius: 8,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 58,
      padding: 14,
    },
    optionText: {
      color: theme.ink,
      fontSize: 16,
    },
    correct: {
      backgroundColor: theme.correctBg,
      borderColor: theme.success,
    },
    wrong: {
      backgroundColor: theme.wrongBg,
      borderColor: theme.danger,
    },
    feedback: {
      backgroundColor: theme.panelSoft,
      borderRadius: 8,
      gap: 8,
      padding: 14,
    },
    result: {
      fontWeight: "900",
    },
    resultOk: {
      color: theme.success,
    },
    resultBad: {
      color: theme.danger,
    },
    sectionTitle: {
      color: theme.ink,
      fontSize: 16,
      fontWeight: "900",
    },
    bodyText: {
      color: theme.muted,
      fontSize: 15,
      lineHeight: 22,
    },
    reference: {
      color: theme.accent,
      fontWeight: "900",
    },
    statGroup: {
      gap: 8,
    },
    statLine: {
      borderTopColor: theme.line,
      borderTopWidth: 1,
      gap: 3,
      paddingTop: 10,
    },
    statName: {
      color: theme.ink,
      fontWeight: "900",
      textTransform: "capitalize",
    },
  });
}

function themeNameSafeText(theme: typeof lightTheme) {
  return theme.bg === "#101512" ? "#101512" : "#ffffff";
}
