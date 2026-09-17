import { LandingView } from "@/components/landing-view";
import { Suspense } from "react";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main className="boot">
          <p>Encendiendo VELA…</p>
        </main>
      }
    >
      <LandingView />
    </Suspense>
  );
}
