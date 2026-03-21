/**
 * ChatPage - Page Object Model para tests E2E
 *
 * Encapsula los selectores y acciones de la pagina de chat.
 */

import type { Locator, Page } from "@playwright/test";

// Credenciales de test - usar variables de entorno o valores por defecto
const TEST_EMAIL = process.env.TEST_USER_EMAIL || "test@example.com";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "testpassword123";

export class ChatPage {
  readonly page: Page;

  // Selectores de Login
  readonly loginEmailInput: Locator;
  readonly loginPasswordInput: Locator;
  readonly loginSubmitButton: Locator;

  // Selectores principales
  readonly convenioSelector: Locator;
  readonly convenioInput: Locator;
  readonly chatInput: Locator;
  readonly submitButton: Locator;
  readonly messagesContainer: Locator;

  // Mensajes
  readonly userMessages: Locator;
  readonly assistantMessages: Locator;
  readonly loadingIndicator: Locator;

  // Componentes de protocolo
  readonly dataRequestCard: Locator;
  readonly alertSMI: Locator;
  readonly alertInvalidData: Locator;
  readonly alertConflict: Locator;

  // Sources
  readonly sourcesSection: Locator;
  readonly sourcesTrigger: Locator;

  // Sidebar
  readonly sidebar: Locator;
  readonly newConversationButton: Locator;

  // Variables Panel
  readonly variablesPanel: Locator;

  // Empty state
  readonly emptyStateTitle: Locator;

  constructor(page: Page) {
    this.page = page;

    // Selectores de Login
    this.loginEmailInput = page.locator('input[type="email"]');
    this.loginPasswordInput = page.locator('input[type="password"]');
    this.loginSubmitButton = page.getByRole("button", {
      name: /iniciar sesion/i,
    });

    // Selectores por data-testid (preferido) o rol
    // El ConvenioSelector usa role="combobox" con aria-label="Seleccionar convenio colectivo"
    this.convenioSelector = page.getByRole("combobox", {
      name: /seleccionar convenio/i,
    });
    this.convenioInput = page.getByPlaceholder(/buscar convenio/i);
    // El textarea del chat
    this.chatInput = page.locator("textarea");
    this.submitButton = page.getByRole("button", { name: /submit/i });
    this.messagesContainer = page.locator('[data-testid="messages-container"]');

    // Mensajes por rol
    this.userMessages = page.locator('[data-testid="message-user"]');
    this.assistantMessages = page.locator('[data-testid="message-assistant"]');
    this.loadingIndicator = page.getByText(/escribiendo/i);

    // Alertas y DataRequest
    this.dataRequestCard = page.locator('[data-testid="data-request-card"]');
    this.alertSMI = page.locator('[data-testid="alert-smi"]');
    this.alertInvalidData = page.locator(
      '[data-testid="alert-invalid-data"]',
    );
    this.alertConflict = page.locator('[data-testid="alert-conflict"]');

    // Sources
    this.sourcesSection = page.locator('[data-testid="sources"]');
    this.sourcesTrigger = page.locator('[data-testid="sources-trigger"]');

    // Sidebar y panel - El boton tiene "Nueva conversación"
    this.sidebar = page.locator("aside").first();
    this.newConversationButton = page.getByRole("button", {
      name: /nueva/i,
    });

    // VariablesPanel - buscar por clase que contiene "variables" o por estructura
    this.variablesPanel = page.locator('[class*="variables"]');

    // Empty state - buscar el heading especifico del estado vacio
    this.emptyStateTitle = page.getByRole("heading", {
      name: /selecciona un convenio/i,
    });
  }

  /**
   * Realiza login con credenciales de test
   */
  async login(email: string = TEST_EMAIL, password: string = TEST_PASSWORD) {
    // Rellenar credenciales
    await this.loginEmailInput.fill(email);
    await this.loginPasswordInput.fill(password);

    // Enviar formulario
    await this.loginSubmitButton.click();

    // Esperar a que el login se complete y aparezca el selector de convenio
    await this.convenioSelector.waitFor({ state: "visible", timeout: 15000 });
  }

  /**
   * Navega a la pagina de chat.
   *
   * IMPORTANTE: Este metodo asume que VITE_E2E_TESTING=true esta configurado
   * en playwright.config.ts. Si necesitas autenticacion manual, usa
   * gotoWithLogin() en su lugar.
   *
   * @throws Error si aparece la pagina de login (indica que VITE_E2E_TESTING no esta activo)
   */
  async goto() {
    await this.page.goto("/");

    // Verificar si estamos en la pagina de login (indica que VITE_E2E_TESTING no esta activo)
    const isLoginPage = await this.loginEmailInput
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (isLoginPage) {
      throw new Error(
        "Se detecto la pagina de login. Asegurate de que VITE_E2E_TESTING=true " +
          "este configurado en playwright.config.ts, o usa gotoWithLogin() en su lugar.",
      );
    }

    // Esperar a que el selector de convenio sea visible (indica que la pagina cargo)
    await this.convenioSelector.waitFor({ state: "visible", timeout: 15000 });
  }

  /**
   * Navega a la pagina y hace login manualmente (para tests sin VITE_E2E_TESTING)
   */
  async gotoWithLogin(email?: string, password?: string) {
    await this.page.goto("/");

    // Esperar a que la pagina salga del estado de carga inicial
    await this.page.waitForFunction(
      () => !document.body.textContent?.includes("Cargando..."),
      { timeout: 15000 },
    );

    // Si estamos en la pagina de login, hacer login
    const isLoginPage = await this.loginEmailInput.isVisible({ timeout: 2000 })
      .catch(() => false);
    if (isLoginPage) {
      await this.login(email, password);
      return;
    }

    await this.convenioSelector.waitFor({ state: "visible", timeout: 15000 });
  }

  /**
   * Selecciona un convenio por nombre
   */
  async selectConvenio(name: string) {
    await this.convenioSelector.click();
    await this.convenioInput.fill(name);
    // Esperar a que aparezcan los resultados y seleccionar el primero
    const option = this.page.getByRole("option", {
      name: new RegExp(name, "i"),
    });
    await option.first().click();
  }

  /**
   * Envia un mensaje al chat
   */
  async sendMessage(text: string) {
    await this.chatInput.fill(text);
    await this.submitButton.click();
  }

  /**
   * Espera a que el asistente responda
   */
  async waitForResponse() {
    // Esperar a que aparezca el indicador de carga
    await this.loadingIndicator.waitFor({ state: "visible", timeout: 5000 })
      .catch(() => {
        // Es posible que la respuesta sea muy rapida y no veamos el loading
      });
    // Esperar a que desaparezca
    await this.loadingIndicator.waitFor({ state: "hidden", timeout: 60000 });
  }

  /**
   * Obtiene el texto del ultimo mensaje del asistente
   */
  async getLastAssistantMessage(): Promise<string> {
    const messages = await this.assistantMessages.all();
    if (messages.length === 0) {
      return "";
    }
    return (await messages[messages.length - 1].textContent()) || "";
  }

  /**
   * Verifica si hay un DataRequestCard visible
   */
  async hasDataRequestCard(): Promise<boolean> {
    return this.dataRequestCard.isVisible();
  }

  /**
   * Rellena el DataRequestCard con valores
   */
  async fillDataRequest(values: Record<string, string>) {
    for (const [fieldName, value] of Object.entries(values)) {
      // Buscar el campo por label o name
      const field = this.dataRequestCard.getByRole("radiogroup", {
        name: new RegExp(fieldName, "i"),
      });
      if (await field.isVisible()) {
        // Seleccionar la opcion
        const option = field.getByRole("radio", {
          name: new RegExp(value, "i"),
        });
        await option.click();
      }
    }
  }

  /**
   * Hace clic en el boton de enviar del DataRequestCard
   */
  async submitDataRequest() {
    const submitBtn = this.dataRequestCard.getByRole("button", {
      name: /enviar|continuar/i,
    });
    await submitBtn.click();
  }

  /**
   * Selecciona una opcion en AlertConflict
   */
  async selectConflictOption(optionLabel: string) {
    const option = this.alertConflict.getByRole("button", {
      name: new RegExp(optionLabel, "i"),
    });
    await option.click();
  }

  /**
   * Cierra la alerta actual
   */
  async dismissAlert() {
    const dismissBtn = this.page.getByRole("button", {
      name: /cerrar|descartar/i,
    });
    if (await dismissBtn.isVisible()) {
      await dismissBtn.click();
    }
  }

  /**
   * Verifica que el chat este listo para usar
   */
  async isReady(): Promise<boolean> {
    return this.convenioSelector.isVisible();
  }
}
