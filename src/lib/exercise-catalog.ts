import type { Exercise } from "@/types";

function item(
  id: string,
  name: string,
  muscleGroup: string,
  equipment: string,
  level: Exercise["level"] = "Iniciante"
): Exercise {
  return { id, name, muscleGroup, equipment, level, isCustom: false, createdAt: "", updatedAt: "" };
}

/** Catálogo compartilhado: IDs precisam permanecer estáveis para os treinos salvos. */
export const EXERCISE_CATALOG: Exercise[] = [
  item("catalog-agachamento", "Agachamento", "Pernas e glúteos", "Peso corporal ou barra", "Iniciante"),
  item("catalog-flexao", "Flexão de braço", "Peito", "Peso corporal", "Iniciante"),
  item("catalog-remada", "Remada unilateral", "Costas", "Halteres", "Intermediário"),
  item("catalog-ponte", "Ponte de glúteos", "Glúteos", "Peso corporal", "Iniciante"),
  item("catalog-prancha", "Prancha", "Core", "Peso corporal", "Iniciante"),
  item("catalog-desenvolvimento", "Desenvolvimento de ombros", "Ombros", "Halteres", "Intermediário"),
  item("catalog-mobilidade-quadril", "Mobilidade de quadril", "Mobilidade", "Sem equipamento", "Iniciante"),

  item("catalog-supino-reto", "Supino reto", "Peito", "Barra", "Intermediário"),
  item("catalog-supino-halteres", "Supino reto com halteres", "Peito", "Halteres", "Iniciante"),
  item("catalog-supino-inclinado", "Supino inclinado", "Peito", "Halteres", "Intermediário"),
  item("catalog-crucifixo", "Crucifixo com halteres", "Peito", "Halteres", "Iniciante"),
  item("catalog-crossover", "Crossover", "Peito", "Cabo/Polia", "Intermediário"),
  item("catalog-chest-press", "Chest press", "Peito", "Máquina", "Iniciante"),
  item("catalog-pullover", "Pullover", "Peito e costas", "Halteres", "Intermediário"),

  item("catalog-puxada-frontal", "Puxada frontal", "Costas", "Máquina", "Iniciante"),
  item("catalog-remada-curvada", "Remada curvada", "Costas", "Barra", "Intermediário"),
  item("catalog-remada-baixa", "Remada baixa", "Costas", "Cabo/Polia", "Iniciante"),
  item("catalog-barra-fixa", "Barra fixa", "Costas", "Peso corporal", "Avançado"),
  item("catalog-face-pull", "Face pull", "Costas e ombros", "Cabo/Polia", "Iniciante"),
  item("catalog-pulldown", "Pulldown com braços estendidos", "Costas", "Cabo/Polia", "Intermediário"),

  item("catalog-rosca-direta", "Rosca direta", "Bíceps", "Barra", "Iniciante"),
  item("catalog-rosca-alternada", "Rosca alternada", "Bíceps", "Halteres", "Iniciante"),
  item("catalog-rosca-martelo", "Rosca martelo", "Bíceps", "Halteres", "Iniciante"),
  item("catalog-rosca-scott", "Rosca Scott", "Bíceps", "Máquina", "Intermediário"),
  item("catalog-rosca-concentrada", "Rosca concentrada", "Bíceps", "Halteres", "Intermediário"),

  item("catalog-triceps-corda", "Tríceps na corda", "Tríceps", "Cabo/Polia", "Iniciante"),
  item("catalog-triceps-testa", "Tríceps testa", "Tríceps", "Barra", "Intermediário"),
  item("catalog-mergulho-banco", "Mergulho no banco", "Tríceps", "Banco", "Iniciante"),
  item("catalog-triceps-frances", "Tríceps francês", "Tríceps", "Halteres", "Intermediário"),
  item("catalog-coice-triceps", "Coice de tríceps", "Tríceps", "Halteres", "Iniciante"),

  item("catalog-elevacao-lateral", "Elevação lateral", "Ombros", "Halteres", "Iniciante"),
  item("catalog-desenvolvimento-arnold", "Desenvolvimento Arnold", "Ombros", "Halteres", "Intermediário"),
  item("catalog-elevacao-frontal", "Elevação frontal", "Ombros", "Halteres", "Iniciante"),
  item("catalog-elevacao-lateral-polia", "Elevação lateral unilateral", "Ombros", "Cabo/Polia", "Intermediário"),

  item("catalog-hip-thrust", "Hip thrust", "Glúteos", "Barra", "Intermediário"),
  item("catalog-abducao-elastico", "Abdução de quadril", "Glúteos", "Elástico", "Iniciante"),
  item("catalog-coice-polia", "Coice de glúteo", "Glúteos", "Cabo/Polia", "Intermediário"),
  item("catalog-passo-lateral", "Passo lateral", "Glúteos", "Elástico", "Iniciante"),
  item("catalog-glute-bridge-marcha", "Ponte unilateral", "Glúteos", "Peso corporal", "Intermediário"),

  item("catalog-leg-press", "Leg press", "Pernas", "Máquina", "Iniciante"),
  item("catalog-stiff", "Stiff", "Pernas e posteriores", "Halteres", "Intermediário"),
  item("catalog-cadeira-extensora", "Cadeira extensora", "Pernas", "Máquina", "Iniciante"),
  item("catalog-mesa-flexora", "Mesa flexora", "Pernas e posteriores", "Máquina", "Iniciante"),
  item("catalog-afundo", "Afundo alternado", "Pernas e glúteos", "Peso corporal", "Iniciante"),
  item("catalog-goblet-squat", "Agachamento goblet", "Pernas", "Kettlebell", "Iniciante"),
  item("catalog-panturrilha", "Elevação de panturrilha", "Pernas", "Peso corporal", "Iniciante"),

  item("catalog-dead-bug", "Dead bug", "Core", "Peso corporal", "Iniciante"),
  item("catalog-bird-dog", "Bird-dog", "Core", "Peso corporal", "Iniciante"),
  item("catalog-crunch-polia", "Abdominal na polia", "Core", "Cabo/Polia", "Intermediário"),
  item("catalog-pallof-press", "Pallof press", "Core", "Cabo/Polia", "Iniciante"),
  item("catalog-prancha-lateral", "Prancha lateral", "Core", "Peso corporal", "Intermediário"),

  item("catalog-mobilidade-toracica", "Rotação torácica", "Mobilidade", "Sem equipamento", "Iniciante"),
  item("catalog-alongamento-flexor", "Alongamento do flexor do quadril", "Mobilidade", "Sem equipamento", "Iniciante"),
  item("catalog-kettlebell-swing", "Kettlebell swing", "Corpo todo", "Kettlebell", "Intermediário"),
  item("catalog-burpee", "Burpee", "Corpo todo", "Peso corporal", "Intermediário"),
  item("catalog-mountain-climber", "Mountain climber", "Corpo todo", "Peso corporal", "Iniciante"),
];

export const EXERCISE_EQUIPMENT = Array.from(
  new Set(EXERCISE_CATALOG.map((exercise) => exercise.equipment ?? "Sem equipamento"))
).sort((a, b) => a.localeCompare(b, "pt-BR"));
