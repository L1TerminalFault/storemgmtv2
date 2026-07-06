"use client"

import { redirect } from "next/navigation";

import { useStoreStore } from "@/lib/store";

export default function Home() {
  const effectiveUser = useStoreStore((s) => s.effectiveUser);
  return effectiveUser?.role === "Sales" ? redirect("/transactions") : redirect("/home");
}
