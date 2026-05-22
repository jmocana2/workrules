/**
 * Tests E2E criticos del Chat (TFM.7 - Tarea 6)
 *
 * Cubre los 3 flujos clave del producto:
 *  1. Consulta general -> respuesta con citation
 *  2. Calculo de salario con datos completos -> desglose
 *  3. Calculo con datos incompletos -> DataRequestCard
 *
 * Estrategia: page.route() intercepta las llamadas a Supabase REST,
 * Auth y a la Edge Function /chat para que los tests funcionen en CI
 * sin necesidad de Supabase real.
 */

import { type Page, expect, test } from "@playwright/test";
import { ChatPage } from "./pages/ChatPage";

const CONVENIO_ID = "00000000-0000-0000-0000-000000000001";
const CONVENIO_NOMBRE = "Hosteleria Madrid";
// Texto que aparece en el dropdown: `${nombre_corto} — ${ambito_territorial}`
const CONVENIO_DISPLAY = "Hosteleria MAD";

const MOCK_CONVENIO = {
  id: CONVENIO_ID,
  nombre: CONVENIO_NOMBRE,
  nombre_oficial: "Convenio Colectivo de Hosteleria de Madrid",
  nombre_corto: "Hosteleria MAD",
  ambito: "provincial",
  ambito_territorial: "Madrid",
  codigo_regcon: "28000123",
  fecha_vigencia: "2025-12-31",
  url_pdf: "https://example.com/convenio.pdf",
  estado: "activo",
  visibilidad: "publico",
  owner_id: null,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

/**
 * Construye un body SSE valido a partir de una secuencia de eventos.
 */
function buildSseBody(events: Array<Record<string, unknown>>): string {
  return events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
}

/**
 * Registra los mocks de red comunes a todos los tests:
 *  - GET convenios -> [MOCK_CONVENIO]
 *  - GET resto de tablas (vacio)
 *  - auth/v1/user -> 200 vacio (modo E2E omite auth)
 */
async function setupCommonMocks(page: Page) {
  // Inyectar sesion fake en localStorage para que supabase.auth.getSession()
  // devuelva un access_token y streamChat no lance "No hay sesion activa".
  // La clave depende del host del VITE_SUPABASE_URL (project ref).
  await page.addInitScript(() => {
    const fakeSession = {
      access_token: "fake-jwt-token-for-e2e",
      refresh_token: "fake-refresh-token",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user: {
        id: "00000000-0000-0000-0000-000000000099",
        aud: "authenticated",
        email: "e2e@example.com",
      },
    };
    // Cubrir cualquier storageKey que use supabase-js (sb-*-auth-token)
    const value = JSON.stringify(fakeSession);
    try {
      // Clave generica + claves comunes posibles
      localStorage.setItem("sb-localhost-auth-token", value);
      localStorage.setItem("supabase.auth.token", value);
    } catch {
      /* ignore */
    }
  });

  // Auth endpoints — devolver un user/session fake para CUALQUIER /auth/v1/*
  await page.route(/\/auth\/v1\/.*/, (route) => {
    const url = route.request().url();
    if (url.includes("/token")) {
      // Refresh token
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "fake-jwt-token-for-e2e",
          refresh_token: "fake-refresh-token",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: "bearer",
          user: {
            id: "00000000-0000-0000-0000-000000000099",
            aud: "authenticated",
            email: "e2e@example.com",
          },
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "00000000-0000-0000-0000-000000000099",
        email: "e2e@example.com",
        aud: "authenticated",
      }),
    });
  });

  // REST convenios
  await page.route(/\/rest\/v1\/convenios.*/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([MOCK_CONVENIO]),
    }),
  );

  // chat_sessions: GET = lista vacia, POST insert -> devolver fila con id
  await page.route(/\/rest\/v1\/chat_sessions.*/, (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: "11111111-1111-1111-1111-111111111111" }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // chat_messages: vacio (GET) y aceptar inserts
  await page.route(/\/rest\/v1\/chat_messages.*/, (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // perfil_json y user_convenios y user_profiles -> []
  await page.route(
    /\/rest\/v1\/(perfil_json|user_convenios|user_profiles).*/,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      }),
  );

}

test.describe.configure({ mode: "serial" });

test.describe("Flujos E2E criticos de chat", () => {
  test("1. Consulta general devuelve respuesta con citation", async ({ page }) => {
    await setupCommonMocks(page);

    // Mock /chat: stream con un fragmento de texto + citation + done
    await page.route(/\/functions\/v1\/chat$/, (route) =>
      route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream" },
        body: buildSseBody([
          { type: "text", content: "El periodo de prueba es de 60 dias." },
          {
            type: "citation",
            articulo: "Articulo 14",
            seccion: "Periodo de prueba",
            url_pdf: "https://example.com/convenio.pdf",
            pagina: 8,
          },
          { type: "done", metadata: { response_length: 32 } },
        ]),
      }),
    );

    const chat = new ChatPage(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await chat.convenioSelector.waitFor({ state: "visible", timeout: 30000 });
    await chat.selectConvenio(CONVENIO_DISPLAY);

    await expect(chat.chatInput).toBeEnabled({ timeout: 5000 });
    await chat.chatInput.fill("Cual es el periodo de prueba?");
    const submitBtn = page.locator('button[type="submit"]').last();
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    // Esperar respuesta visible (el texto se renderiza en assistant message)
    await expect(page.getByText(/periodo de prueba es de 60 dias/i)).toBeVisible({
      timeout: 10000,
    });

    // La UI de citations muestra "N fuente(s)" como trigger
    await expect(page.getByText(/\d{1,3} fuentes?/i)).toBeVisible({ timeout: 5000 });
  });

  test("2. Calculo de salario con datos completos muestra desglose", async ({
    page,
  }) => {
    await setupCommonMocks(page);

    await page.route(/\/functions\/v1\/chat$/, (route) =>
      route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream" },
        body: buildSseBody([
          {
            type: "text",
            content:
              "Salario bruto mensual: 1.800,00 EUR. Salario anual: 25.200,00 EUR (14 pagas).",
          },
          {
            type: "citation",
            articulo: "Tabla salarial 2025",
            seccion: "Camarero/a - Primera/B",
            url_pdf: "https://example.com/convenio.pdf",
            pagina: 42,
          },
          { type: "done", metadata: { response_length: 80 } },
        ]),
      }),
    );

    const chat = new ChatPage(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await chat.convenioSelector.waitFor({ state: "visible", timeout: 30000 });
    await chat.selectConvenio(CONVENIO_DISPLAY);

    await expect(chat.chatInput).toBeEnabled({ timeout: 5000 });
    await chat.chatInput.fill(
      "Cuanto cobra un camarero de Primera/B en cafeteria a jornada completa?",
    );
    const submitBtn2 = page.locator('button[type="submit"]').last();
    await expect(submitBtn2).toBeEnabled({ timeout: 5000 });
    await submitBtn2.click();

    await expect(page.getByText(/1\.?800/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/\d{1,3} fuentes?/i)).toBeVisible({ timeout: 5000 });
  });

  test("3. Calculo con datos incompletos abre DataRequestCard", async ({
    page,
  }) => {
    await setupCommonMocks(page);

    await page.route(/\/functions\/v1\/chat$/, (route) =>
      route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream" },
        body: buildSseBody([
          {
            type: "status",
            state: "incomplete",
            payload: {
              missingVariables: ["categoria_profesional", "tipo_establecimiento"],
              suggestions: {
                categoria_profesional: ["Camarero/a", "Cocinero/a", "Ayudante"],
                tipo_establecimiento: ["Cafeteria", "Restaurante", "Bar"],
              },
            },
          },
          { type: "done", metadata: { response_length: 0 } },
        ]),
      }),
    );

    const chat = new ChatPage(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await chat.convenioSelector.waitFor({ state: "visible", timeout: 30000 });
    await chat.selectConvenio(CONVENIO_DISPLAY);

    await expect(chat.chatInput).toBeEnabled({ timeout: 5000 });
    await chat.chatInput.fill("Cuanto cobro?");
    const submitBtn3 = page.locator('button[type="submit"]').last();
    await expect(submitBtn3).toBeEnabled({ timeout: 5000 });
    await submitBtn3.click();

    // DataRequestCard debe aparecer ("Necesito mas informacion" + variables)
    await expect(page.getByText(/Necesito m[aá]s informaci[oó]n/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(/categoria_profesional/i)).toBeVisible();
    await expect(page.getByText(/tipo_establecimiento/i)).toBeVisible();
  });
});
