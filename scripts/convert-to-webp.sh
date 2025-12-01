#!/bin/bash

# --- Configuración ---
QUALITY=80
# Extensiones a buscar (en minúsculas, el script manejará las mayúsculas solo)
EXTENSIONS=("jpg" "jpeg" "png" "heic" "tiff")

# Activar opciones de shell para manejo inteligente de archivos
shopt -s nullglob   # Si no encuentra archivos, no devuelve el patrón literal
shopt -s nocaseglob # Hace que *.jpg también encuentre *.JPG, *.Jpg, etc.

echo "=== Conversor masivo a WEBP (ImageMagick) ==="
echo ""

# Verificar instalación
if ! command -v magick &> /dev/null; then
  echo "❌ Error: ImageMagick no encontrado."
  echo "   Instalar con: brew install imagemagick" # (Mac)
  echo "   O con: sudo apt install imagemagick"    # (Linux)
  exit 1
fi

BASE_DIR="$(pwd)"
TODAY="$(date +%Y-%m-%d)"
OUT_DIR="$BASE_DIR/${TODAY}-webp"

# Función de conversión
convert_image() {
  local input="$1"
  
  # Validación básica
  if [[ ! -f "$input" ]]; then return; fi

  local filename base output
  filename="$(basename "$input")"
  base="${filename%.*}"
  output="$OUT_DIR/${base}.webp"

  # Evitar reprocesar
  if [[ -e "$output" ]]; then
    echo "⏩ Saltando (ya existe): $filename"
    return
  fi

  # Comando de conversión
  # -strip: Elimina metadatos (GPS, cámara) para reducir peso
  # -define webp:method=4: Balance velocidad/compresión (0=rápido, 6=mejor compresión)
  magick "$input" \
    -auto-orient \
    -strip \
    -quality "$QUALITY" \
    -define webp:method=4 \
    "$output"

  if [[ $? -eq 0 ]]; then
    echo "✔ Convertido: $filename"
    ((count++))
  else
    echo "❌ Error con: $filename"
  fi
}

# --- Inicio del proceso ---

# Crear carpeta si no existe (y si vamos a procesar algo)
# Lo hacemos justo antes de empezar para no crear carpetas vacías si no hay fotos.
CREATED_DIR=0

count=0
START_TIME=$(date +%s)

if [[ $# -gt 0 ]]; then
  # MODO 1: Archivos arrastrados (Drag & Drop)
  echo "📂 Procesando archivos seleccionados..."
  mkdir -p "$OUT_DIR"
  
  for arg in "$@"; do
    # No limpiamos backslashes manualmente, dejamos que bash maneje la ruta
    convert_image "$arg"
  done

else
  # MODO 2: Carpeta actual
  echo "📂 Buscando imágenes en carpeta actual..."
  
  # Bandera para saber si encontramos algo
  FOUND_FILES=0
  
  for ext in "${EXTENSIONS[@]}"; do
    # Gracias a 'nocaseglob', esto encuentra jpg Y JPG
    files=( *."$ext" )
    
    if [[ ${#files[@]} -gt 0 ]]; then
      mkdir -p "$OUT_DIR"
      FOUND_FILES=1
      
      for img in "${files[@]}"; do
        convert_image "$img"
      done
    fi
  done
  
  if [[ $FOUND_FILES -eq 0 ]]; then
    echo "⚠️ No se encontraron imágenes compatibles en esta carpeta."
  fi
fi

# --- Resumen ---
END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))

if [[ $count -gt 0 ]]; then
  echo ""
  echo "================================="
  echo "   ✨ Proceso finalizado"
  echo "   🖼  Imágenes creadas: $count"
  echo "   📂 Carpeta: $OUT_DIR"
  echo "   ⏱  Tiempo: ${TOTAL_TIME}s"
  echo "================================="
else
  echo ""
  echo "No se generaron nuevos archivos."
fi

# Desactivar opciones de shell (buena práctica)
shopt -u nullglob
shopt -u nocaseglob