import { Outlet } from "react-router-dom";

export function Layout() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col font-sans">
      <header className="h-16 border-b border-zinc-800 flex items-center px-6 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold">
            AI
          </div>
          <h1 className="text-lg font-semibold tracking-tight">
            AI Safety Survey Portal
          </h1>
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
