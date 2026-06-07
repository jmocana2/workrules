import type { Convenio, UserConvenio } from "@core/types";

export const isE2ETesting = import.meta.env.VITE_E2E_TESTING === "true";

export const E2E_MOCK_CONVENIOS: Convenio[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    nombre: "Hosteleria Madrid",
    nombre_oficial: "Convenio Colectivo de Hosteleria de Madrid",
    nombre_corto: "Hosteleria MAD",
    ambito: "provincial",
    ambito_territorial: "Madrid",
    codigo_regcon: "28000000000000",
    fecha_vigencia: "2025-12-31",
    url_pdf: "",
    estado: "activo",
    visibilidad: "publico",
    owner_id: null,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    nombre: "Comercio Barcelona",
    nombre_oficial: "Convenio Colectivo de Comercio de Barcelona",
    nombre_corto: "Comercio BCN",
    ambito: "provincial",
    ambito_territorial: "Barcelona",
    codigo_regcon: "08000000000000",
    fecha_vigencia: "2025-12-31",
    url_pdf: "",
    estado: "activo",
    visibilidad: "publico",
    owner_id: null,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
  },
];

export const E2E_MOCK_USER_CONVENIOS: UserConvenio[] = [];
