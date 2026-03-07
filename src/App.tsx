import { useEffect, useState } from 'react';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => {
    setTheme(currentTheme => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-primary">WorkRules</h1>
            <p className="text-muted-foreground">Consulta de Convenios Colectivos</p>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-card-foreground hover:bg-muted"
          >
            Tema: {theme === 'dark' ? 'Oscuro' : 'Claro'}
          </button>
        </header>

        <section className="rounded-xl border border-border bg-card p-6 shadow-md">
          <h2 className="text-lg font-semibold text-card-foreground">Demo Tailwind + Tokens</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Este bloque usa clases de Tailwind conectadas a `index.css`.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90">
              Botón Primary (Tailwind)
            </button>

            <div
              className="rounded-md border px-4 py-2 text-sm"
              style={{
                backgroundColor: 'var(--app-muted)',
                borderColor: 'var(--colorsAccentAccent7)',
                color: 'var(--app-foreground)'
              }}
            >
              Caja usando variables generadas por Style Dictionary
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
