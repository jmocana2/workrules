/**
 * App - Entry point de la aplicacion WorkRules
 *
 * Renderiza el ChatPage con la funcionalidad completa de consulta de convenios colectivos.
 * Incluye un login minimo para pruebas (sera reemplazado en Fase 4).
 */

import { ChatPage } from "@ui/components/workrules/pages/ChatPage/ChatPage";
import { useSupabase } from "@ui/hooks/useSupabase";
import { type FormEvent, useState } from "react";

/**
 * Login minimo para pruebas - sera reemplazado en Fase 4
 */
function SimpleLogin() {
  const { signIn } = useSupabase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">WorkRules</h1>
        <p className="text-sm text-neutral-500 text-center mb-6">
          Login para pruebas (Fase 4 tendra UI completa)
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
              autoComplete="current-password"
            />          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Iniciando sesion..." : "Iniciar sesion"}
          </button>
        </form>     
      </div>
    </div>
  );
}

// En modo E2E testing, omitir autenticacion
const isE2ETesting = import.meta.env.VITE_E2E_TESTING === "true";

function App() {
  const { user, loading } = useSupabase();

  // En modo E2E, mostrar ChatPage directamente sin autenticacion
  if (isE2ETesting) {
    return <ChatPage />;
  }

  // Mostrar loading mientras se verifica la sesion
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-500">Cargando...</p>
      </div>
    );
  }

  // Si no hay usuario, mostrar login
  if (!user) {
    return <SimpleLogin />;
  }

  // Usuario autenticado, mostrar ChatPage
  return <ChatPage />;
}

export default App;
