import { Button } from '@/ui/components/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/ui/components/shadcn/card';
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

          <Button type="button" variant="outline" onClick={toggleTheme}>
            Tema: {theme === 'dark' ? 'Oscuro' : 'Claro'}
          </Button>
        </header>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Demo Tailwind + Tokens + shadcn/ui</CardTitle>
            <CardDescription>
              Este bloque usa componentes base de shadcn y variables de index.css.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button>Botón Primary (shadcn)</Button>

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
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default App;
