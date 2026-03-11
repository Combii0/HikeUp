"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getCurrentUser,
  loginUser,
  requestPasswordReset,
  type User,
} from "../../lib/fakeAuth";

type Props = {
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
};

export default function LoginModal({ onClose, onLoginSuccess }: Props) {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const resetHintTimerRef = useRef<number | null>(null);

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    return () => {
      if (resetHintTimerRef.current !== null) {
        window.clearTimeout(resetHintTimerRef.current);
      }
    };
  }, []);

  if (!mounted) return null;

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Debes llenar todos los campos");
      setInfo("");
      return;
    }

    const result = await loginUser(email, password);
    if (!result.ok) {
      setError(result.message ?? "Correo o contrasena incorrectos");
      setInfo("");
      return;
    }

    const loggedUser = await getCurrentUser();
    if (loggedUser) {
      onLoginSuccess(loggedUser);
    }

    setError("");
    setInfo("");
    onClose();
  };

  const handleForgotPassword = async () => {
    setError("");
    setInfo("");
    if (resetHintTimerRef.current !== null) {
      window.clearTimeout(resetHintTimerRef.current);
      resetHintTimerRef.current = null;
    }

    const result = await requestPasswordReset(email);
    if (!result.ok) {
      setError(result.message ?? "No se pudo enviar el correo");
      return;
    }

    setInfo("Te enviamos un correo para restablecer tu contrasena");
    resetHintTimerRef.current = window.setTimeout(() => {
      setInfo("El link ha caducado, vuelve a solicitarlo.");
    }, 3600000);
  };

  return createPortal(
    <div
      style={{ zIndex: 200 }}
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <button
        type="button"
        aria-label="Cerrar modal de inicio de sesion"
        onClick={onClose}
        className="absolute inset-0 z-0"
      />

      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-[#0b1222] p-6 text-slate-100 shadow-xl ring-1 ring-white/10">
        <h2 className="mb-4 text-lg font-semibold">Iniciar sesion</h2>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo"
          className="mb-3 w-full rounded-lg bg-[#050915] px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 ring-1 ring-white/10 focus:outline-none focus:ring-orange-500/50"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contrasena"
          className="mb-3 w-full rounded-lg bg-[#050915] px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 ring-1 ring-white/10 focus:outline-none focus:ring-orange-500/50"
        />

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        {info && <p className="mb-3 text-sm text-emerald-400">{info}</p>}

        <button
          type="button"
          onClick={handleLogin}
          className="w-full rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white hover:bg-orange-400 transition"
        >
          Entrar
        </button>

        <div className="mt-4 text-center text-xs text-slate-400">
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/register");
            }}
            className="hover:text-orange-400 transition"
          >
            Crear cuenta
          </button>{" "}
          ·{" "}
          <button
            type="button"
            onClick={() => void handleForgotPassword()}
            className="hover:text-orange-400 transition"
          >
            Olvide mi contrasena
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
