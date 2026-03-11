"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { registerUser } from "../../lib/fakeAuth";

export default function RegisterPage() {
  const router = useRouter();

  const [realName, setRealName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");

  type Gender = "male" | "female" | "na";
  const [gender, setGender] = useState<Gender | "">("");

  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");

  const inputStyle =
    "w-full rounded-lg bg-[#050915] px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 ring-1 ring-white/10 focus:outline-none focus:ring-orange-500/50";

  const selectStyle =
    "w-full rounded-lg bg-[#050915] px-4 py-2 text-sm text-slate-100 ring-1 ring-white/10 focus:outline-none focus:ring-orange-500/50";

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const years = Array.from(
    { length: 100 },
    (_, i) => new Date().getFullYear() - i,
  );
  const colombiaCities = [
    "Bogota",
    "Medellin",
    "Cali",
    "Barranquilla",
    "Cartagena",
    "Bucaramanga",
    "Pereira",
    "Santa Marta",
    "Manizales",
    "Cucuta",
  ];

  const handleRegister = async () => {
    if (
      !realName ||
      !username ||
      !email ||
      !password ||
      !confirmPassword ||
      !birthDay ||
      !birthMonth ||
      !birthYear ||
      !city ||
      !phone ||
      !gender ||
      !accepted
    ) {
      setError("Debes completar todos los campos");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden");
      return;
    }

    if (password.length < 8) {
      setError("La contrasena debe tener minimo 8 caracteres");
      return;
    }

    if (!/^\d{7,15}$/.test(phone)) {
      setError("Numero telefonico invalido");
      return;
    }

    setError("");

    const birthDate = `${birthYear}-${birthMonth}-${birthDay}`;
    const newUser = {
      realName,
      username,
      email,
      password,
      birthDate,
      gender,
      city,
      phone,
    };

    const result = await registerUser(newUser);
    if (!result.ok) {
      setError(result.message ?? "No se pudo crear la cuenta");
      return;
    }

    router.push("/plan");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050915] text-slate-100">
      <div className="w-full max-w-md rounded-2xl bg-[#0b1222] p-6 shadow-2xl ring-1 ring-white/10">
        <h2 className="mb-6 text-xl font-semibold text-center">Crear cuenta</h2>

        <div className="space-y-3">
          <input
            placeholder="Nombre real"
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            className={inputStyle}
          />

          <input
            placeholder="Nombre de usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputStyle}
          />

          <input
            placeholder="Correo electronico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputStyle}
          />

          <input
            type="password"
            placeholder="Contrasena"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            className={inputStyle}
          />

          <input
            type="password"
            placeholder="Confirmar contrasena"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            className={inputStyle}
          />

          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={selectStyle}
          >
            <option value="">Ciudad (Colombia)</option>
            {colombiaCities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Numero telefonico"
            inputMode="numeric"
            className={inputStyle}
          />

          <div className="grid grid-cols-3 gap-2">
            <select
              value={birthDay}
              onChange={(e) => setBirthDay(e.target.value)}
              className={selectStyle}
            >
              <option value="">Dia</option>
              {days.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={birthMonth}
              onChange={(e) => setBirthMonth(e.target.value)}
              className={selectStyle}
            >
              <option value="">Mes</option>
              {months.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              className={selectStyle}
            >
              <option value="">Ano</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
            className={selectStyle}
          >
            <option value="">Genero</option>
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
            <option value="na">Prefiero no decirlo</option>
          </select>

          <label className="flex items-start gap-2 text-sm text-slate-400 leading-snug">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1"
            />
            <span>
              Acepto los{" "}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 underline"
              >
                terminos y condiciones
              </a>{" "}
              y autorizo el tratamiento de mis datos personales.
            </span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="button"
            onClick={handleRegister}
            className="w-full rounded-lg bg-orange-500 py-2 font-semibold hover:bg-orange-400 transition"
          >
            Crear cuenta
          </button>
        </div>
      </div>
    </div>
  );
}
