import { useApp } from "../context/AppContext";
import { ArrowRight, Compass, LoaderCircle, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const { authMode, setAuthMode, busy, go, authSubmit } = useApp();
  const View = () => (
    <main className="authPage">
      <div className="authArt">
        <span className="kicker">A GOOD TRIP IS CLOSER THAN YOU THINK</span>
        <h2>
          Make your
          <br />
          next story <em>happen.</em>
        </h2>
        <p>Sign in, save your details and keep your bookings together.</p>
      </div>
      <div className="authCard">
        <button className="backLink" onClick={() => go("home")}>
          ← Back to journeys
        </button>
        <span className="authIcon">
          <Compass />
        </span>
        <h1>{authMode === "signup" ? "Join the journey" : "Welcome back"}</h1>
        <p>
          {authMode === "signup"
            ? "Create an account to start planning trips."
            : "Sign in to manage your bookings."}
        </p>
        <form onSubmit={authSubmit}>
          {authMode === "signup" && (
            <label>
              Your name
              <input name="name" required placeholder="e.g. Priya Sharma" />
            </label>
          )}
          <label>
            Email address
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
            />
          </label>
          {authMode === "signup" && (
            <label>
              Phone number
              <input name="phone" placeholder="+91" />
            </label>
          )}
          <label>
            Password
            <input
              type="password"
              name="password"
              minLength={authMode === "signup" ? 8 : undefined}
              required
              placeholder="At least 8 characters"
            />
          </label>
          <button className="btn btn-dark full" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" />
            ) : authMode === "signup" ? (
              "Create my account"
            ) : (
              "Sign in"
            )}{" "}
            <ArrowRight />
          </button>
        </form>
        <div className="authSwitch">
          {authMode === "signup" ? "Already have an account?" : "New to Yatra?"}{" "}
          <button
            onClick={() =>
              setAuthMode(authMode === "signup" ? "login" : "signup")
            }
          >
            {authMode === "signup" ? "Sign in" : "Create account"}
          </button>
        </div>
        <small className="secureNote">
          <ShieldCheck />
          Your details are used to manage your trip.
        </small>
      </div>
    </main>
  );
  return View();
}
