# Guía Completa para I1.6: Workflow de Ingesta en n8n

Basándome en tu configuración actual (n8n corriendo en `http://76.13.0.223:5678`), aquí está el plan detallado:

---

## 📋 Resumen del Workflow

Este workflow convierte un PDF del BOE en datos estructurados almacenados en Supabase.

**Flujo:** `Webhook → Descargar PDF → Subir a Storage → LlamaParse → Guardar metadatos`

---

## 🔧 Preparación Previa

### 1. Configurar Credenciales en n8n

Accede a **Settings → Credentials** y crea:

**a) Supabase API**
- Type: HTTP Request (usar authentication)
- URL Base: Tu URL de Supabase (ej: `https://xxx.supabase.co`)
- Headers: 
  - `apikey`: Tu Supabase anon key
  - `Authorization`: `Bearer {service_role_key}`

**b) LlamaParse API**
- Type: HTTP Request
- Headers:
  - `Authorization`: `Bearer {tu_llamaparse_api_key}`

**c) OpenAI API** (para fase posterior)
- Type: Predefined → OpenAI
- API Key: Tu clave de OpenAI

---

## 🔨 Construcción del Workflow Paso a Paso

### **Nodo 1: Webhook (Trigger)**

1. Añadir nodo **Webhook**
2. Configurar:
   - **HTTP Method:** POST
   - **Path:** `ingesta-convenio`
   - **Response Mode:** Last Node
3. Activar el workflow para obtener la URL

**URL resultante:** `http://76.13.0.223:5678/webhook/ingesta-convenio`

**Payload esperado:**
```json
{
  "pdf_url": "https://www.boe.es/boe/dias/2024/01/15/pdfs/BOE-A-2024-123.pdf",
  "nombre": "Convenio Colectivo de Hostelería Madrid 2024",
  "codigo_regcon": "28000335011982",
  "ambito": "Provincial - Madrid",
  "fecha_vigencia": "2024-01-01"
}
```

---

### **Nodo 2: HTTP Request - Descargar PDF**

1. Añadir **HTTP Request** node
2. Configurar:
   - **Method:** GET
   - **URL:** `{{ $json.pdf_url }}`
   - **Response Format:** File
   - **Binary Property:** `pdf_data`
3. Conectar desde el Webhook

**Salida:** PDF descargado como binary data

---

### **Nodo 3: Supabase Storage - Subir PDF**

1. Añadir **HTTP Request** node
2. Configurar:
   - **Credential:** Supabase API (creada antes)
   - **Method:** POST
   - **URL:** `{{ $credentials.supabaseUrl }}/storage/v1/object/convenios-pdf/{{ $json.codigo_regcon }}.pdf`
   - **Body Content Type:** Raw (application/octet-stream)
   - **Binary Data:** ON
   - **Input Binary Field:** `pdf_data`

**Headers adicionales:**
```json
{
  "Content-Type": "application/pdf"
}
```

**Salida:** URL pública del PDF en Storage

---

### **Nodo 4: LlamaParse - Parsear PDF**

1. Añadir **HTTP Request** node
2. Configurar:
   - **Credential:** LlamaParse API
   - **Method:** POST
   - **URL:** `https://api.cloud.llamaindex.ai/api/parsing/upload`
   - **Body Content Type:** Multipart-Form
   - **Binary Data:** ON

**Parámetros del form:**
```json
{
  "file": "{{ $binary.pdf_data }}",
  "parsing_instruction": "Extrae el texto completo preservando la estructura de artículos y secciones",
  "result_type": "markdown"
}
```

**Importante:** LlamaParse es asíncrono. Debes:
- Obtener `job_id` de la respuesta
- Añadir un nodo **Wait** (30-60 segundos)
- Añadir otro **HTTP Request** para polling:
  - **URL:** `https://api.cloud.llamaindex.ai/api/parsing/job/{{ $json.job_id }}`
  - **Method:** GET

---

### **Nodo 5: Code - Extraer Markdown**

1. Añadir **Code** node (JavaScript)
2. Procesar respuesta de LlamaParse:

```javascript
// Parsear respuesta de LlamaParse
const result = $input.first().json;
const markdown = result.markdown || result.text;

// Limpiar y formatear
const cleanMarkdown = markdown
  .replace(/\n{3,}/g, '\n\n')  // Normalizar saltos
  .trim();

return {
  json: {
    markdown_completo: cleanMarkdown,
    longitud: cleanMarkdown.length,
    convenio_id: $('Webhook').first().json.codigo_regcon
  }
};
```

---

### **Nodo 6: Supabase - Insert Convenio**

1. Añadir **HTTP Request** node (o usar nodo Supabase nativo si disponible)
2. Configurar:
   - **Method:** POST
   - **URL:** `{{ $credentials.supabaseUrl }}/rest/v1/convenios`
   - **Headers:**
     ```json
     {
       "apikey": "{{ $credentials.supabaseKey }}",
       "Authorization": "Bearer {{ $credentials.supabaseServiceKey }}",
       "Content-Type": "application/json",
       "Prefer": "return=representation"
     }
     ```

**Body:**
```json
{
  "nombre": "{{ $('Webhook').first().json.nombre }}",
  "codigo_regcon": "{{ $('Webhook').first().json.codigo_regcon }}",
  "ambito": "{{ $('Webhook').first().json.ambito }}",
  "fecha_vigencia": "{{ $('Webhook').first().json.fecha_vigencia }}",
  "url_pdf": "{{ $('Supabase Storage').first().json.url }}",
  "estado": "procesado"
}
```

---

### **Nodo 7: Respuesta HTTP**

1. Añadir **Respond to Webhook** node
2. Configurar:
   - **Response Code:** 200
   - **Response Body:**
   ```json
   {
     "status": "success",
     "convenio_id": "{{ $('Supabase - Insert Convenio').first().json[0].id }}",
     "mensaje": "Convenio procesado correctamente",
     "chunks_generados": 0,
     "markdown_length": "{{ $('Code').first().json.longitud }}"
   }
   ```

---

## 🧪 Testing del Workflow

### 1. Preparar archivo de prueba

Descarga un PDF de convenio real:
```bash
curl -o test-convenio.pdf "https://www.boe.es/boe/dias/2024/01/15/pdfs/BOE-A-2024-123.pdf"
```

### 2. Subir a un hosting temporal

Usa [file.io](https://file.io) o similar, o súbelo a tu propio servidor.

### 3. Ejecutar webhook

```bash
curl -X POST http://76.13.0.223:5678/webhook/ingesta-convenio \
  -H "Content-Type: application/json" \
  -d '{
    "pdf_url": "TU_URL_DEL_PDF",
    "nombre": "Convenio de Prueba",
    "codigo_regcon": "TEST-001",
    "ambito": "Provincial - Madrid",
    "fecha_vigencia": "2024-01-01"
  }'
```

### 4. Verificar en Supabase

- Storage: `convenios-pdf/TEST-001.pdf` debe existir
- Tabla `convenios`: Debe haber un registro nuevo

---

## 🚨 Manejo de Errores

Añade un nodo **Error Trigger** conectado a todos los nodos:

1. Añadir **Error Trigger** node
2. Añadir **Code** node para logging:

```javascript
const error = $input.first().json;
return {
  json: {
    workflow: 'ingesta-convenio',
    error_message: error.message,
    error_stack: error.stack,
    input_data: $('Webhook').first().json
  }
};
```

3. Añadir **HTTP Request** a Supabase para guardar en `pipeline_logs` (si creaste esa tabla)

---

## 📊 Diagrama Visual del Workflow

```
[Webhook POST] 
    ↓
[HTTP Request - Descargar PDF]
    ↓
[HTTP Request - Subir a Supabase Storage]
    ↓
[HTTP Request - LlamaParse Upload]
    ↓
[Wait 30s]
    ↓
[HTTP Request - LlamaParse Polling]
    ↓
[Code - Extraer Markdown]
    ↓
[Supabase Insert - convenios]
    ↓
[Respond to Webhook]

(Paralelo a todos: Error Trigger → Log to DB)
```

---

## ✅ Criterios de Éxito

- [ ] Webhook recibe POST y responde 200
- [ ] PDF se descarga correctamente
- [ ] PDF aparece en Supabase Storage
- [ ] LlamaParse devuelve markdown (>1000 caracteres)
- [ ] Registro insertado en tabla `convenios`
- [ ] Sin errores en logs de n8n

---

## 🔜 Próximos Pasos

Una vez funcione este workflow básico:
1. **I1.7:** Añadir chunking del markdown
2. **I1.8:** Generar embeddings con OpenAI
3. **I1.9:** Extraer perfil JSON con Claude
