import { beforeEach, describe, expect, it, vi } from "vitest";
import { useThemeStore } from "./themeStore";

// This block runs before any beforeEach resets the store, capturing the real
// initial state produced by the module-level initialization in themeStore.ts.
// With matchMedia mocked (matches: false) the module calls getSystemTheme() → 'light'.
describe("themeStore - Estado inicial al cargar el módulo", () => {
  it("inicializa con el tema del sistema (light) cuando matchMedia no prefiere dark", () => {
    const { theme } = useThemeStore.getState();
    expect(theme).toBe("light");
  });
});

describe("themeStore", () => {
  beforeEach(() => {
    // Limpiar localStorage
    localStorage.clear();

    // Limpiar data-theme del document
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.className = "";

    // Reset del store
    useThemeStore.setState({ theme: "dark" });

    // Mock de matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  describe("Estado inicial", () => {
    it("el beforeEach restaura el store a dark", () => {
      const { theme } = useThemeStore.getState();
      expect(theme).toBe("dark");
    });
  });

  describe("setTheme", () => {
    it("cambia el tema a light", () => {
      const { setTheme } = useThemeStore.getState();
      setTheme("light");

      expect(useThemeStore.getState().theme).toBe("light");
    });

    it("cambia el tema a dark", () => {
      const { setTheme } = useThemeStore.getState();
      setTheme("light"); // Primero cambiamos a light
      setTheme("dark");

      expect(useThemeStore.getState().theme).toBe("dark");
    });

    it("actualiza data-theme en el document cuando cambia a light", () => {
      const { setTheme } = useThemeStore.getState();
      setTheme("light");

      expect(document.documentElement.dataset.theme).toBe("light");
    });

    it("actualiza data-theme en el document cuando cambia a dark", () => {
      const { setTheme } = useThemeStore.getState();
      setTheme("dark");

      expect(document.documentElement.dataset.theme).toBe("dark");
    });

    it("añade clase light al documentElement cuando tema es light", () => {
      const { setTheme } = useThemeStore.getState();
      setTheme("light");

      expect(document.documentElement.classList.contains("light")).toBe(true);
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("añade clase dark al documentElement cuando tema es dark", () => {
      const { setTheme } = useThemeStore.getState();
      setTheme("dark");

      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.classList.contains("light")).toBe(false);
    });
  });

  describe("toggleTheme", () => {
    it("cambia de dark a light", () => {
      useThemeStore.setState({ theme: "dark" });
      const { toggleTheme } = useThemeStore.getState();

      toggleTheme();

      expect(useThemeStore.getState().theme).toBe("light");
    });

    it("cambia de light a dark", () => {
      useThemeStore.setState({ theme: "light" });
      const { toggleTheme } = useThemeStore.getState();

      toggleTheme();

      expect(useThemeStore.getState().theme).toBe("dark");
    });

    it("actualiza el data-theme del document después del toggle", () => {
      useThemeStore.setState({ theme: "dark" });
      const { toggleTheme } = useThemeStore.getState();

      toggleTheme();

      expect(document.documentElement.dataset.theme).toBe("light");
    });

    it("cicla correctamente dark -> light -> dark", () => {
      useThemeStore.setState({ theme: "dark" });
      const { toggleTheme } = useThemeStore.getState();

      toggleTheme();
      expect(useThemeStore.getState().theme).toBe("light");

      toggleTheme();
      expect(useThemeStore.getState().theme).toBe("dark");
    });
  });

  describe("Persistencia", () => {
    it("persiste el tema en localStorage cuando cambia", () => {
      const { setTheme } = useThemeStore.getState();
      setTheme("light");

      const stored = localStorage.getItem("workrules-theme");
      expect(stored).toBeTruthy();
      expect(stored).toContain("light");
    });

    it("persiste el toggle en localStorage", () => {
      useThemeStore.setState({ theme: "dark" });
      const { toggleTheme } = useThemeStore.getState();

      toggleTheme();

      const stored = localStorage.getItem("workrules-theme");
      expect(stored).toBeTruthy();
      expect(stored).toContain("light");
    });
  });
});
