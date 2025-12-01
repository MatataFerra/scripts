# 📔 Apple Journal Extractor & Converter

Este script automatiza la exportación de tu **Apple Journal** a un formato portátil y optimizado. Lee las entradas en HTML, genera un único archivo **Markdown** (`.md`) y convierte automáticamente todo el contenido multimedia a formatos web ligeros (**WebP** para imágenes y **WebM** para videos).

## ✨ Características

- **Markdown Limpio:** Consolida todas las entradas en un solo archivo cronológico.
- **Optimización Multimedia:**
  - 📸 Imágenes → **WebP** (sin metadatos EXIF, rotación automática).
  - 🎥 Videos → **WebM** (VP9, CRF 30, alta compresión).
- **Organización Inteligente:** Crea subcarpetas por cada entrada (`resources/Entry-Fecha/`) para mantener el orden.
- **Renombrado Automático:** Renombra archivos largos a `foto1.webp`, `video1.webm`, etc.
- **Modo "Solo Texto":** Generación instantánea del Markdown sin reprocesar videos.

## 🛠 Requisitos Previos

Necesitas tener instaladas las siguientes herramientas en tu sistema:

1.  **Node.js** (Entorno de ejecución).
2.  **FFmpeg** (Para convertir videos).
3.  **ImageMagick** (Para convertir imágenes).

### Instalación en macOS (Homebrew)

```bash
brew install node ffmpeg imagemagick webp
```

## 🚀 Instalación del Proyecto

Crea una carpeta para el proyecto y coloca el archivo extractor.js dentro.

Abre la terminal en esa carpeta e instala la dependencia necesaria (cheerio para leer HTML):

Bash
npm install cheerio
IMPORTANTE: Asegúrate de que tu carpeta de exportación de Apple esté en el escritorio:

`Ruta esperada: ~/Desktop/AppleJournalEntries/Entries`

## 📖 Cómo Usar

El comando básico sigue la estructura:

```bash
node extractor.js -o [NombreSalida] [Filtros]
```

1. Procesar TODO el diario

Convierte todas las entradas, fotos y videos.

```bash
node extractor.js -o MiDiarioCompleto all
```

2. Procesar entradas específicas

Puedes pasar nombres de archivos exactos (con .html) o palabras clave (ej. fechas).

```bash
# Solo una entrada específica
node extractor.js -o SoloUnDia "Entry-2024-04-01.html"

# Múltiples entradas específicas
node extractor.js -o Viaje "Entry 1.html" "Entry 2.html"

# Todas las entradas de un mes (filtro parcial)
node extractor.js -o Abril2024 "2024-04"
```

3. Modo Rápido (Solo Texto) ⚡️

Usa la bandera `-t` o `--text-only`. Ideal si cambias algo en el código del Markdown y no quieres esperar a que se conviertan los videos de nuevo.

```bash
node extractor.js -o MiDiario -t all
```

## 📂 Estructura del Resultado

El script generará una carpeta con el nombre que elijas:

```Plaintext
MiDiarioCompleto/
│
├── MiDiarioCompleto.md       <-- Tu diario en texto
│
└── resources/                <-- Carpeta de medios
    ├── Entry-2024-05-10/
    │   ├── foto1.webp
    │   ├── foto2.webp
    │   └── video1.webm
    │
    └── Entry-2024-05-11/
        └── foto1.webp
```

## ⚙️ Configuración Técnica (Detalles)

Videos: Se convierten usando libvpx-vp9 con row-mt 1 (multithreading) para velocidad.

Imágenes: Se usa magick con -strip (borra GPS y datos de cámara) y calidad 80.

Rutas: El script maneja automáticamente espacios y caracteres especiales en los nombres de archivo originales de Apple.
