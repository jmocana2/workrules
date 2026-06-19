import { AUTH_TEXTS } from "@/constants";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/ui/components/shadcn/dialog";
import { Logo } from "@ui/components/workrules/atoms/Logo/Logo";
import { useSupabase } from "@ui/hooks/useSupabase";
import { Eye, EyeOff, Github, PlayCircle } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

const DEMO_VIDEO_ID = "ToEGWSl5mHM";

const QUESTIONS = [
  "¿Cuánto cobraría una gobernanta de piso con 10 años de antigüedad?",
  "¿Qué plus de nocturnidad le corresponde a un conductor?",
  "¿Cuántos días de vacaciones tiene un dependiente a jornada completa?",
  "¿Cuál es el salario base de un oficial de 1ª?",
  "¿Qué indemnización por despido objetivo tiene un administrativo con 4 años?",
  "¿Qué pluses cobra un peón agrícola en temporada de recolección?",
  "¿Cuál es la jornada máxima anual de un operario del metal?",
  "¿Tengo derecho a permiso retribuido por mudanza?",
  "¿Cómo se calculan las pagas extra de un profesor?",
  "¿Qué complemento de antigüedad me corresponde tras 6 años en la empresa?",
];

const BG_IMAGE =
  "https://images.unsplash.com/photo-1553028826-f4804a6dba3b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxidXNpbmVzcyUyMG1lZXRpbmclMjBjb2xvcmZ1bCUyMG1vZGVybiUyMG9mZmljZSUyMHRlYW13b3JrfGVufDF8fHx8MTc4MDczMjMzNHww&ixlib=rb-4.1.0&q=80&w=1080";

export function LandingPage() {
  const { signIn } = useSupabase();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(60);

  useEffect(() => {
    const current = QUESTIONS[loopNum % QUESTIONS.length];
    const updated = isDeleting
      ? current.substring(0, typedText.length - 1)
      : current.substring(0, typedText.length + 1);

    let deleteTimer: ReturnType<typeof setTimeout> | null = null;

    const timer = setTimeout(() => {
      setTypedText(updated);

      if (!isDeleting && updated === current) {
        deleteTimer = setTimeout(() => setIsDeleting(true), 2000);
        setTypingSpeed(20);
      } else if (isDeleting && updated === "") {
        setIsDeleting(false);
        setLoopNum((n) => n + 1);
        setTypingSpeed(60);
      }
    }, typingSpeed);

    return () => {
      clearTimeout(timer);
      if (deleteTimer) clearTimeout(deleteTimer);
    };
  }, [typedText, isDeleting, loopNum, typingSpeed]);

  const translateAuthError = (message: string, code?: string): string => {
    const lower = message.toLowerCase();

    if (lower.includes("failed to fetch") || lower.includes("network")) {
      return AUTH_TEXTS.errors.network;
    }

    switch (code) {
      case "invalid_credentials":
        return AUTH_TEXTS.errors.invalidCredentials;
      case "email_not_confirmed":
        return AUTH_TEXTS.errors.emailNotConfirmed;
      case "user_not_found":
        return AUTH_TEXTS.errors.userNotFound;
      case "over_request_rate_limit":
      case "over_email_send_rate_limit":
        return AUTH_TEXTS.errors.rateLimit;
      case "weak_password":
        return AUTH_TEXTS.errors.weakPassword;
      case "user_banned":
        return AUTH_TEXTS.errors.userBanned;
    }

    if (lower.includes("invalid login credentials")) {
      return AUTH_TEXTS.errors.invalidCredentials;
    }
    if (lower.includes("email not confirmed")) {
      return AUTH_TEXTS.errors.emailNotConfirmed;
    }

    return AUTH_TEXTS.errors.generic;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError(translateAuthError(result.error.message, result.error.code));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(translateAuthError(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#c4b5fd]">
      {/* Imagen de fondo con opacity-70 sobre el lila (igual que el panel original) */}
      <img
        src={BG_IMAGE}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-60"
      />
      {/* Velo oscuro para dar profundidad */}
      <div aria-hidden="true" className="absolute inset-0 bg-black/45" />

      {/* Contenido */}
      <div className="relative z-10 flex flex-col min-h-screen px-6 py-8 md:px-12 md:py-10 md:pl-[75px] min-[1400px]:!pl-12">
        {/* Header: solo logo */}
        <header className="flex items-start justify-between gap-6">
          <Logo variant="full" size="lg" theme="dark" className="text-white -ml-[15px] -mt-[10px] [&_svg]:!h-18 [&_svg]:!w-auto md:[&_svg]:!h-[88px]" />
        </header>

        {/* Main: slogan izquierda + login derecha */}
        <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-center py-10 pt-[5px] md:pt-10">
          {/* Columna izquierda: slogan + ejemplos + botón slides */}
          <div className="flex flex-col gap-5 min-[1400px]:max-w-[500px] min-[1400px]:mx-auto">
            <h1
              className="text-white text-4xl md:text-[38px] min-[1200px]:!text-[3.5rem] font-medium leading-[1.1] tracking-tight drop-shadow-lg max-w-[500px]"
              style={{ fontFamily: '"Fraunces", "Spectral", Georgia, serif' }}
            >
              Tus dudas laborales,{" "}
              <span className="italic font-medium">resueltas al instante.</span>
            </h1>

            <p className="text-white/90 text-lg md:text-xl leading-relaxed drop-shadow-md min-h-[3.5em] max-w-xl">
              {typedText}
              <span className="inline-block w-0.5 h-5 bg-white ml-1 align-middle animate-pulse" />
            </p>

            <div className="flex items-center gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="bg-white hover:bg-white/90 text-black px-4 py-2 rounded-xl text-[0.85rem] font-medium transition-all shadow-lg inline-flex items-center gap-1.5"
                    title="Ver demo del producto"
                  >
                    <PlayCircle size={22} />
                    Ver demo (2 min)
                  </button>
                </DialogTrigger>
                <DialogContent
                  showCloseButton
                  className="sm:max-w-[min(1800px,95vw)] p-0 bg-black border-0 overflow-hidden"
                >
                  <DialogTitle className="sr-only">
                    WorkRules — Demo del producto
                  </DialogTitle>
                  <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${DEMO_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
                      title="WorkRules — Demo del producto"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                </DialogContent>
              </Dialog>
              <a
                href="https://github.com/jmocana2/workrules"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white hover:bg-white/90 text-black p-2 rounded-xl transition-all shadow-lg inline-flex items-center justify-center"
                title="Código fuente en GitHub"
                aria-label="Código fuente en GitHub"
              >
                <Github size={18} />
              </a>
            </div>
          </div>

          {/* Columna derecha: card login transparente con borde blanco */}
          <div className="flex justify-center">
            <div
              className="w-full max-w-sm bg-white/10 backdrop-blur-[24px] border-[3px] border-white/60 rounded-3xl p-6 md:p-7"
           
            >
              <h2 className="text-lg md:text-[20px] font-medium text-white leading-[1.3] tracking-tight mb-5">
                {AUTH_TEXTS.form.title}
              </h2>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="usuario" className="block text-sm text-white mb-1.5">
                    {AUTH_TEXTS.form.emailLabel}
                  </label>
                  <input
                    id="usuario"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={AUTH_TEXTS.form.emailPlaceholder}
                    autoComplete="email"
                    required
                    className="w-full px-3.5 py-2.5 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all bg-white text-black placeholder:text-black/40"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm text-white mb-1.5">
                    {AUTH_TEXTS.form.passwordLabel}
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={AUTH_TEXTS.form.passwordPlaceholder}
                      autoComplete="current-password"
                      required
                      className="w-full px-3.5 py-2.5 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all pr-12 bg-white text-black placeholder:text-black/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-black/50 hover:text-black transition-colors"
                      aria-label={showPassword ? AUTH_TEXTS.form.hidePassword : AUTH_TEXTS.form.showPassword}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-100 bg-red-500/30 border border-red-300/40 p-2 rounded">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[var(--colorsAccentAccent9)] hover:bg-[var(--colorsAccentAccent10)] text-white py-2.5 rounded-xl font-medium transition-all mt-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? AUTH_TEXTS.form.submitting : AUTH_TEXTS.form.submit}
                </button>
              </form>

            </div>
          </div>
        </main>

        {/* Footer: copyright */}
        <footer>
          <p className="text-xs text-white/70 text-center">
            Copyright © {new Date().getFullYear()} WorkRules. Todos los derechos reservados
          </p>
        </footer>
      </div>
    </div>
  );
}
