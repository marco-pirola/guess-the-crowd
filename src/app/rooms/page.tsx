import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { RoomsEntryContent } from "@/components/rooms/RoomsEntryContent";

export const metadata: Metadata = {
  title: "Rooms",
  description: "Create or join a private multiplayer room with friends.",
  alternates: { canonical: "/rooms" },
  openGraph: { url: "/rooms" },
};

export default function RoomsPage() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
        <RoomsEntryContent supabaseConfigured={isSupabaseConfigured} />
      </main>
    </>
  );
}
