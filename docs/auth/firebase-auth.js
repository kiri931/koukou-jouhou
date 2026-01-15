// /auth/firebase-auth.js
// Firebaseの設定が存在しない場合（firebase-config.jsが無い/空）でも
// 例外で呼び出し側に伝え、UIを無効化できるようにする。

export async function initFirebase() {
  const { firebaseConfig } = await import("./firebase-config.js");

  if (!firebaseConfig?.apiKey || !firebaseConfig?.authDomain) {
    throw new Error("Firebase config is missing");
  }

  const { initializeApp } = await import(
    "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"
  );
  const {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
  } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  return {
    async signInWithGoogle() {
      const cred = await signInWithPopup(auth, provider);
      return cred.user;
    },
  };
}
