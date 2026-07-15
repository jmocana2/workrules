// supabase/functions/_shared/core/chat/routing/ranges-transformer.ts

const CATEGORIA_PATTERNS = [
  /para\s+([a-záéíóúñ][a-záéíóúñ\s]{2,30}?)(?:,|\s+muestrame|\s+en\s+el)/i,
  /(?:ayudante|jefe|cocinero|camarero|recepcionista|gobernanta|pinche|barman)[a-záéíóúñ\s]*/i,
];

/**
 * Transforma una solicitud de "ver rangos/opciones" en una pregunta optimizada
 * para búsqueda RAG de tablas salariales y clasificación de establecimientos.
 */
export function transformRangesRequest(pregunta: string): string {
  let categoria = "";
  for (const pattern of CATEGORIA_PATTERNS) {
    const match = pregunta.match(pattern);
    if (match) {
      categoria = (match[1] || match[0]).trim();
      categoria = categoria.replace(/^(un[ao]?\s+|la\s+|el\s+)/, "");
      if (categoria.length > 3 && categoria.length < 40) {
        break;
      }
      categoria = "";
    }
  }

  if (categoria) {
    return `Según el convenio, para la categoría de ${categoria}:
1. En que tipos de establecimiento puede trabajar (comedor, cafetería, bar, catering, etc)?
2. Qué clases de establecimiento existen (Lujo/A, Primera/B, Segunda/C)?
3. Cuál es el salario en cada combinación de tipo y clase?
Muestra una tabla organizada con todas las opciones y sus salarios correspondientes.`;
  }

  return `Según el convenio:
1. Cuáles son los tipos de establecimiento (comedor, cafetería, bar, catering, colectividades)?
2. Qué clases existen para cada tipo (Lujo, Primera, Segunda, Tercera)?
3. Cuáles son las categorías profesionales principales?
Muestra las opciones disponibles de forma organizada para que el usuario pueda elegir.`;
}
