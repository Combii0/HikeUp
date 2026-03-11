"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  acceptFriendRequest,
  type BlockedUser,
  blockUser,
  cancelFriendRequest,
  type FriendRequestItem,
  getBlockedUsers,
  getCurrentUser,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest,
  subscribeFriendsSnapshot,
  type UserPreview,
  unblockUser,
} from "../../lib/fakeAuth";

export default function FriendsPage() {
  const [loading, setLoading] = useState(true);
  const [friendUsername, setFriendUsername] = useState("");
  const [friends, setFriends] = useState<UserPreview[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestItem[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [message, setMessage] = useState("");

  const loadBlockedUsers = useCallback(async () => {
    const result = await getBlockedUsers();
    if (!result.ok) return;
    setBlockedUsers(result.blockedUsers ?? []);
  }, []);

  useEffect(() => {
    const boot = async () => {
      const user = await getCurrentUser();
      if (!user) {
        setLoading(false);
        setMessage("Debes iniciar sesion para ver amistades");
        return;
      }

      const unsub = subscribeFriendsSnapshot(
        (snapshot) => {
          setFriends(snapshot.friends);
          setIncoming(snapshot.incoming);
          setOutgoing(snapshot.outgoing);
          setLoading(false);
        },
        (err) => {
          setMessage(err);
          setLoading(false);
        },
      );
      await loadBlockedUsers();

      return unsub;
    };

    let unsub: (() => void) | undefined;
    void boot().then((u) => {
      unsub = u;
    });
    return () => {
      if (unsub) unsub();
    };
  }, [loadBlockedUsers]);

  const handleSend = async () => {
    const result = await sendFriendRequest(friendUsername);
    setMessage(
      result.ok ? "Solicitud enviada" : (result.message ?? "No se pudo enviar"),
    );
    if (result.ok) setFriendUsername("");
  };

  const handleBlock = async (targetUid: string) => {
    const result = await blockUser(targetUid);
    setMessage(
      result.ok
        ? "Usuario bloqueado"
        : (result.message ?? "No se pudo bloquear"),
    );
    if (result.ok) await loadBlockedUsers();
  };

  const handleUnblock = async (targetUid: string) => {
    const result = await unblockUser(targetUid);
    setMessage(
      result.ok
        ? "Usuario desbloqueado"
        : (result.message ?? "No se pudo desbloquear"),
    );
    if (result.ok) await loadBlockedUsers();
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#050915] text-slate-200">
        Cargando amistades...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050915] px-6 py-10 text-slate-200">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-orange-400">Amigos</h1>
          <Link
            href="/settings"
            className="rounded bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"
          >
            Volver a configuracion
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0b1222]/90 p-4">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-orange-100/80">
            Nueva solicitud
          </p>
          <div className="flex gap-2">
            <input
              value={friendUsername}
              onChange={(e) => setFriendUsername(e.target.value)}
              className="w-full rounded-lg bg-[#050915] px-4 py-2 text-sm ring-1 ring-white/10"
              placeholder="@username"
            />
            <button
              type="button"
              onClick={handleSend}
              className="rounded bg-orange-500 px-4 py-2 text-xs font-semibold"
            >
              Enviar
            </button>
          </div>
          {message ? (
            <p className="mt-2 text-xs text-orange-300">{message}</p>
          ) : null}
        </div>

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
                      onClick={() => void acceptFriendRequest(req.fromUid)}
                      className="rounded bg-emerald-600 px-2 py-1 text-xs"
                    >
                      Aceptar
                    </button>
                    <button
                      type="button"
                      onClick={() => void rejectFriendRequest(req.fromUid)}
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
                    onClick={() => void cancelFriendRequest(req.toUid)}
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
              <p className="text-xs text-slate-500">Aun no tienes amigos</p>
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
                    onClick={() => void removeFriend(friend.uid)}
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
      </div>
    </div>
  );
}
