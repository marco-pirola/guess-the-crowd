import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { CreateRoomForm } from "@/components/rooms/CreateRoomForm";

export const metadata: Metadata = {
  title: "Create a room",
  description: "Set up a private multiplayer room to play with friends.",
  alternates: { canonical: "/rooms/create" },
  openGraph: { url: "/rooms/create" },
};

export default function CreateRoomPage() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-8 sm:py-12">
        <CreateRoomForm />
      </main>
    </>
  );
}
