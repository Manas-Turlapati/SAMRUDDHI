import { useEffect, useRef, useState } from "react";

const GOOGLE_SCRIPT_ID = "google-identity-services";

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.id) return Promise.resolve();

  let script = document.getElementById(GOOGLE_SCRIPT_ID);
  if (!script) {
    script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }

  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
  });
}

export default function GoogleSignInButton({ onCredential, onError }) {
  const mountRef = useRef(null);
  const callbacksRef = useRef({ onCredential, onError });
  const [status, setStatus] = useState("");
  const [buttonReady, setButtonReady] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    callbacksRef.current = { onCredential, onError };
  }, [onCredential, onError]);

  useEffect(() => {
    if (!clientId) {
      setStatus("Google sign-in is not configured.");
      return undefined;
    }

    let active = true;
    setButtonReady(false);
    setStatus("Loading Google sign-in...");

    loadGoogleIdentityServices()
      .then(() => {
        if (!active || !mountRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => callbacksRef.current.onCredential(credential),
        });
        window.google.accounts.id.renderButton(mountRef.current, {
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: "signin_with",
          width: Math.min(mountRef.current.clientWidth || 360, 360),
        });
        setButtonReady(true);
        setStatus("");
      })
      .catch(() => {
        if (active) {
          setStatus("Google sign-in could not be loaded. Please try again later.");
          callbacksRef.current.onError("Google sign-in could not be loaded. Please try again later.");
        }
      });

    return () => {
      active = false;
      if (mountRef.current) mountRef.current.replaceChildren();
    };
  }, [clientId]);

  return (
    <div className="google-auth-area">
      <div className="auth-divider"><span>or</span></div>
      <div ref={mountRef} className="google-signin-button" />
      {!buttonReady && (
        <button
          className="google-fallback-button"
          type="button"
          onClick={() => callbacksRef.current.onError(clientId
            ? "Google sign-in is still loading. Please try again."
            : "Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID to the frontend environment.")}
          aria-label="Sign in with Google"
        >
          <svg aria-hidden="true" viewBox="0 0 48 48" className="google-logo">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.9c-.58 2.96-2.25 5.48-4.72 7.18l7.62 5.91c4.45-4.1 7.18-10.14 7.18-17.56Z" />
            <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.89l-7.62-5.91c-2.12 1.42-4.84 2.26-8.28 2.26-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
          </svg>
          <span>Sign in with Google</span>
        </button>
      )}
      {status && <p className="google-auth-status" role="status">{status}</p>}
    </div>
  );
}
