import { Outlet } from "react-router-dom";
import { Header } from "../components/header";
import { MobileNav } from "../components/mobile-nav";
import { useEffect, useState } from "react";
import { getHealth, type HealthResponse } from "../lib/api";

export function Root() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(console.error);
  }, []);
  const unavailableScanners =
  health?.scanners
    ? Object.entries(health.scanners)
        .filter(([_, available]) => !available)
        .map(([name]) => name)
    : [];

  

  return (
    <div className="min-h-screen bg-background">
      <Header />

     {health?.status === "degraded" && (
  <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-3 text-yellow-900">
    <p className="font-semibold">
      ⚠ System is running in degraded mode.
    </p>

    <p>
      One or more scanners are unavailable. Scan results may be incomplete.
    </p>

    {unavailableScanners.length > 0 && (
      <p>
        Unavailable scanners: {unavailableScanners.join(", ")}
      </p>
    )}
  </div>
)}

      <main className="min-h-[calc(100vh-4rem)]">
        <Outlet />
      </main>

      <MobileNav />
    </div>
  );
}