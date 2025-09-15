
import { PropsWithChildren } from "react";
import { Link } from "react-router-dom";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-botas-primary text-white">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">

            <img src="/logo.svg" className="h-8 w-auto object-contain" alt="BOTAŞ PTDS" />
            <span className="font-semibold tracking-wide">PDTS</span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/dashboard" className="hover:opacity-90">Dashboard</Link>
            <Link to="/staff" className="hover:opacity-90">Staff</Link>
            <Link to="/attendance" className="hover:opacity-90">Attendance</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      <footer className="text-xs text-gray-500 py-6 text-center">
        © {new Date().getFullYear()} PDTS
      </footer>
    </div>
  );
}
