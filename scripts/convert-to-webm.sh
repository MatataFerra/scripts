#!/bin/bash

# --- Configuración ---
# Check rápido para ver si ffmpeg está instalado
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ Error: FFmpeg no está instalado o no está en el PATH."
    exit 1
fi

echo "=== Conversor a WebM (FFmpeg Pro) ==="
echo ""

# 1. Modo automático con validación de entrada (convertir a minúsculas)
read -r -p "¿Usar modo automático? (mismo nombre .webm en misma carpeta) [s/N]: " AUTO_INPUT
AUTO_MODE=${AUTO_INPUT,,} # Convierte a minúsculas (bash 4.0+)

# 2. Pedimos el archivo de entrada
read -e -p "Arrastrá el archivo de entrada y apretá Enter: " INPUT_PATH_RAW

# 3. Limpieza robusta de comillas (sed es más seguro que expansiones simples aquí)
INPUT_PATH=$(echo "$INPUT_PATH_RAW" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

# 4. Verificar que el archivo existe
if [[ ! -f "$INPUT_PATH" ]]; then
  echo "❌ Error: No se encontró el archivo:"
  echo "   $INPUT_PATH"
  exit 1
fi

echo ""
echo "📂 Entrada: $INPUT_PATH"

# 5. Extraer rutas y nombres
INPUT_DIR="$(dirname "$INPUT_PATH")"
FILENAME="$(basename "$INPUT_PATH")"
BASENAME="${FILENAME%.*}"
DEFAULT_OUTPUT="${BASENAME}.webm"

# 6. Lógica de nombre de salida
if [[ "$AUTO_MODE" == "s" || "$AUTO_MODE" == "si" || "$AUTO_MODE" == "y" ]]; then
  echo "✅ Modo automático activado"
  OUTPUT_NAME="$DEFAULT_OUTPUT"
else
  echo ""
  read -e -p "Nombre de salida (Enter para usar '$DEFAULT_OUTPUT'): " USER_OUTPUT
  OUTPUT_NAME="${USER_OUTPUT:-$DEFAULT_OUTPUT}" # Si está vacío, usa default
  
  # Asegurar extensión .webm si el usuario no la puso
  if [[ "$OUTPUT_NAME" != *.webm ]]; then
    OUTPUT_NAME="${OUTPUT_NAME}.webm"
  fi
fi

# 7. Construir ruta absoluta
if [[ "$OUTPUT_NAME" != /* ]]; then
  OUTPUT_PATH="$INPUT_DIR/$OUTPUT_NAME"
else
  OUTPUT_PATH="$OUTPUT_NAME"
fi

# 8. Evitar sobreescribir (Lógica mantenida, es muy buena)
DIR="$(dirname "$OUTPUT_PATH")"
FILE="$(basename "$OUTPUT_PATH")"
NAME="${FILE%.*}"
EXT="${FILE##*.}"

CANDIDATE="$OUTPUT_PATH"
i=1
while [[ -e "$CANDIDATE" ]]; do
  CANDIDATE="$DIR/${NAME} ($i).${EXT}"
  ((i++))
done
OUTPUT_PATH="$CANDIDATE"

echo ""
echo "🚀 Convirtiendo..."
echo "   Destino: $OUTPUT_PATH"
echo "   (Esto puede tardar dependiendo de la duración...)"
echo ""

# 9. Conversión OPTIMIZADA
# Cambios clave explicados abajo
ffmpeg -i "$INPUT_PATH" \
  -c:v libvpx-vp9 \
  -crf 30 \
  -b:v 0 \
  -row-mt 1 \
  -pix_fmt yuv420p \
  -c:a libopus -b:a 128k \
  -hide_banner -loglevel warning \
  -stats \
  "$OUTPUT_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "✨ Conversión terminada con éxito."
    echo "   $OUTPUT_PATH"
else
    echo ""
    echo "❌ Hubo un error durante la conversión."
fi