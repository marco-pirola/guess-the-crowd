import { Header } from "@/components/Header";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function Loading() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <LoadingSpinner label="Loading challenge…" />
      </main>
    </>
  );
}
