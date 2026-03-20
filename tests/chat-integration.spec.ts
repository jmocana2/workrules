/**
 * Tests E2E de integracion del Chat
 *
 * Verifica el flujo completo de usuario:
 * 1. Seleccionar convenio
 * 2. Enviar pregunta
 * 3. Recibir respuesta (con mocks por ahora)
 *
 * Nota: Estos tests usan mocks (VITE_USE_MOCKS=true) ya que
 * requeririan Supabase local corriendo para la API real.
 */

import { expect, test } from "@playwright/test";
import { ChatPage } from "./pages/ChatPage";

test.describe("Chat Integration", () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
  });

  test("la pagina de chat carga correctamente", async () => {
    await chatPage.goto();

    // Verificar que la pagina carga - debe tener el selector de convenio
    await expect(chatPage.convenioSelector).toBeVisible({ timeout: 10000 });
  });

  test("puede seleccionar un convenio del selector", async () => {
    await chatPage.goto();

    // El selector debe estar visible
    await expect(chatPage.convenioSelector).toBeVisible({ timeout: 10000 });

    // Abrir el selector
    await chatPage.convenioSelector.click();

    // Debe mostrar el input de busqueda
    await expect(chatPage.convenioInput).toBeVisible({ timeout: 5000 });
  });

  test("el input de chat esta deshabilitado sin convenio seleccionado", async () => {
    await chatPage.goto();

    // Esperar a que cargue la pagina
    await expect(chatPage.convenioSelector).toBeVisible({ timeout: 10000 });

    // El input debe estar deshabilitado inicialmente
    await expect(chatPage.chatInput).toBeDisabled();
  });

  test("muestra estado vacio con mensaje descriptivo", async () => {
    await chatPage.goto();

    // Esperar a que cargue la pagina
    await expect(chatPage.convenioSelector).toBeVisible({ timeout: 10000 });

    // Debe mostrar el titulo del estado vacio (selecciona un convenio)
    await expect(chatPage.emptyStateTitle).toBeVisible();
  });

  test("muestra el Sidebar con boton de nueva conversacion", async () => {
    await chatPage.goto();

    // Esperar a que cargue la pagina
    await expect(chatPage.convenioSelector).toBeVisible({ timeout: 10000 });

    // El sidebar debe mostrar el boton de nueva conversacion
    await expect(chatPage.newConversationButton).toBeVisible();
  });
});

test.describe("Chat Flow con Mock", () => {
  test.skip(
    "flujo completo: seleccionar convenio y ver chips de variables",
    async ({ page }) => {
      const chatPage = new ChatPage(page);
      await chatPage.goto();

      // Seleccionar convenio (usando mock)
      await chatPage.selectConvenio("Hosteleria");

      // Despues de seleccionar, el input debe habilitarse
      const textarea = page.locator("textarea");
      await expect(textarea).toBeEnabled({ timeout: 5000 });

      // Deberian aparecer chips de variables en el VariablesPanel
      const variableChips = page.locator('[data-testid="variable-chip"]');
      // Con mocks, deberian aparecer algunos chips
      await expect(variableChips.first()).toBeVisible({ timeout: 5000 });
    }
  );
});
