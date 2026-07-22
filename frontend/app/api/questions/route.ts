import { NextResponse } from "next/server";
import eventos from "../../data/genesis/eventos.json";
import lugares from "../../data/genesis/lugares.json";
import memoria from "../../data/genesis/memoria.json";
import personas from "../../data/genesis/personas.json";
import teologia from "../../data/genesis/teologia.json";

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

const questions = [
  ...(eventos as Question[]),
  ...(lugares as Question[]),
  ...(memoria as Question[]),
  ...(personas as Question[]),
  ...(teologia as Question[]),
].sort((a, b) => a.id - b.id);

export function GET() {
  return NextResponse.json({
    books: ["Génesis"],
    questions,
  });
}
