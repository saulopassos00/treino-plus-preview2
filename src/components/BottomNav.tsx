"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconLive,
  IconUser,
  IconDumbbell,
  IconPlan,
  IconNutrition,
  IconBag,
} from "./Icons";

const items = [
  {
    href: "/",
    label: "Início",
    icon: IconHome,
    color: "text-orange-600",
    activeBg: "bg-orange-100",
    indicator: "bg-orange-500",
  },
  {
    href: "/treinos",
    label: "Treinos",
    icon: IconDumbbell,
    color: "text-sky-600",
    activeBg: "bg-sky-100",
    indicator: "bg-sky-500",
  },
  {
    href: "/meu-plano",
    label: "Meu plano",
    icon: IconPlan,
    color: "text-violet-600",
    activeBg: "bg-violet-100",
    indicator: "bg-violet-500",
  },
  {
    href: "/live/free",
    label: "Live",
    icon: IconLive,
    color: "text-rose-600",
    activeBg: "bg-rose-100",
    indicator: "bg-rose-500",
  },
  {
    href: "/nutricao",
    label: "Nutrição",
    icon: IconNutrition,
    color: "text-emerald-600",
    activeBg: "bg-emerald-100",
    indicator: "bg-emerald-500",
  },
  {
    href: "/loja",
    label: "Loja",
    icon: IconBag,
    color: "text-amber-600",
    activeBg: "bg-amber-100",
    indicator: "bg-amber-500",
  },
  {
    href: "/account",
    label: "Perfil",
    icon: IconUser,
    color: "text-indigo-600",
    activeBg: "bg-indigo-100",
    indicator: "bg-indigo-500",
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const hide = pathname?.startsWith("/trainer");

  if (hide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/5 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)] pt-1">
        {items.map(({ href, label, icon: Icon, color, activeBg, indicator }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : href === "/live/free"
                ? pathname?.startsWith("/live")
                : pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`group flex min-w-[3rem] flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[9px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                active ? "" : "hover:bg-neutral-50"
              }`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                active ? activeBg : "bg-transparent group-hover:bg-neutral-50"
              }`}>
                <Icon className={`h-6 w-6 ${color} transition-transform ${
                  active ? "scale-105" : "opacity-90 group-hover:scale-105 group-hover:opacity-100"
                }`} />
              </span>
              <span className={`whitespace-nowrap ${
                active ? "font-semibold text-neutral-900" : "text-neutral-500"
              }`}>{label}</span>
              {active && (
                <span aria-hidden="true" className={`mt-0.5 h-1 w-4 rounded-full ${indicator}`} />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
