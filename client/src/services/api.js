const BASE = import.meta.env.VITE_API_URL || "";

// Safe storage: works even when localStorage/sessionStorage is blocked
// (WhatsApp/Instagram in-app browsers, private mode, strict privacy settings)
function makeStore(kind) {
  const memory = new Map();
  return {
    get(key) {
      try {
        const value = window[kind].getItem(key);
        if (value !== null) return value;
      } catch {
        /* storage blocked */
      }
      return memory.has(key) ? memory.get(key) : null;
    },
    set(key, value) {
      memory.set(key, String(value));
      try {
        window[kind].setItem(key, String(value));
      } catch {
        /* storage blocked */
      }
    },
    remove(key) {
      memory.delete(key);
      try {
        window[kind].removeItem(key);
      } catch {
        /* storage blocked */
      }
    },
  };
}
export const local = makeStore("localStorage");
export const session = makeStore("sessionStorage");

export function token() {
  return local.get("yatra_token");
}

export function saveToken(value) {
  try {
    window.local.set("yatra_token", value);
    return true;
  } catch {
    return false;
  }
}

export function removeToken() {
  try {
    window.local.remove("yatra_token");
  } catch {
    // Storage may be unavailable.
  }
}

export async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const savedToken = token();

  if (savedToken) {
    headers.Authorization = `Bearer ${savedToken}`;
  }

  const r = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await r.json().catch(() => ({
    message: "Unexpected server response.",
  }));

  if (!r.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}
