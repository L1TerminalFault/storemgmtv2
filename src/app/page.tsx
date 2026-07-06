"use client"

import { useRouter } from "next/navigation";

import { useStoreStore } from "@/lib/store";

export default function Home() {
	const router = useRouter();

  const effectiveUser = useStoreStore((s) => s.effectiveUser);
  return effectiveUser?.role === "Sales" ? router.replace("/transactions") : router.replace("/home");
}
