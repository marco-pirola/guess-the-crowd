import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { RoomExperience } from "@/components/rooms/RoomExperience";
import { normalizeRoomCode } from "@/lib/rooms/roomCode";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const normalized = normalizeRoomCode(code);
  return {
    title: "Room",
    // Private, player-specific pages — never meant to be indexed.
    robots: { index: false, follow: false },
    alternates: { canonical: `/rooms/${normalized}` },
  };
}

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalized = normalizeRoomCode(code);

  return (
    <>
      <Header />
      <RoomExperience code={normalized} />
    </>
  );
}
