import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { JoinRoomForm } from "@/components/rooms/JoinRoomForm";

export const metadata: Metadata = {
  title: "Join a room",
  description: "Join a friend's private multiplayer room with a room code.",
  alternates: { canonical: "/rooms/join" },
  openGraph: { url: "/rooms/join" },
};

export default function JoinRoomPage() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-8 sm:py-12">
        <JoinRoomForm />
      </main>
    </>
  );
}
