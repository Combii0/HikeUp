"use client";

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect } from "react";
import { auth, db } from "../../lib/firebase";

export default function ThemeInitializer() {
  useEffect(() => {
    const setTheme = (theme?: string) => {
      const safeTheme =
        theme === "blue" || theme === "purple" ? theme : "orange";
      document.documentElement.setAttribute("data-accent", safeTheme);
    };

    setTheme("orange");

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setTheme("orange");
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
        const accountTheme = userSnap.data()?.accentTheme;
        setTheme(accountTheme);
      } catch {
        setTheme("orange");
      }
    });

    return () => unsubscribe();
  }, []);

  return null;
}
