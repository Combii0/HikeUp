"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { User } from "../../lib/fakeAuth";

type Props = {
  user: User;
  onClose: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
};

export default function AccountModal({
  user,
  onClose,
  onLogout,
  onOpenSettings,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      style={{ zIndex: 200 }}
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <button
        type="button"
        aria-label="Cerrar modal de cuenta"
        onClick={onClose}
        className="absolute inset-0 z-0"
      />

      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-[#0b1222] p-6 text-slate-100 shadow-xl ring-1 ring-white/10">
        <h2 className="mb-4 text-lg font-semibold">Cuenta activa</h2>

        <div className="space-y-2 rounded-xl bg-[#050915] p-3 ring-1 ring-white/10">
          <p className="text-sm text-slate-300">Usuario</p>
          <p className="text-base font-semibold text-orange-200">
            @{user.username}
          </p>
          <p className="text-xs text-slate-400">{user.email}</p>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="mt-4 w-full rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white hover:bg-orange-400 transition"
        >
          Configuracion
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="mt-2 w-full rounded-lg bg-slate-700 py-2 text-sm font-semibold text-white hover:bg-slate-600 transition"
        >
          Cerrar sesion
        </button>
      </div>
    </div>,
    document.body,
  );
}
