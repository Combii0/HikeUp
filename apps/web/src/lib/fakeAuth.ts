import {
  createUserWithEmailAndPassword,
  deleteUser as firebaseDeleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase";

export type AchievementStats = {
  routesCompleted: number;
  kilometersTotal: number;
  daysInApp: number;
  bogotaLandmarksVisited: string[];
};

export type UserPreferences = {
  compactCards: boolean;
  showOnlineStatus: boolean;
  allowProfileDiscovery: boolean;
  allowFriendRequests: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  compactCards: false,
  showOnlineStatus: true,
  allowProfileDiscovery: true,
  allowFriendRequests: true,
  highContrast: false,
  reducedMotion: false,
  largeText: false,
};

export type User = {
  uid?: string;
  realName: string;
  username: string;
  email: string;
  password: string;
  birthDate: string;
  gender: string;
  city: string;
  phone: string;
  profilePhoto?: string;
  bio?: string;
  interests?: string[];
  accentTheme?: "orange" | "blue" | "purple";
  preferences?: UserPreferences;
  achievements?: AchievementStats;
};

export type UserPreview = {
  uid: string;
  username: string;
  profilePhoto?: string;
  bio?: string;
};

export type FriendRequestItem = {
  id: string;
  fromUid: string;
  toUid: string;
  fromUsername: string;
  toUsername: string;
  status: "pending";
};

export type FriendsSnapshot = {
  friends: UserPreview[];
  incoming: FriendRequestItem[];
  outgoing: FriendRequestItem[];
};

export type BlockedUser = {
  uid: string;
  username: string;
};

type StoredUser = Omit<User, "password"> & { usernameLower?: string };
type PublicUser = {
  uid: string;
  username: string;
  usernameLower: string;
  profilePhoto?: string;
  bio?: string;
};

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if (!("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function normalizePreferences(
  preferences?: Partial<UserPreferences>,
): UserPreferences {
  return {
    ...DEFAULT_USER_PREFERENCES,
    ...(preferences ?? {}),
  };
}

function uidHash(uid: string) {
  let hash = 0;
  for (let i = 0; i < uid.length; i += 1) {
    hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function buildAchievementsSeed(uid: string): AchievementStats {
  const hash = uidHash(uid);
  const routesCompleted = (hash % 42) + 1;
  const kilometersTotal = Number(
    (routesCompleted * 3.1 + (hash % 9) * 0.7).toFixed(1),
  );
  const daysInApp = (hash % 120) + 1;
  const landmarks = [
    "Parque Simon Bolivar",
    "Parque de los Novios",
    "Ciclovia de la 116",
    "Monserrate",
  ];
  const visitedCount = hash % (landmarks.length + 1);
  return {
    routesCompleted,
    kilometersTotal,
    daysInApp,
    bogotaLandmarksVisited: landmarks.slice(0, visitedCount),
  };
}

async function ensureAchievements(
  uid: string,
  profile: StoredUser,
): Promise<AchievementStats> {
  if (profile.achievements) return profile.achievements;
  const seeded = buildAchievementsSeed(uid);
  try {
    await updateDoc(doc(db, "users", uid), { achievements: seeded });
  } catch (error) {
    console.warn("ensureAchievements seed skipped", error);
  }
  return seeded;
}

function mapAuthError(code?: string) {
  switch (code) {
    case "auth/email-already-in-use":
      return "El correo ya esta registrado";
    case "auth/invalid-email":
      return "El correo no es valido";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contrasena incorrectos";
    case "auth/weak-password":
      return "La contrasena es muy debil";
    case "auth/too-many-requests":
      return "Demasiados intentos. Intenta de nuevo en unos minutos";
    case "auth/network-request-failed":
      return "No hay conexion. Revisa tu internet";
    case "auth/requires-recent-login":
      return "Vuelve a iniciar sesion para realizar este cambio";
    default:
      return "Ocurrio un error. Intenta nuevamente";
  }
}

function mapFirestoreError(code?: string) {
  switch (code) {
    case "permission-denied":
      return "No tienes permisos para realizar esta accion";
    case "unavailable":
      return "Servicio no disponible. Intenta mas tarde";
    case "failed-precondition":
      return "Falta un indice en Firestore. Crea el indice sugerido en Firebase Console";
    default:
      return "No se pudo guardar la informacion";
  }
}

async function getUserDoc(uid: string): Promise<StoredUser | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { ...(snap.data() as StoredUser), uid };
}

async function getPublicUserDoc(uid: string): Promise<PublicUser | null> {
  const snap = await getDoc(doc(db, "user_public", uid));
  if (!snap.exists()) return null;
  return { ...(snap.data() as PublicUser), uid };
}

async function upsertPublicUser(
  user: Pick<StoredUser, "uid" | "username" | "profilePhoto" | "bio">,
) {
  if (!user.uid) return;
  await setDoc(
    doc(db, "user_public", user.uid),
    {
      uid: user.uid,
      username: user.username,
      usernameLower: user.username.trim().toLowerCase(),
      profilePhoto: user.profilePhoto ?? "",
      bio: user.bio ?? "",
    } satisfies PublicUser,
    { merge: true },
  );
}

function pairId(a: string, b: string) {
  return [a, b].sort().join("_");
}

function blockId(blockerUid: string, blockedUid: string) {
  return `${blockerUid}_${blockedUid}`;
}

async function findUserByUsername(
  username: string,
): Promise<StoredUser | null> {
  const raw = username.trim().replace(/^@+/, "");
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const lowerQ = query(
    collection(db, "user_public"),
    where("usernameLower", "==", lower),
    limit(1),
  );
  const lowerSnap = await getDocs(lowerQ);
  if (!lowerSnap.empty) {
    const found = lowerSnap.docs[0];
    return { ...(found.data() as StoredUser), uid: found.id };
  }

  const exactQ = query(
    collection(db, "user_public"),
    where("username", "==", raw),
    limit(1),
  );
  const exactSnap = await getDocs(exactQ);
  if (exactSnap.empty) return null;
  const found = exactSnap.docs[0];
  return { ...(found.data() as StoredUser), uid: found.id };
}

export async function registerUser(user: User) {
  if ((user.password ?? "").length < 8) {
    return {
      ok: false,
      message: "La contrasena debe tener minimo 8 caracteres",
    };
  }

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      user.email,
      user.password,
    );
    const payload: StoredUser = {
      uid: credential.user.uid,
      realName: user.realName,
      username: user.username,
      usernameLower: user.username.trim().toLowerCase(),
      email: user.email.trim().toLowerCase(),
      birthDate: user.birthDate,
      gender: user.gender,
      city: user.city,
      phone: user.phone,
      profilePhoto: user.profilePhoto ?? "",
      bio: user.bio ?? "",
      interests: user.interests ?? [],
      accentTheme: user.accentTheme ?? "orange",
      preferences: normalizePreferences(user.preferences),
      achievements:
        user.achievements ?? buildAchievementsSeed(credential.user.uid),
    };

    await setDoc(doc(db, "users", credential.user.uid), payload);
    try {
      await upsertPublicUser(payload);
    } catch (syncError) {
      console.warn("registerUser public sync skipped", syncError);
    }
    return { ok: true };
  } catch (error: unknown) {
    const code = getErrorCode(error);
    console.warn("registerUser failed", code ?? error);
    return { ok: false, message: mapAuthError(code) };
  }
}

export async function loginUser(email: string, password: string) {
  try {
    await signInWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password,
    );
    return { ok: true };
  } catch (error: unknown) {
    const code = getErrorCode(error);
    console.warn("loginUser failed", code ?? error);
    return { ok: false, message: mapAuthError(code) };
  }
}

export async function requestPasswordReset(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return { ok: false, message: "Ingresa tu correo para recuperar la cuenta" };
  }

  try {
    await sendPasswordResetEmail(auth, normalized);
    return { ok: true };
  } catch (error: unknown) {
    const code = getErrorCode(error);
    console.warn("requestPasswordReset failed", code ?? error);
    return { ok: false, message: mapAuthError(code) };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const current = auth.currentUser;
  if (!current) return null;

  const profile = await getUserDoc(current.uid);
  if (!profile) return null;
  const achievements = await ensureAchievements(current.uid, profile);
  try {
    await upsertPublicUser(profile);
  } catch (syncError) {
    console.warn("getCurrentUser public sync skipped", syncError);
  }

  return {
    ...profile,
    accentTheme: profile.accentTheme ?? "orange",
    preferences: normalizePreferences(profile.preferences),
    achievements,
    password: "",
  };
}

export async function resolveAuthUser(): Promise<User | null> {
  return new Promise((resolve) => {
    let unsubscribe = () => {};
    unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribe();
      if (!firebaseUser) {
        resolve(null);
        return;
      }
      const profile = await getUserDoc(firebaseUser.uid);
      if (!profile) {
        resolve(null);
        return;
      }
      const achievements = await ensureAchievements(firebaseUser.uid, profile);
      resolve({
        ...profile,
        accentTheme: profile.accentTheme ?? "orange",
        preferences: normalizePreferences(profile.preferences),
        achievements,
        password: "",
      });
    });
  });
}

export async function logoutUser() {
  await signOut(auth);
}

export async function updateCurrentUser(updates: Partial<User>) {
  const current = auth.currentUser;
  if (!current) {
    return { ok: false, message: "No hay sesion activa" };
  }

  const data: Partial<StoredUser> = {
    ...updates,
    usernameLower: updates.username?.trim().toLowerCase(),
    email: updates.email?.trim().toLowerCase(),
  };

  Object.keys(data).forEach((key) => {
    if (data[key as keyof StoredUser] === undefined) {
      delete data[key as keyof StoredUser];
    }
  });

  delete (data as Partial<User>).password;
  delete (data as Partial<User>).uid;

  try {
    if (data.email && data.email !== current.email) {
      await updateEmail(current, data.email);
    }
    await updateDoc(doc(db, "users", current.uid), data);
    if (data.username || data.profilePhoto || data.bio) {
      const privateProfile = await getUserDoc(current.uid);
      if (!privateProfile) {
        return {
          ok: false,
          message: "No se pudo sincronizar el perfil publico",
        };
      }
      await upsertPublicUser({
        uid: current.uid,
        username: privateProfile.username,
        profilePhoto: data.profilePhoto,
        bio: data.bio,
      });
    }
    const user = await getCurrentUser();
    return { ok: true, user };
  } catch (error: unknown) {
    const code = getErrorCode(error);
    console.warn("updateCurrentUser failed", code ?? error);
    return {
      ok: false,
      message: code?.startsWith("auth/")
        ? mapAuthError(code)
        : mapFirestoreError(code),
    };
  }
}

export async function uploadProfilePhoto(file: File) {
  // Firestore documents support ~1MB max. Keep file small to fit base64 safely.
  const maxBytes = 600 * 1024;
  if (file.size > maxBytes) {
    return { ok: false, message: "La imagen debe pesar menos de 600KB" };
  }

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
      reader.readAsDataURL(file);
    });

    return { ok: true, url: dataUrl };
  } catch {
    return { ok: false, message: "No se pudo procesar la imagen" };
  }
}

export async function sendFriendRequest(toUsername: string) {
  try {
    const current = auth.currentUser;
    if (!current) return { ok: false, message: "Debes iniciar sesion" };

    const fromProfile = await getUserDoc(current.uid);
    if (!fromProfile) return { ok: false, message: "No se encontro tu perfil" };

    const target = await findUserByUsername(toUsername);
    if (!target?.uid) return { ok: false, message: "Usuario no encontrado" };
    if (target.uid === current.uid)
      return { ok: false, message: "No puedes agregarte a ti mismo" };

    const [iBlockedQ, blockedMeQ] = await Promise.all([
      getDocs(
        query(
          collection(db, "blocks"),
          where("blockerUid", "==", current.uid),
          where("blockedUid", "==", target.uid),
          limit(1),
        ),
      ),
      getDocs(
        query(
          collection(db, "blocks"),
          where("blockerUid", "==", target.uid),
          where("blockedUid", "==", current.uid),
          limit(1),
        ),
      ),
    ]);
    if (!iBlockedQ.empty)
      return {
        ok: false,
        message: "No puedes enviar solicitud a un usuario bloqueado",
      };
    if (!blockedMeQ.empty)
      return { ok: false, message: "Este usuario no acepta solicitudes" };

    // Backend-side guards against duplicate requests/friendships.
    const [friendsSnap, outgoingSnap, incomingSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, "friendships"),
          where("users", "array-contains", current.uid),
        ),
      ),
      getDocs(
        query(
          collection(db, "friend_requests"),
          where("fromUid", "==", current.uid),
          where("toUid", "==", target.uid),
          where("status", "==", "pending"),
        ),
      ),
      getDocs(
        query(
          collection(db, "friend_requests"),
          where("fromUid", "==", target.uid),
          where("toUid", "==", current.uid),
          where("status", "==", "pending"),
        ),
      ),
    ]);

    const alreadyFriend = friendsSnap.docs.some((d) => {
      const users = (d.data().users as string[]) ?? [];
      return users.includes(target.uid as string);
    });
    if (alreadyFriend) return { ok: false, message: "Ya son amigos" };

    if (!outgoingSnap.empty)
      return { ok: false, message: "Ya enviaste esta solicitud" };
    if (!incomingSnap.empty)
      return {
        ok: false,
        message: "Tienes una solicitud pendiente de este usuario",
      };

    await setDoc(doc(db, "friend_requests", `${current.uid}_${target.uid}`), {
      fromUid: current.uid,
      toUid: target.uid,
      fromUsername: fromProfile.username,
      toUsername: target.username,
      status: "pending",
      createdAt: Date.now(),
    });

    return { ok: true };
  } catch (error: unknown) {
    const code = getErrorCode(error);
    console.warn("sendFriendRequest failed", code ?? error);
    return { ok: false, message: mapFirestoreError(code) };
  }
}

async function buildFriendsSnapshot(
  currentUid: string,
): Promise<FriendsSnapshot> {
  const incomingQ = query(
    collection(db, "friend_requests"),
    where("toUid", "==", currentUid),
    where("status", "==", "pending"),
  );
  const outgoingQ = query(
    collection(db, "friend_requests"),
    where("fromUid", "==", currentUid),
    where("status", "==", "pending"),
  );
  const friendshipsQ = query(
    collection(db, "friendships"),
    where("users", "array-contains", currentUid),
  );

  const [incomingSnap, outgoingSnap, friendshipsSnap] = await Promise.all([
    getDocs(incomingQ),
    getDocs(outgoingQ),
    getDocs(friendshipsQ),
  ]);

  const incoming: FriendRequestItem[] = incomingSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<FriendRequestItem, "id">),
  }));

  const outgoing: FriendRequestItem[] = outgoingSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<FriendRequestItem, "id">),
  }));

  const otherUids = friendshipsSnap.docs
    .map((d) => (d.data().users as string[]).find((uid) => uid !== currentUid))
    .filter((uid): uid is string => Boolean(uid));

  const friendsDocs = await Promise.all(
    otherUids.map((uid) => getPublicUserDoc(uid)),
  );
  const friends: UserPreview[] = friendsDocs
    .filter((u): u is PublicUser => Boolean(u?.uid))
    .map((u) => ({
      uid: u.uid,
      username: u.username,
      profilePhoto: u.profilePhoto,
      bio: u.bio,
    }));

  return { friends, incoming, outgoing };
}

export async function getFriendsSnapshot() {
  try {
    const current = auth.currentUser;
    if (!current) return { ok: false, message: "Debes iniciar sesion" };
    const snapshot = await buildFriendsSnapshot(current.uid);
    return { ok: true, ...snapshot };
  } catch (error: unknown) {
    const code = getErrorCode(error);
    console.warn("getFriendsSnapshot failed", code ?? error);
    return { ok: false, message: mapFirestoreError(code) };
  }
}

export function subscribeFriendsSnapshot(
  onData: (snapshot: FriendsSnapshot) => void,
  onError?: (message: string) => void,
) {
  const current = auth.currentUser;
  if (!current) {
    onError?.("Debes iniciar sesion");
    return () => {};
  }

  const incomingQ = query(
    collection(db, "friend_requests"),
    where("toUid", "==", current.uid),
    where("status", "==", "pending"),
  );
  const outgoingQ = query(
    collection(db, "friend_requests"),
    where("fromUid", "==", current.uid),
    where("status", "==", "pending"),
  );
  const friendshipsQ = query(
    collection(db, "friendships"),
    where("users", "array-contains", current.uid),
  );

  let syncing = false;
  const sync = async () => {
    if (syncing) return;
    syncing = true;
    try {
      onData(await buildFriendsSnapshot(current.uid));
    } catch (error: unknown) {
      onError?.(mapFirestoreError(getErrorCode(error)));
    } finally {
      syncing = false;
    }
  };

  const unsubs = [
    onSnapshot(
      incomingQ,
      () => void sync(),
      (error) => onError?.(mapFirestoreError(error?.code)),
    ),
    onSnapshot(
      outgoingQ,
      () => void sync(),
      (error) => onError?.(mapFirestoreError(error?.code)),
    ),
    onSnapshot(
      friendshipsQ,
      () => void sync(),
      (error) => onError?.(mapFirestoreError(error?.code)),
    ),
  ];

  void sync();
  return () => {
    unsubs.forEach((unsub) => {
      unsub();
    });
  };
}

export async function acceptFriendRequest(fromUid: string) {
  try {
    const current = auth.currentUser;
    if (!current) return { ok: false, message: "Debes iniciar sesion" };

    const requestRef = doc(db, "friend_requests", `${fromUid}_${current.uid}`);
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists())
      return { ok: false, message: "Solicitud no encontrada" };

    const batch = writeBatch(db);
    batch.set(doc(db, "friendships", pairId(fromUid, current.uid)), {
      users: [fromUid, current.uid],
      createdAt: Date.now(),
    });
    batch.delete(requestRef);
    await batch.commit();
    return { ok: true };
  } catch (error: unknown) {
    const code = getErrorCode(error);
    console.warn("acceptFriendRequest failed", code ?? error);
    return { ok: false, message: mapFirestoreError(code) };
  }
}

export async function rejectFriendRequest(fromUid: string) {
  try {
    const current = auth.currentUser;
    if (!current) return { ok: false, message: "Debes iniciar sesion" };

    await deleteDoc(doc(db, "friend_requests", `${fromUid}_${current.uid}`));
    return { ok: true };
  } catch (error: unknown) {
    const code = getErrorCode(error);
    console.warn("rejectFriendRequest failed", code ?? error);
    return { ok: false, message: mapFirestoreError(code) };
  }
}

export async function cancelFriendRequest(toUid: string) {
  try {
    const current = auth.currentUser;
    if (!current) return { ok: false, message: "Debes iniciar sesion" };

    await deleteDoc(doc(db, "friend_requests", `${current.uid}_${toUid}`));
    return { ok: true };
  } catch (error: unknown) {
    const code = getErrorCode(error);
    console.warn("cancelFriendRequest failed", code ?? error);
    return { ok: false, message: mapFirestoreError(code) };
  }
}

export async function removeFriend(friendUid: string) {
  try {
    const current = auth.currentUser;
    if (!current) return { ok: false, message: "Debes iniciar sesion" };

    await deleteDoc(doc(db, "friendships", pairId(current.uid, friendUid)));
    return { ok: true };
  } catch (error: unknown) {
    const code = getErrorCode(error);
    console.warn("removeFriend failed", code ?? error);
    return { ok: false, message: mapFirestoreError(code) };
  }
}

export async function blockUser(targetUid: string) {
  try {
    const current = auth.currentUser;
    if (!current) return { ok: false, message: "Debes iniciar sesion" };
    if (current.uid === targetUid)
      return { ok: false, message: "No puedes bloquearte a ti mismo" };

    // Create block first; cleanup is best-effort and should never block this action.
    await setDoc(doc(db, "blocks", blockId(current.uid, targetUid)), {
      blockerUid: current.uid,
      blockedUid: targetUid,
      createdAt: Date.now(),
    });

    await Promise.allSettled([
      deleteDoc(doc(db, "friendships", pairId(current.uid, targetUid))),
      deleteDoc(doc(db, "friend_requests", `${current.uid}_${targetUid}`)),
      deleteDoc(doc(db, "friend_requests", `${targetUid}_${current.uid}`)),
    ]);

    return { ok: true };
  } catch (error: unknown) {
    const code = getErrorCode(error);
    console.warn("blockUser failed", code ?? error);
    return { ok: false, message: mapFirestoreError(code) };
  }
}

export async function unblockUser(targetUid: string) {
  try {
    const current = auth.currentUser;
    if (!current) return { ok: false, message: "Debes iniciar sesion" };

    await deleteDoc(doc(db, "blocks", blockId(current.uid, targetUid)));
    return { ok: true };
  } catch (error: unknown) {
    const code = getErrorCode(error);
    console.warn("unblockUser failed", code ?? error);
    return { ok: false, message: mapFirestoreError(code) };
  }
}

export async function getBlockedUsers() {
  try {
    const current = auth.currentUser;
    if (!current) return { ok: false, message: "Debes iniciar sesion" };

    const blocksQ = query(
      collection(db, "blocks"),
      where("blockerUid", "==", current.uid),
    );
    const blocksSnap = await getDocs(blocksQ);
    const blockedUids = blocksSnap.docs
      .map((d) => d.data().blockedUid as string)
      .filter(Boolean);

    const users = await Promise.all(
      blockedUids.map((uid) => getPublicUserDoc(uid)),
    );
    const blockedUsers: BlockedUser[] = users
      .filter((u): u is PublicUser => Boolean(u?.uid))
      .map((u) => ({ uid: u.uid, username: u.username }));

    return { ok: true, blockedUsers };
  } catch (error: unknown) {
    const code = getErrorCode(error);
    console.warn("getBlockedUsers failed", code ?? error);
    return { ok: false, message: mapFirestoreError(code) };
  }
}

export async function deleteCurrentAccount() {
  const current = auth.currentUser;
  if (!current) return { ok: false, message: "No hay sesion activa" };

  const uid = current.uid;

  try {
    // Best-effort cleanup of relationship records linked to this account.
    // If cleanup fails (e.g. missing index), account deletion should still continue.
    try {
      const [incomingReq, outgoingReq, friendships, myBlocks] =
        await Promise.all([
          getDocs(
            query(collection(db, "friend_requests"), where("toUid", "==", uid)),
          ),
          getDocs(
            query(
              collection(db, "friend_requests"),
              where("fromUid", "==", uid),
            ),
          ),
          getDocs(
            query(
              collection(db, "friendships"),
              where("users", "array-contains", uid),
            ),
          ),
          getDocs(
            query(collection(db, "blocks"), where("blockerUid", "==", uid)),
          ),
        ]);

      const batch = writeBatch(db);
      const refs = [
        ...incomingReq.docs,
        ...outgoingReq.docs,
        ...friendships.docs,
        ...myBlocks.docs,
      ].map((snap) => snap.ref);

      refs.forEach((ref) => {
        batch.delete(ref);
      });
      await batch.commit();
    } catch (cleanupError) {
      console.warn("deleteCurrentAccount cleanup skipped", cleanupError);
    }

    // These two documents are the critical account records and must be removed.
    await Promise.all([
      deleteDoc(doc(db, "users", uid)),
      deleteDoc(doc(db, "user_public", uid)),
    ]);

    try {
      await firebaseDeleteUser(current);
    } catch (authError) {
      const code = getErrorCode(authError);
      if (code === "auth/requires-recent-login") {
        await signOut(auth);
        return {
          ok: false,
          message:
            "La cuenta se elimino de la base de datos, pero debes iniciar sesion de nuevo para eliminarla tambien en autenticacion.",
        };
      }
      await signOut(auth);
      return { ok: false, message: mapAuthError(code) };
    }

    return { ok: true };
  } catch (error: unknown) {
    const code = getErrorCode(error);
    console.warn("deleteCurrentAccount failed", code ?? error);
    return { ok: false, message: mapFirestoreError(code) };
  }
}
