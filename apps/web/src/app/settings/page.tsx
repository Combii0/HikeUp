"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  acceptFriendRequest,
  type BlockedUser,
  blockUser,
  cancelFriendRequest,
  DEFAULT_USER_PREFERENCES,
  deleteCurrentAccount,
  type FriendRequestItem,
  getBlockedUsers,
  getCurrentUser,
  logoutUser,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest,
  subscribeFriendsSnapshot,
  type User,
  type UserPreferences,
  type UserPreview,
  unblockUser,
  updateCurrentUser,
  uploadProfilePhoto,
} from "../../lib/fakeAuth";

const INTEREST_OPTIONS = [
  "Me gusta correr",
  "Estoy por fitness",
  "Quiero conocer gente nueva",
  "Busco rutas seguras",
  "Retos semanales",
  "Eventos de comunidad",
  "Consejos de nutricion",
  "Entrenamiento para trail",
];

const COLOMBIA_CITIES = [
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

type Section =
  | "account"
  | "friends"
  | "appearance"
  | "privacy"
  | "accessibility";
type AccentTheme = "orange" | "blue" | "purple";

function calculateAge(birthDate: string) {
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) return "--";

  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();
  const dayDiff = today.getDate() - parsed.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;

  return String(age);
}

function SettingsSidebar({
  activeSection,
  setActiveSection,
  router,
  onDeleteAccount,
  onClose,
}: {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
  router: ReturnType<typeof useRouter>;
  onDeleteAccount: () => void;
  onClose?: () => void;
}) {
  const handleSection = (section: Section) => {
    setActiveSection(section);
    onClose?.();
  };

  const handleBackToPlan = () => {
    onClose?.();
    router.push("/plan");
  };

  const handleLogout = () => {
    onClose?.();
    void (async () => {
      await logoutUser();
      router.push("/plan");
    })();
  };

  return (
    <>
      <p className="text-xs uppercase tracking-[0.2em] text-orange-100/80">
        Configuracion
      </p>
      <h1 className="mt-2 text-xl font-semibold text-orange-400">
        Centro de cuenta
      </h1>

      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={() => handleSection("account")}
          className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${
            activeSection === "account"
              ? "border-orange-400/70 bg-orange-500/15 text-orange-100"
              : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
          }`}
        >
          Cuenta
        </button>

        <button
          type="button"
          onClick={() => handleSection("friends")}
          className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${
            activeSection === "friends"
              ? "border-orange-400/70 bg-orange-500/15 text-orange-100"
              : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
          }`}
        >
          Amigos
        </button>

        <button
          type="button"
          onClick={() => handleSection("appearance")}
          className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${
            activeSection === "appearance"
              ? "border-orange-400/70 bg-orange-500/15 text-orange-100"
              : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
          }`}
        >
          Aspecto
        </button>

        <button
          type="button"
          onClick={() => handleSection("privacy")}
          className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${
            activeSection === "privacy"
              ? "border-orange-400/70 bg-orange-500/15 text-orange-100"
              : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
          }`}
        >
          Privacidad y seguridad
        </button>

        <button
          type="button"
          onClick={() => handleSection("accessibility")}
          className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${
            activeSection === "accessibility"
              ? "border-orange-400/70 bg-orange-500/15 text-orange-100"
              : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
          }`}
        >
          Accesibilidad
        </button>
      </div>

      <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={handleBackToPlan}
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left text-xs font-semibold transition hover:bg-white/10"
        >
          Volver a plan
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left text-xs font-semibold text-rose-200 transition hover:bg-white/10"
        >
          Cerrar sesion
        </button>
        <button
          type="button"
          onClick={() => {
            onClose?.();
            onDeleteAccount();
          }}
          className="w-full rounded-lg border border-rose-500/80 bg-rose-700/80 px-3 py-2 text-left text-xs font-semibold text-rose-50 transition hover:bg-rose-600"
        >
          Eliminar cuenta
        </button>
      </div>
    </>
  );
}

export default function SettingsPage() {
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<Section>("account");

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [profilePhoto, setProfilePhoto] = useState("");

  const [friendUsername, setFriendUsername] = useState("");
  const [friends, setFriends] = useState<UserPreview[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestItem[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [socialMessage, setSocialMessage] = useState("");
  const [compactCards, setCompactCards] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [allowProfileDiscovery, setAllowProfileDiscovery] = useState(true);
  const [allowFriendRequests, setAllowFriendRequests] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [accentTheme, setAccentTheme] = useState<AccentTheme>("orange");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const buildPreferencesPayload = useCallback(
    (): UserPreferences => ({
      compactCards,
      showOnlineStatus,
      allowProfileDiscovery,
      allowFriendRequests,
      highContrast,
      reducedMotion,
      largeText,
    }),
    [
      compactCards,
      showOnlineStatus,
      allowProfileDiscovery,
      allowFriendRequests,
      highContrast,
      reducedMotion,
      largeText,
    ],
  );

  const loadBlockedUsers = useCallback(async () => {
    const result = await getBlockedUsers();
    if (!result.ok) return;
    setBlockedUsers(result.blockedUsers ?? []);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const current = await getCurrentUser();
        if (!current) {
          router.push("/plan");
          return;
        }

        setUser(current);
        setUsername(current.username);
        setEmail(current.email);
        setCity(current.city ?? "");
        setPhone(current.phone ?? "");
        setGender(current.gender);
        setBio(current.bio ?? "");
        setInterests(current.interests ?? []);
        setProfilePhoto(current.profilePhoto ?? "");
        const prefs = current.preferences ?? DEFAULT_USER_PREFERENCES;
        setCompactCards(prefs.compactCards);
        setShowOnlineStatus(prefs.showOnlineStatus);
        setAllowProfileDiscovery(prefs.allowProfileDiscovery);
        setAllowFriendRequests(prefs.allowFriendRequests);
        setHighContrast(prefs.highContrast);
        setReducedMotion(prefs.reducedMotion);
        setLargeText(prefs.largeText);
        const currentTheme = current.accentTheme ?? "orange";
        setAccentTheme(currentTheme);
        document.documentElement.setAttribute("data-accent", currentTheme);

        await loadBlockedUsers();

        return subscribeFriendsSnapshot(
          (snapshot) => {
            setFriends(snapshot.friends);
            setIncoming(snapshot.incoming);
            setOutgoing(snapshot.outgoing);
          },
          (snapshotError) => setSocialMessage(snapshotError),
        );
      } finally {
        setAuthLoading(false);
      }
    };

    let unsub: (() => void) | undefined;
    void bootstrap().then((maybeUnsub) => {
      unsub = maybeUnsub;
    });

    return () => {
      if (unsub) unsub();
    };
  }, [router, loadBlockedUsers]);

  const maskedPassword = useMemo(() => {
    const size = Math.max(user?.password?.length ?? 0, 8);
    return "*".repeat(size);
  }, [user?.password]);

  const handleInterestToggle = (value: string) => {
    setInterests((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Debes seleccionar una imagen valida");
      setMessage("");
      return;
    }

    const uploaded = await uploadProfilePhoto(file);
    if (!uploaded.ok || !uploaded.url) {
      setError(uploaded.message ?? "No se pudo cargar la imagen");
      setMessage("");
      return;
    }

    setProfilePhoto(uploaded.url);
    setError("");
  };

  const handleSave = async () => {
    if (!user) return;

    if (!username || !email || !gender || !city || !phone) {
      setError("Completa usuario, correo, ciudad, telefono y genero");
      setMessage("");
      return;
    }

    if (!/^\d{7,15}$/.test(phone)) {
      setError("Numero telefonico invalido");
      setMessage("");
      return;
    }

    const result = await updateCurrentUser({
      username,
      email,
      city,
      phone,
      gender,
      bio: bio.trim(),
      interests,
      profilePhoto,
      preferences: buildPreferencesPayload(),
    });

    if (!result.ok) {
      setError(result.message ?? "No se pudo actualizar la cuenta");
      setMessage("");
      return;
    }

    setUser(result.user ?? null);
    setError("");
    setMessage("Cuenta actualizada");
  };

  const handleSendFriendRequest = async () => {
    if (!friendUsername.trim()) {
      setSocialMessage("Ingresa un username");
      return;
    }
    const result = await sendFriendRequest(friendUsername);
    setSocialMessage(
      result.ok ? "Solicitud enviada" : (result.message ?? "No se pudo enviar"),
    );
    if (result.ok) setFriendUsername("");
  };

  const handleAccept = async (fromUid: string) => {
    const result = await acceptFriendRequest(fromUid);
    setSocialMessage(
      result.ok
        ? "Solicitud aceptada"
        : (result.message ?? "No se pudo aceptar"),
    );
  };

  const handleReject = async (fromUid: string) => {
    const result = await rejectFriendRequest(fromUid);
    setSocialMessage(
      result.ok
        ? "Solicitud rechazada"
        : (result.message ?? "No se pudo rechazar"),
    );
  };

  const handleCancel = async (toUid: string) => {
    const result = await cancelFriendRequest(toUid);
    setSocialMessage(
      result.ok
        ? "Solicitud cancelada"
        : (result.message ?? "No se pudo cancelar"),
    );
  };

  const handleRemoveFriend = async (friendUid: string) => {
    const result = await removeFriend(friendUid);
    setSocialMessage(
      result.ok ? "Amigo eliminado" : (result.message ?? "No se pudo eliminar"),
    );
  };

  const handleBlock = async (targetUid: string) => {
    const result = await blockUser(targetUid);
    setSocialMessage(
      result.ok
        ? "Usuario bloqueado"
        : (result.message ?? "No se pudo bloquear"),
    );
    if (result.ok) await loadBlockedUsers();
  };

  const handleUnblock = async (targetUid: string) => {
    const result = await unblockUser(targetUid);
    setSocialMessage(
      result.ok
        ? "Usuario desbloqueado"
        : (result.message ?? "No se pudo desbloquear"),
    );
    if (result.ok) await loadBlockedUsers();
  };

  const handleAccentThemeChange = async (theme: AccentTheme) => {
    const prevTheme = accentTheme;
    setAccentTheme(theme);
    document.documentElement.setAttribute("data-accent", theme);

    const result = await updateCurrentUser({ accentTheme: theme });
    if (!result.ok) {
      setAccentTheme(prevTheme);
      document.documentElement.setAttribute("data-accent", prevTheme);
      setError(result.message ?? "No se pudo guardar el tema");
      return;
    }

    setUser(result.user ?? null);
    setError("");
  };

  const savePreferencesOnly = async (next: UserPreferences) => {
    const result = await updateCurrentUser({ preferences: next });
    if (!result.ok) {
      setError(result.message ?? "No se pudieron guardar las preferencias");
      return;
    }
    setUser(result.user ?? null);
    setError("");
  };

  const handleDeleteAccount = () => {
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteAccount = async () => {
    setDeleteLoading(true);
    const result = await deleteCurrentAccount();
    setDeleteLoading(false);

    if (!result.ok) {
      setError(result.message ?? "No se pudo eliminar la cuenta");
      return;
    }

    setDeleteModalOpen(false);
    router.push("/plan");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#050915] text-slate-200">
        <div className="rounded-2xl border border-white/10 bg-[#0b1222]/90 px-6 py-4 text-sm">
          Cargando sesion...
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050915] px-4 py-8 text-slate-200 md:px-6 md:py-10">
      <div className="pointer-events-none absolute -left-24 top-16 h-56 w-56 rounded-full bg-orange-500/15 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl animate-pulse" />

      <div className="relative mx-auto mb-4 flex w-full max-w-6xl items-center justify-between rounded-2xl border border-white/10 bg-[#0b1222]/80 px-4 py-3 shadow-xl shadow-black/20 backdrop-blur lg:hidden">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-orange-100/80">
            Configuracion
          </p>
          <p className="text-lg font-semibold text-orange-400">
            Centro de cuenta
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Abrir menu de configuracion"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 transition hover:bg-white/10"
        >
          <span className="flex flex-col gap-1.5">
            <span className="block h-0.5 w-5 rounded-full bg-slate-100" />
            <span className="block h-0.5 w-5 rounded-full bg-slate-100" />
            <span className="block h-0.5 w-5 rounded-full bg-slate-100" />
          </span>
        </button>
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden rounded-2xl border border-white/10 bg-[#0b1222]/90 p-4 shadow-2xl shadow-black/30 backdrop-blur lg:sticky lg:top-6 lg:block lg:h-fit">
          <SettingsSidebar
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            router={router}
            onDeleteAccount={handleDeleteAccount}
          />
        </aside>

        <main className="space-y-5">
          {activeSection === "account" ? (
            <>
              <section className="rounded-2xl border border-white/10 bg-[#0b1222]/90 p-5 shadow-2xl shadow-black/30 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-orange-100/80">
                  Identidad bloqueada
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-400">Nombre real</p>
                    <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                      {user.realName ?? "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Edad</p>
                    <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                      {calculateAge(user.birthDate ?? "")} anos
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Contrasena</p>
                    <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                      {maskedPassword}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Nombre, edad y contrasena no se pueden editar desde este
                  panel.
                </p>
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#0b1222]/90 p-5 shadow-2xl shadow-black/30 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-orange-100/80">
                  Perfil
                </p>

                <div className="mt-4 flex items-center gap-4">
                  {profilePhoto ? (
                    <Image
                      src={profilePhoto}
                      alt="Foto de perfil"
                      width={64}
                      height={64}
                      unoptimized
                      className="h-16 w-16 rounded-full object-cover ring-2 ring-orange-300/60"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/5 text-xs text-slate-400">
                      Sin foto
                    </div>
                  )}

                  <label className="cursor-pointer rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold transition hover:bg-white/15">
                    Subir foto
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Nombre de usuario"
                    className="w-full rounded-lg bg-[#050915] px-4 py-2 text-sm ring-1 ring-white/10 transition focus:outline-none focus:ring-orange-500/50"
                  />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Correo"
                    className="w-full rounded-lg bg-[#050915] px-4 py-2 text-sm ring-1 ring-white/10 transition focus:outline-none focus:ring-orange-500/50"
                  />
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-lg bg-[#050915] px-4 py-2 text-sm ring-1 ring-white/10 transition focus:outline-none focus:ring-orange-500/50"
                  >
                    <option value="">Ciudad (Colombia)</option>
                    {COLOMBIA_CITIES.map((item) => (
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
                    className="w-full rounded-lg bg-[#050915] px-4 py-2 text-sm ring-1 ring-white/10 transition focus:outline-none focus:ring-orange-500/50"
                  />
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-lg bg-[#050915] px-4 py-2 text-sm ring-1 ring-white/10 transition focus:outline-none focus:ring-orange-500/50 md:col-span-2"
                  >
                    <option value="">Genero</option>
                    <option value="male">Masculino</option>
                    <option value="female">Femenino</option>
                    <option value="na">Prefiero no decirlo</option>
                  </select>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={180}
                    rows={3}
                    placeholder="Descripcion corta sobre ti"
                    className="w-full rounded-lg bg-[#050915] px-4 py-2 text-sm ring-1 ring-white/10 transition focus:outline-none focus:ring-orange-500/50 md:col-span-2"
                  />
                  <p className="text-right text-xs text-slate-400 md:col-span-2">
                    {bio.length}/180
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#0b1222]/90 p-5 shadow-2xl shadow-black/30 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-orange-100/80">
                  Preferencias e intereses
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((option) => {
                    const active = interests.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleInterestToggle(option)}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                          active
                            ? "border-orange-400/70 bg-orange-500/20 text-orange-50"
                            : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </section>

              {error ? <p className="text-sm text-red-400">{error}</p> : null}
              {message ? (
                <p className="text-sm text-emerald-400">{message}</p>
              ) : null}

              <button
                type="button"
                onClick={handleSave}
                className="w-full rounded-lg bg-orange-500 py-3 font-semibold text-white transition hover:translate-y-[-1px] hover:bg-orange-400"
              >
                Guardar cambios
              </button>
            </>
          ) : activeSection === "friends" ? (
            <>
              <section className="rounded-2xl border border-white/10 bg-[#0b1222]/90 p-5 shadow-2xl shadow-black/30 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-orange-100/80">
                  Nueva solicitud
                </p>
                <div className="mt-3 flex gap-2">
                  <input
                    value={friendUsername}
                    onChange={(e) => setFriendUsername(e.target.value)}
                    className="w-full rounded-lg bg-[#050915] px-4 py-2 text-sm ring-1 ring-white/10"
                    placeholder="@username"
                  />
                  <button
                    type="button"
                    onClick={handleSendFriendRequest}
                    className="rounded bg-orange-500 px-4 py-2 text-xs font-semibold"
                  >
                    Enviar
                  </button>
                </div>
                {socialMessage ? (
                  <p className="mt-2 text-xs text-orange-300">
                    {socialMessage}
                  </p>
                ) : null}
              </section>

              <div className="grid gap-4 md:grid-cols-2">
                <section className="rounded-2xl border border-white/10 bg-[#0b1222]/90 p-4">
                  <p className="mb-2 text-slate-300">Solicitudes recibidas</p>
                  <div className="space-y-2">
                    {incoming.length === 0 ? (
                      <p className="text-xs text-slate-500">Sin pendientes</p>
                    ) : null}
                    {incoming.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between rounded bg-white/5 px-3 py-2"
                      >
                        <span>@{req.fromUsername}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleAccept(req.fromUid)}
                            className="rounded bg-emerald-600 px-2 py-1 text-xs"
                          >
                            Aceptar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleReject(req.fromUid)}
                            className="rounded bg-slate-700 px-2 py-1 text-xs"
                          >
                            Rechazar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleBlock(req.fromUid)}
                            className="rounded bg-rose-700 px-2 py-1 text-xs"
                          >
                            Bloquear
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-[#0b1222]/90 p-4">
                  <p className="mb-2 text-slate-300">Solicitudes enviadas</p>
                  <div className="space-y-2">
                    {outgoing.length === 0 ? (
                      <p className="text-xs text-slate-500">Sin enviadas</p>
                    ) : null}
                    {outgoing.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between rounded bg-white/5 px-3 py-2"
                      >
                        <span>@{req.toUsername}</span>
                        <button
                          type="button"
                          onClick={() => void handleCancel(req.toUid)}
                          className="rounded bg-slate-700 px-2 py-1 text-xs"
                        >
                          Cancelar
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section className="rounded-2xl border border-white/10 bg-[#0b1222]/90 p-4">
                <p className="mb-2 text-slate-300">Lista de amigos</p>
                <div className="space-y-2">
                  {friends.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Aun no tienes amigos
                    </p>
                  ) : null}
                  {friends.map((friend) => (
                    <div
                      key={friend.uid}
                      className="flex items-center justify-between rounded bg-white/5 px-3 py-2"
                    >
                      <span>@{friend.username}</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleRemoveFriend(friend.uid)}
                          className="rounded bg-rose-700 px-2 py-1 text-xs"
                        >
                          Eliminar
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleBlock(friend.uid)}
                          className="rounded bg-slate-700 px-2 py-1 text-xs"
                        >
                          Bloquear
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#0b1222]/90 p-4">
                <p className="mb-2 text-slate-300">Usuarios bloqueados</p>
                <div className="space-y-2">
                  {blockedUsers.length === 0 ? (
                    <p className="text-xs text-slate-500">No hay bloqueados</p>
                  ) : null}
                  {blockedUsers.map((blocked) => (
                    <div
                      key={blocked.uid}
                      className="flex items-center justify-between rounded bg-white/5 px-3 py-2"
                    >
                      <span>@{blocked.username}</span>
                      <button
                        type="button"
                        onClick={() => void handleUnblock(blocked.uid)}
                        className="rounded bg-emerald-700 px-2 py-1 text-xs"
                      >
                        Desbloquear
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : activeSection === "appearance" ? (
            <>
              <section className="rounded-2xl border border-white/10 bg-[#0b1222]/90 p-5 shadow-2xl shadow-black/30 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-orange-100/80">
                  Aspecto
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Selecciona la paleta de acento para toda la web.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => handleAccentThemeChange("orange")}
                    className={`rounded-lg border p-3 text-left transition ${
                      accentTheme === "orange"
                        ? "border-orange-400/70 bg-white/5"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="h-24 rounded-md border border-white/10 bg-[#120423] p-2">
                      <div className="space-y-2">
                        <span
                          className="block h-3 w-3 rounded-sm"
                          style={{ backgroundColor: "#fdba74" }}
                        />
                        <span
                          className="block h-3 w-3 rounded-sm"
                          style={{ backgroundColor: "#fb923c" }}
                        />
                        <span
                          className="block h-3 w-3 rounded-sm"
                          style={{ backgroundColor: "#f97316" }}
                        />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-slate-200">HikeUp Naranja</span>
                      <span className="h-5 w-5 rounded-full border-2 border-slate-400">
                        {accentTheme === "orange" ? (
                          <span
                            className="mt-[3px] ml-[3px] block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: "#f97316" }}
                          />
                        ) : null}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAccentThemeChange("blue")}
                    className={`rounded-lg border p-3 text-left transition ${
                      accentTheme === "blue"
                        ? "border-blue-400/70 bg-white/5"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="h-24 rounded-md border border-white/10 bg-[#070725] p-2">
                      <div className="space-y-2">
                        <span className="block h-3 w-3 rounded-sm bg-blue-300" />
                        <span className="block h-3 w-3 rounded-sm bg-blue-400" />
                        <span className="block h-3 w-3 rounded-sm bg-blue-500" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-slate-200">HikeUp Azul</span>
                      <span className="h-5 w-5 rounded-full border-2 border-slate-400">
                        {accentTheme === "blue" ? (
                          <span className="mt-[3px] ml-[3px] block h-2.5 w-2.5 rounded-full bg-blue-400" />
                        ) : null}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAccentThemeChange("purple")}
                    className={`rounded-lg border p-3 text-left transition ${
                      accentTheme === "purple"
                        ? "border-fuchsia-500/70 bg-white/5"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="h-24 rounded-md border border-white/10 bg-[#120423] p-2">
                      <div className="space-y-2">
                        <span className="block h-3 w-3 rounded-sm bg-fuchsia-300" />
                        <span className="block h-3 w-3 rounded-sm bg-fuchsia-500" />
                        <span className="block h-3 w-3 rounded-sm bg-purple-600" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-slate-200">HikeUp Morado</span>
                      <span className="h-5 w-5 rounded-full border-2 border-slate-400">
                        {accentTheme === "purple" ? (
                          <span className="mt-[3px] ml-[3px] block h-2.5 w-2.5 rounded-full bg-fuchsia-500" />
                        ) : null}
                      </span>
                    </div>
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                    <span>Usar tarjetas compactas</span>
                    <input
                      type="checkbox"
                      checked={compactCards}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setCompactCards(next);
                        void savePreferencesOnly({
                          ...buildPreferencesPayload(),
                          compactCards: next,
                        });
                      }}
                      className="h-4 w-4 accent-orange-500"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                    <span>Mostrar estado en linea</span>
                    <input
                      type="checkbox"
                      checked={showOnlineStatus}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setShowOnlineStatus(next);
                        void savePreferencesOnly({
                          ...buildPreferencesPayload(),
                          showOnlineStatus: next,
                        });
                      }}
                      className="h-4 w-4 accent-orange-500"
                    />
                  </label>
                </div>
              </section>
              <p className="text-xs text-slate-400">
                Estas opciones reorganizan como ves el panel, sin cambiar el
                estilo general del proyecto.
              </p>
            </>
          ) : activeSection === "privacy" ? (
            <section className="rounded-2xl border border-white/10 bg-[#0b1222]/90 p-5 shadow-2xl shadow-black/30 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-orange-100/80">
                Privacidad y seguridad
              </p>
              <div className="mt-4 space-y-3">
                <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  <span>Permitir que encuentren mi perfil</span>
                  <input
                    type="checkbox"
                    checked={allowProfileDiscovery}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setAllowProfileDiscovery(next);
                      void savePreferencesOnly({
                        ...buildPreferencesPayload(),
                        allowProfileDiscovery: next,
                      });
                    }}
                    className="h-4 w-4 accent-orange-500"
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  <span>Permitir solicitudes de amistad</span>
                  <input
                    type="checkbox"
                    checked={allowFriendRequests}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setAllowFriendRequests(next);
                      void savePreferencesOnly({
                        ...buildPreferencesPayload(),
                        allowFriendRequests: next,
                      });
                    }}
                    className="h-4 w-4 accent-orange-500"
                  />
                </label>
              </div>
              <div className="mt-4 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => router.push("/terms")}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold transition hover:bg-white/10"
                >
                  Ver terminos y condiciones
                </button>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-white/10 bg-[#0b1222]/90 p-5 shadow-2xl shadow-black/30 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-orange-100/80">
                Accesibilidad
              </p>
              <div className="mt-4 space-y-3">
                <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  <span>Alto contraste</span>
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setHighContrast(next);
                      void savePreferencesOnly({
                        ...buildPreferencesPayload(),
                        highContrast: next,
                      });
                    }}
                    className="h-4 w-4 accent-orange-500"
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  <span>Reducir animaciones</span>
                  <input
                    type="checkbox"
                    checked={reducedMotion}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setReducedMotion(next);
                      void savePreferencesOnly({
                        ...buildPreferencesPayload(),
                        reducedMotion: next,
                      });
                    }}
                    className="h-4 w-4 accent-orange-500"
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  <span>Texto grande</span>
                  <input
                    type="checkbox"
                    checked={largeText}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setLargeText(next);
                      void savePreferencesOnly({
                        ...buildPreferencesPayload(),
                        largeText: next,
                      });
                    }}
                    className="h-4 w-4 accent-orange-500"
                  />
                </label>
              </div>
            </section>
          )}
        </main>
      </div>
      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-[205] flex lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menu de configuracion"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          />
          <div className="relative z-10 h-full w-[88%] max-w-sm overflow-y-auto border-r border-white/10 bg-[#0b1222]/95 p-4 shadow-2xl shadow-black/40">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-100">
                Menu de configuracion
              </p>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Cerrar
              </button>
            </div>
            <SettingsSidebar
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              router={router}
              onDeleteAccount={handleDeleteAccount}
              onClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      ) : null}
      {deleteModalOpen ? (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/65 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Cerrar modal de eliminar cuenta"
            onClick={() => setDeleteModalOpen(false)}
            className="absolute inset-0 z-0"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-rose-500/40 bg-[#0b1222] p-5 shadow-2xl shadow-black/40">
            <p className="text-xs uppercase tracking-[0.2em] text-rose-200/90">
              Zona critica
            </p>
            <h3 className="mt-2 text-lg font-semibold text-rose-300">
              Eliminar cuenta
            </h3>
            <p className="mt-3 text-sm text-slate-300">
              Esta accion eliminara tu cuenta y no se podra deshacer.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteLoading}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDeleteAccount()}
                disabled={deleteLoading}
                className="w-full rounded-lg border border-rose-500/80 bg-rose-700/90 px-3 py-2 text-sm font-semibold text-rose-50 disabled:opacity-60"
              >
                {deleteLoading ? "Eliminando..." : "Confirmar eliminacion"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
