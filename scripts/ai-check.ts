// Dev helper: checks the optional Gemini classification against the live API (needs GEMINI_API_KEY in the environment).
import { suggestClassification } from "../src/server/ai/classify";

const slugs = ["elderly", "disability", "education", "food", "medicine", "emergency", "children", "environment", "other"];
const samples = [
  "Buvimga yurak dorisi tugab qoldi, bugun kechqurungacha dorixonadan olib kelish kerak",
  "Нужен репетитор по математике для ребёнка из многодетной семьи",
  "Our street flooded last night, an elderly couple needs help moving furniture out of the basement right now",
];
async function main() {
  for (const s of samples) console.log(JSON.stringify(await suggestClassification(s, slugs)), "←", s.slice(0, 50));
}
main();
