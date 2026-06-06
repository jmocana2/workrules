/**
 * App - Entry point de la aplicacion WorkRules
 */

import { ChatPage } from "@ui/components/workrules/pages/ChatPage/ChatPage";
import { LandingPage } from "@ui/components/workrules/pages/LandingPage";
import { useSupabase } from "@ui/hooks/useSupabase";

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

  // Si no hay usuario, mostrar landing con login
  if (!user) {
    return <LandingPage />;
  }

  // Usuario autenticado, mostrar ChatPage
  return <ChatPage />;
}

export default App;
