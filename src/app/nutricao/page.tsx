"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconChevron, IconLibrary, IconNutrition } from "@/components/Icons";
import { SHOP_PRODUCTS } from "@/lib/content";
import { formatBRL } from "@/lib/data";

const WEEK_DAYS = [
  { id: "seg", label: "Segunda" },
  { id: "ter", label: "Terça" },
  { id: "qua", label: "Quarta" },
  { id: "qui", label: "Quinta" },
  { id: "sex", label: "Sexta" },
  { id: "sab", label: "Sábado" },
  { id: "dom", label: "Domingo" },
] as const;

type DayId = (typeof WEEK_DAYS)[number]["id"];
type MealField = "cafe" | "almoco" | "lanche" | "jantar";
type DayPlan = Record<MealField, string>;
type MealPlan = Record<DayId, DayPlan>;

const MEAL_FIELDS: Array<{
  id: MealField;
  label: string;
  placeholder: string;
}> = [
  { id: "cafe", label: "Café da manhã", placeholder: "Uma ideia para começar o dia" },
  { id: "almoco", label: "Almoço", placeholder: "Prato ou preparação que você gosta" },
  { id: "lanche", label: "Lanche (opcional)", placeholder: "Fruta, preparação ou outra ideia" },
  { id: "jantar", label: "Jantar", placeholder: "Uma opção prática para a noite" },
];

const STORAGE_KEY = "treino-plus-nutrition-meal-plan-v1";

function createEmptyPlan(): MealPlan {
  return Object.fromEntries(
    WEEK_DAYS.map(({ id }) => [
      id,
      { cafe: "", almoco: "", lanche: "", jantar: "" },
    ]),
  ) as MealPlan;
}

function normalizePlan(value: unknown): MealPlan {
  const plan = createEmptyPlan();
  if (!value || typeof value !== "object") return plan;

  const saved = value as Record<string, unknown>;
  for (const day of WEEK_DAYS) {
    const savedDay = saved[day.id];
    if (!savedDay || typeof savedDay !== "object") continue;
    const fields = savedDay as Record<string, unknown>;
    for (const field of MEAL_FIELDS) {
      if (typeof fields[field.id] === "string") {
        plan[day.id][field.id] = fields[field.id] as string;
      }
    }
  }
  return plan;
}

const tips = [
  {
    number: "01",
    title: "Prefira o simples sempre que possível",
    text: "Use alimentos in natura ou minimamente processados como base e varie as preparações de acordo com sua rotina e cultura alimentar.",
  },
  {
    number: "02",
    title: "Planeje com o que você já gosta",
    text: "Anote pratos que costuma preparar, confira o que já tem em casa e faça uma lista de compras antes da semana começar.",
  },
  {
    number: "03",
    title: "Ganhe tempo com preparações-base",
    text: "Quando for conveniente, prepare alguns ingredientes com antecedência e combine-os de maneiras diferentes ao longo da semana.",
  },
  {
    number: "04",
    title: "Coma com atenção",
    text: "Sempre que possível, reserve um momento tranquilo para as refeições e aproveite os sabores, sem transformar a alimentação em uma regra rígida.",
  },
];

const planningSteps = [
  "Olhe sua agenda e identifique os dias em que terá menos tempo.",
  "Escolha preparações que você gosta e que cabem no seu orçamento.",
  "Pense em ingredientes que podem aparecer em mais de uma refeição.",
  "Confira a despensa e anote apenas o que falta comprar.",
];

export default function NutritionPage() {
  const [selectedDay, setSelectedDay] = useState<DayId>("seg");
  const [mealPlan, setMealPlan] = useState<MealPlan>(() => createEmptyPlan());
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setMealPlan(normalizePlan(JSON.parse(stored)));
    } catch {
      setStorageAvailable(false);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mealPlan));
    } catch {
      setStorageAvailable(false);
    }
  }, [mealPlan, ready]);

  const selectedDayLabel =
    WEEK_DAYS.find((day) => day.id === selectedDay)?.label ?? "Dia selecionado";
  const nutritionProduct = SHOP_PRODUCTS.find((product) => product.id === "shop-ebook");

  function updateMeal(field: MealField, value: string) {
    setMealPlan((current) => ({
      ...current,
      [selectedDay]: { ...current[selectedDay], [field]: value },
    }));
  }

  return (
    <main className="px-4 pb-8 pt-6">
      <header className="mb-5 px-1">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
          Bem-estar no dia a dia
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Nutrição</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Ideias práticas para aprender, escolher e planejar refeições.
        </p>
      </header>

      <section className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-emerald-900 via-emerald-700 to-lime-600 p-5 text-white shadow-lg shadow-emerald-900/10">
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/15 blur-3xl" />
        <div className="relative z-10">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
            <IconNutrition className="h-6 w-6" />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
            Nutrição sem complicar
          </p>
          <h2 className="mt-1 max-w-[18rem] text-2xl font-bold leading-tight tracking-tight">
            Um plano flexível começa pela sua rotina.
          </h2>
          <p className="mt-2 max-w-[19rem] text-sm leading-relaxed text-white/85">
            Encontre dicas gerais, conheça o material disponível e anote ideias para a semana.
          </p>
          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Seções de Nutrição">
            <a href="#dicas" className="shrink-0 rounded-full bg-white/15 px-3 py-2 text-xs font-semibold">Dicas</a>
            <a href="#produtos" className="shrink-0 rounded-full bg-white/15 px-3 py-2 text-xs font-semibold">Produtos</a>
            <a href="#semana" className="shrink-0 rounded-full bg-white/15 px-3 py-2 text-xs font-semibold">Planejar semana</a>
          </nav>
        </div>
      </section>

      <section id="dicas" className="scroll-mt-5 pt-7">
        <div className="mb-3 px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Aprender</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Dicas nutricionais</h2>
        </div>
        <div className="space-y-3">
          {tips.map((tip) => (
            <article key={tip.number} className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xs font-bold text-emerald-800">
                {tip.number}
              </span>
              <div>
                <h3 className="text-sm font-semibold">{tip.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-600">{tip.text}</p>
              </div>
            </article>
          ))}
        </div>
        <a
          href="https://www.gov.br/saude/pt-br/composicao/saps/promocao-da-saude/guias-alimentares"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 px-1 text-xs font-semibold text-emerald-800"
        >
          Ler o Guia Alimentar do Ministério da Saúde <IconChevron className="h-3.5 w-3.5" />
        </a>
        <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-950/80">
          Conteúdo educativo geral, não é prescrição individual. Para necessidades específicas, alergias, gestação ou condições de saúde, procure um nutricionista ou sua equipe de saúde.
        </p>
      </section>

      <section id="produtos" className="scroll-mt-5 pt-7">
        <div className="mb-3 px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Loja</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Produtos de nutrição</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Materiais para apoiar sua jornada, sem promessas milagrosas.
          </p>
        </div>
        {nutritionProduct ? (
          <article className="overflow-hidden rounded-[22px] bg-white shadow-sm ring-1 ring-black/[0.04]">
            <div className="flex items-center gap-4 bg-gradient-to-br from-emerald-900 to-emerald-600 p-5 text-white">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                <IconLibrary className="h-9 w-9" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">Material digital</p>
                <h3 className="mt-1 text-lg font-bold leading-tight">{nutritionProduct.t}</h3>
                <p className="mt-1 text-xs text-white/80">{nutritionProduct.sub}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <span className="text-lg font-bold">{formatBRL(nutritionProduct.priceBRL)}</span>
              <Link href="/loja" className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white">
                Ver na Loja <IconChevron className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>
        ) : (
          <div className="rounded-2xl bg-white p-4 text-sm text-neutral-600 shadow-sm">
            Novos produtos de nutrição poderão aparecer aqui quando forem cadastrados.
          </div>
        )}
        <p className="mt-2 px-1 text-xs leading-relaxed text-neutral-500">
          A compra na Loja deste preview é demonstrativa e ainda não processa pagamentos reais. Outros produtos podem ser adicionados quando catálogo e preços forem definidos.
        </p>
      </section>

      <section id="semana" className="scroll-mt-5 pt-7">
        <div className="mb-3 px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Organização</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Como montar refeições da semana</h2>
          <p className="mt-1 text-sm leading-relaxed text-neutral-500">
            Use estas etapas como ponto de partida e adapte ao seu tempo, orçamento, preferências e cultura alimentar.
          </p>
        </div>
        <div className="space-y-2">
          {planningSteps.map((step, index) => (
            <div key={step} className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/[0.04]">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-900">{index + 1}</span>
              <p className="pt-1 text-sm leading-relaxed text-neutral-700">{step}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-[22px] bg-white shadow-sm ring-1 ring-black/[0.04]">
          <div className="flex items-start justify-between gap-3 border-b border-black/[0.05] p-4">
            <div>
              <h3 className="font-semibold">Meu rascunho da semana</h3>
              <p className="mt-1 text-xs text-neutral-500">
                {ready && storageAvailable
                  ? "Salvo automaticamente neste navegador."
                  : ready
                    ? "O navegador não permitiu salvar este rascunho."
                    : "Carregando seu rascunho…"}
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">Pessoal</span>
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 pt-4 pb-1" role="tablist" aria-label="Escolha um dia">
            {WEEK_DAYS.map((day) => (
              <button
                key={day.id}
                type="button"
                role="tab"
                aria-selected={selectedDay === day.id}
                onClick={() => setSelectedDay(day.id)}
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ${
                  selectedDay === day.id
                    ? "bg-emerald-800 text-white"
                    : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {day.label.slice(0, 3)}
              </button>
            ))}
          </div>
          <div className="p-4 pt-3">
            <p className="mb-3 text-sm font-semibold text-neutral-700">{selectedDayLabel}</p>
            <div className="space-y-3">
              {MEAL_FIELDS.map((field) => (
                <label key={field.id} className="block">
                  <span className="mb-1 block text-xs font-semibold text-neutral-600">{field.label}</span>
                  <textarea
                    value={mealPlan[selectedDay][field.id]}
                    onChange={(event) => updateMeal(field.id, event.target.value)}
                    placeholder={field.placeholder}
                    rows={2}
                    className="w-full resize-y rounded-xl border-0 bg-neutral-50 px-3 py-2.5 text-sm outline-none ring-1 ring-black/[0.05] placeholder:text-neutral-400 focus:ring-2 focus:ring-emerald-700/30"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
        <a
          href="https://bvsms.saude.gov.br/bvs/publicacoes/guia_alimentar_populacao_brasileira_2ed.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 px-1 text-xs font-semibold text-emerald-800"
        >
          Consultar o Guia Alimentar completo <IconChevron className="h-3.5 w-3.5" />
        </a>
      </section>
    </main>
  );
}
