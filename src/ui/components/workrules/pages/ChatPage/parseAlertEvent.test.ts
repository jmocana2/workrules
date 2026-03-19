import { describe, expect, it } from "vitest";
import {
  clearAlertState,
  clearDataRequestState,
  createInitialAlertState,
  createInitialDataRequestState,
  parseAlertEvent,
  parseDataRequestEvent,
} from "./parseAlertEvent";

describe("parseAlertEvent", () => {
  describe("evento SMI válido", () => {
    it("parsea correctamente evento de alerta SMI", () => {
      const data = JSON.stringify({
        type: "smi",
        payload: {
          calculatedAmount: 1050.0,
          smiAmount: 1134.0,
          adjustedAmount: 1134.0,
          payPeriod: "14-pagas",
          year: 2026,
        },
      });

      const result = parseAlertEvent(data);

      expect(result).toEqual({
        type: "smi",
        payload: {
          calculatedAmount: 1050.0,
          smiAmount: 1134.0,
          adjustedAmount: 1134.0,
          payPeriod: "14-pagas",
          year: 2026,
        },
        isVisible: true,
      });
    });

    it("marca isVisible como true", () => {
      const data = JSON.stringify({
        type: "smi",
        payload: {
          calculatedAmount: 900,
          smiAmount: 1134,
          adjustedAmount: 1134,
          payPeriod: "12-pagas",
          year: 2026,
        },
      });

      const result = parseAlertEvent(data);

      expect(result?.isVisible).toBe(true);
    });
  });

  describe("evento InvalidData válido", () => {
    it("parsea correctamente evento de datos inválidos", () => {
      const data = JSON.stringify({
        type: "invalid_data",
        payload: {
          field: "horas extra",
          value: 100,
          limit: "el máximo legal es 80 horas anuales",
          legalReference: "Art. 35.2 ET",
          suggestions: ["10 horas extra este mes"],
        },
      });

      const result = parseAlertEvent(data);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("invalid_data");
      expect(result?.isVisible).toBe(true);
      expect(result?.payload).toEqual({
        field: "horas extra",
        value: 100,
        limit: "el máximo legal es 80 horas anuales",
        legalReference: "Art. 35.2 ET",
        suggestions: ["10 horas extra este mes"],
      });
    });

    it("parsea evento sin campos opcionales", () => {
      const data = JSON.stringify({
        type: "invalid_data",
        payload: {
          field: "jornada",
          value: 50,
        },
      });

      const result = parseAlertEvent(data);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("invalid_data");
    });
  });

  describe("evento Conflict válido", () => {
    it("parsea correctamente evento de conflicto", () => {
      const data = JSON.stringify({
        type: "conflict",
        payload: {
          field1: { name: "Tipo de jornada", value: "Jornada completa" },
          field2: { name: "Horas semanales", value: "20 horas" },
          explanation: "Los datos se contradicen",
          options: [
            { label: "Jornada completa", value: "full-time" },
            { label: "Tiempo parcial", value: "part-time" },
          ],
        },
      });

      const result = parseAlertEvent(data);

      expect(result).not.toBeNull();
      expect(result?.type).toBe("conflict");
      expect(result?.payload).toEqual({
        field1: { name: "Tipo de jornada", value: "Jornada completa" },
        field2: { name: "Horas semanales", value: "20 horas" },
        explanation: "Los datos se contradicen",
        options: [
          { label: "Jornada completa", value: "full-time" },
          { label: "Tiempo parcial", value: "part-time" },
        ],
      });
    });

    it("preserva todas las opciones del conflicto", () => {
      const data = JSON.stringify({
        type: "conflict",
        payload: {
          field1: { name: "Campo A", value: "Valor A" },
          field2: { name: "Campo B", value: "Valor B" },
          explanation: "Explicación",
          options: [
            { label: "Opción 1", value: "opt1" },
            { label: "Opción 2", value: "opt2" },
            { label: "Opción 3", value: "opt3" },
          ],
        },
      });

      const result = parseAlertEvent(data);
      const payload = result?.payload as { options: unknown[] };

      expect(payload.options).toHaveLength(3);
    });
  });

  describe("eventos inválidos", () => {
    it("retorna null para JSON inválido", () => {
      const result = parseAlertEvent("not json");
      expect(result).toBeNull();
    });

    it("retorna null para string vacío", () => {
      const result = parseAlertEvent("");
      expect(result).toBeNull();
    });

    it("retorna null para tipo de alerta desconocido", () => {
      const data = JSON.stringify({
        type: "unknown_type",
        payload: {},
      });

      const result = parseAlertEvent(data);
      expect(result).toBeNull();
    });

    it("retorna null si falta el campo type", () => {
      const data = JSON.stringify({
        payload: { field: "test" },
      });

      const result = parseAlertEvent(data);
      expect(result).toBeNull();
    });

    it("retorna null si falta el campo payload", () => {
      const data = JSON.stringify({
        type: "smi",
      });

      const result = parseAlertEvent(data);
      expect(result).toBeNull();
    });

    it("retorna null si payload es null", () => {
      const data = JSON.stringify({
        type: "smi",
        payload: null,
      });

      const result = parseAlertEvent(data);
      expect(result).toBeNull();
    });

    it("retorna null si payload no es objeto", () => {
      const data = JSON.stringify({
        type: "smi",
        payload: "string",
      });

      const result = parseAlertEvent(data);
      expect(result).toBeNull();
    });

    it("retorna null si payload es un array", () => {
      const data = JSON.stringify({
        type: "smi",
        payload: [],
      });

      const result = parseAlertEvent(data);
      expect(result).toBeNull();
    });

    it("retorna null si type no es string", () => {
      const data = JSON.stringify({
        type: 123,
        payload: {},
      });

      const result = parseAlertEvent(data);
      expect(result).toBeNull();
    });

    it("retorna null para array en lugar de objeto", () => {
      const data = JSON.stringify([{ type: "smi", payload: {} }]);

      const result = parseAlertEvent(data);
      expect(result).toBeNull();
    });
  });
});

describe("createInitialAlertState", () => {
  it("retorna estado inicial sin alerta", () => {
    const state = createInitialAlertState();

    expect(state).toEqual({
      type: null,
      payload: null,
      isVisible: false,
    });
  });
});

describe("clearAlertState", () => {
  it("retorna estado limpio", () => {
    const state = clearAlertState();

    expect(state).toEqual({
      type: null,
      payload: null,
      isVisible: false,
    });
  });
});

// ============================================================================
// Tests para DataRequest
// ============================================================================

describe("parseDataRequestEvent", () => {
  describe("createInitialDataRequestState", () => {
    it("retorna estado inicial sin formulario visible", () => {
      const state = createInitialDataRequestState();

      expect(state).toEqual({
        isVisible: false,
        payload: null,
      });
    });
  });

  describe("clearDataRequestState", () => {
    it("retorna estado limpio identico al inicial", () => {
      const state = clearDataRequestState();

      expect(state).toEqual({
        isVisible: false,
        payload: null,
      });
    });
  });

  describe("evento valido con campos radio", () => {
    it("parsea correctamente evento con opciones radio", () => {
      const data = JSON.stringify({
        title: "Necesito mas informacion",
        convenioName: "Hosteleria de Valencia",
        fields: [
          {
            name: "categoria_profesional",
            label: "Categoria profesional",
            type: "radio",
            required: true,
            options: [
              { value: "ayudante", label: "Ayudante de cocina" },
              { value: "cocinero", label: "Cocinero/a" },
            ],
          },
        ],
        maxAttempts: 3,
        currentAttempt: 1,
      });

      const result = parseDataRequestEvent(data);

      expect(result).not.toBeNull();
      expect(result?.isVisible).toBe(true);
      expect(result?.payload?.title).toBe("Necesito mas informacion");
      expect(result?.payload?.convenioName).toBe("Hosteleria de Valencia");
      expect(result?.payload?.fields).toHaveLength(1);
      expect(result?.payload?.fields[0].type).toBe("radio");
      expect(result?.payload?.maxAttempts).toBe(3);
      expect(result?.payload?.currentAttempt).toBe(1);
    });
  });

  describe("evento valido con campo stars", () => {
    it("parsea correctamente evento con campo de estrellas", () => {
      const data = JSON.stringify({
        title: "Categoria del establecimiento",
        fields: [
          {
            name: "categoria_hotel",
            label: "Categoria del hotel",
            type: "stars",
            required: true,
            helpText: "Selecciona de 1 a 5 estrellas",
          },
        ],
        maxAttempts: 3,
        currentAttempt: 1,
      });

      const result = parseDataRequestEvent(data);

      expect(result).not.toBeNull();
      expect(result?.payload?.fields[0].type).toBe("stars");
    });
  });

  describe("evento valido con multiples campos", () => {
    it("parsea correctamente evento con varios campos", () => {
      const data = JSON.stringify({
        title: "Datos del puesto",
        convenioName: "Hosteleria Madrid",
        fields: [
          {
            name: "categoria_hotel",
            label: "Categoria del hotel",
            type: "stars",
            required: true,
          },
          {
            name: "categoria_profesional",
            label: "Categoria profesional",
            type: "radio",
            required: true,
            options: [
              { value: "recepcionista", label: "Recepcionista" },
              { value: "camarera", label: "Camarera de pisos" },
            ],
          },
        ],
        maxAttempts: 3,
        currentAttempt: 2,
      });

      const result = parseDataRequestEvent(data);

      expect(result).not.toBeNull();
      expect(result?.payload?.fields).toHaveLength(2);
      expect(result?.payload?.currentAttempt).toBe(2);
    });
  });

  describe("evento sin convenioName (opcional)", () => {
    it("parsea correctamente evento sin nombre de convenio", () => {
      const data = JSON.stringify({
        title: "Selecciona una opcion",
        fields: [
          {
            name: "jornada",
            label: "Tipo de jornada",
            type: "radio",
            options: [
              { value: "completa", label: "Jornada completa" },
              { value: "parcial", label: "Tiempo parcial" },
            ],
          },
        ],
        maxAttempts: 3,
        currentAttempt: 1,
      });

      const result = parseDataRequestEvent(data);

      expect(result).not.toBeNull();
      expect(result?.payload?.convenioName).toBeUndefined();
    });
  });

  describe("eventos invalidos", () => {
    it("retorna null para JSON invalido", () => {
      const result = parseDataRequestEvent("not valid json");
      expect(result).toBeNull();
    });

    it("retorna null si falta title", () => {
      const data = JSON.stringify({
        fields: [{ name: "test", label: "Test", type: "stars" }],
        maxAttempts: 3,
        currentAttempt: 1,
      });

      const result = parseDataRequestEvent(data);
      expect(result).toBeNull();
    });

    it("retorna null si falta fields", () => {
      const data = JSON.stringify({
        title: "Test",
        maxAttempts: 3,
        currentAttempt: 1,
      });

      const result = parseDataRequestEvent(data);
      expect(result).toBeNull();
    });

    it("retorna null si fields no es array", () => {
      const data = JSON.stringify({
        title: "Test",
        fields: "not an array",
        maxAttempts: 3,
        currentAttempt: 1,
      });

      const result = parseDataRequestEvent(data);
      expect(result).toBeNull();
    });

    it("retorna null si falta maxAttempts", () => {
      const data = JSON.stringify({
        title: "Test",
        fields: [{ name: "test", label: "Test", type: "stars" }],
        currentAttempt: 1,
      });

      const result = parseDataRequestEvent(data);
      expect(result).toBeNull();
    });

    it("retorna null si falta currentAttempt", () => {
      const data = JSON.stringify({
        title: "Test",
        fields: [{ name: "test", label: "Test", type: "stars" }],
        maxAttempts: 3,
      });

      const result = parseDataRequestEvent(data);
      expect(result).toBeNull();
    });

    it("retorna null si campo tiene type invalido", () => {
      const data = JSON.stringify({
        title: "Test",
        fields: [{ name: "test", label: "Test", type: "invalid_type" }],
        maxAttempts: 3,
        currentAttempt: 1,
      });

      const result = parseDataRequestEvent(data);
      expect(result).toBeNull();
    });

    it("retorna null si campo radio no tiene options", () => {
      const data = JSON.stringify({
        title: "Test",
        fields: [{ name: "test", label: "Test", type: "radio" }],
        maxAttempts: 3,
        currentAttempt: 1,
      });

      const result = parseDataRequestEvent(data);
      expect(result).toBeNull();
    });

    it("retorna null si opcion no tiene value", () => {
      const data = JSON.stringify({
        title: "Test",
        fields: [
          {
            name: "test",
            label: "Test",
            type: "radio",
            options: [{ label: "Sin value" }],
          },
        ],
        maxAttempts: 3,
        currentAttempt: 1,
      });

      const result = parseDataRequestEvent(data);
      expect(result).toBeNull();
    });

    it("retorna null si opcion no tiene label", () => {
      const data = JSON.stringify({
        title: "Test",
        fields: [
          {
            name: "test",
            label: "Test",
            type: "radio",
            options: [{ value: "sin_label" }],
          },
        ],
        maxAttempts: 3,
        currentAttempt: 1,
      });

      const result = parseDataRequestEvent(data);
      expect(result).toBeNull();
    });

    it("retorna null si campo no tiene name", () => {
      const data = JSON.stringify({
        title: "Test",
        fields: [{ label: "Test", type: "stars" }],
        maxAttempts: 3,
        currentAttempt: 1,
      });

      const result = parseDataRequestEvent(data);
      expect(result).toBeNull();
    });

    it("retorna null si campo no tiene label", () => {
      const data = JSON.stringify({
        title: "Test",
        fields: [{ name: "test", type: "stars" }],
        maxAttempts: 3,
        currentAttempt: 1,
      });

      const result = parseDataRequestEvent(data);
      expect(result).toBeNull();
    });
  });
});
