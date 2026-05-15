import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function avatarColor(name: string): string {
  const palette = [
    "bg-indigo-500",
    "bg-violet-500",
    "bg-fuchsia-500",
    "bg-rose-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-sky-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

export function scoreColor(score: number): { ring: string; text: string } {
  if (score >= 85) return { ring: "stroke-emerald-500", text: "text-emerald-600" };
  if (score >= 70) return { ring: "stroke-sky-500", text: "text-sky-600" };
  if (score >= 50) return { ring: "stroke-amber-500", text: "text-amber-600" };
  return { ring: "stroke-zinc-400", text: "text-zinc-500" };
}

export function proficiencyTone(p: string): string {
  switch (p) {
    case "EXPERT":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "INTERMEDIATE":
      return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300";
    case "NOVICE":
      return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
    default:
      return "bg-zinc-100 text-zinc-800";
  }
}

export function allocationTone(s: string): { dot: string; text: string; label: string } {
  switch (s) {
    case "UNALLOCATED":
      return { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", label: "Available" };
    case "PARTIAL":
      return { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", label: "Partial" };
    case "ALLOCATED":
    default:
      return { dot: "bg-zinc-400", text: "text-zinc-600 dark:text-zinc-400", label: "Allocated" };
  }
}

export function generateStrongPassword(): string {
  const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const specials = "!@#$%^&*()_+~`|}{[]:;?><,./-=";
  const all = letters + numbers + specials;
  
  let pwd = "";
  pwd += letters.charAt(Math.floor(Math.random() * letters.length));
  pwd += numbers.charAt(Math.floor(Math.random() * numbers.length));
  pwd += specials.charAt(Math.floor(Math.random() * specials.length));
  
  for (let i = 0; i < 11; i++) {
    pwd += all.charAt(Math.floor(Math.random() * all.length));
  }
  
  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
}
