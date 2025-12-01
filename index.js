const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const os = require("os");
const { execSync } = require("child_process");

// --- CONFIGURACIÓN ---
const DIR_ENTRADAS = path.join(os.homedir(), "Desktop", "AppleJournalEntries", "Entries");

// --- UTILS ---
const logUpdate = (msg) => {
  if (process.stdout.isTTY) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(msg);
  }
};

const args = process.argv.slice(2);
let nombreSalidaInput = "Diario_Exportado";
let filtrosBusqueda = [];
let soloTexto = false; // Nueva variable de control

// --- 1. PROCESAR ARGUMENTOS ---
for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === "-o" || arg === "--output") {
    if (args[i + 1]) {
      nombreSalidaInput = args[i + 1].replace(/\.md$/, "");
      i++;
    } else {
      console.error('⚠️  Error: Falta el nombre después de "-o"');
      process.exit(1);
    }
  }
  // DETECTAR LA BANDERA DE SOLO TEXTO
  else if (arg === "--text-only" || arg === "-t") {
    soloTexto = true;
  } else {
    filtrosBusqueda.push(arg);
  }
}

if (filtrosBusqueda.length === 0) {
  console.log("---------------------------------------------------------");
  console.log("📘 GUÍA DE USO:");
  console.log("  Normal:      node extractor.js -o Salida 'Entry 1.html'");
  console.log("  Solo MD:     node extractor.js -o Salida -t 'Entry 1.html'");
  console.log("---------------------------------------------------------");
  process.exit(0);
}

// --- 2. FUNCIONES DE CONVERSIÓN ---
function convertirImagen(origen, destino) {
  try {
    execSync(
      `magick "${origen}" -auto-orient -strip -quality 80 -define webp:method=4 "${destino}"`,
      { stdio: "ignore" }
    );
    return true;
  } catch (e) {
    return false;
  }
}

function convertirVideo(origen, destino) {
  try {
    execSync(
      `ffmpeg -i "${origen}" -c:v libvpx-vp9 -crf 30 -b:v 0 -row-mt 1 -c:a libopus -b:a 128k -y "${destino}"`,
      { stdio: "ignore" }
    );
    return true;
  } catch (e) {
    return false;
  }
}

// --- 3. LÓGICA PRINCIPAL ---

async function procesarArchivos() {
  try {
    // Validaciones
    if (!fs.existsSync(DIR_ENTRADAS)) {
      console.error(`❌ Error: No encuentro la carpeta Entries en: ${DIR_ENTRADAS}`);
      return;
    }

    if (!soloTexto) {
      try {
        execSync("magick -version", { stdio: "ignore" });
        execSync("ffmpeg -version", { stdio: "ignore" });
      } catch (e) {
        console.error("❌ Error: Necesitas 'ffmpeg' e 'imagemagick' (o usa -t para solo texto).");
        process.exit(1);
      }
    }

    // Estructura de Carpetas Base
    const carpetaOutput = path.resolve(nombreSalidaInput);
    const carpetaRecursosBase = path.join(carpetaOutput, "resources");
    const archivoMarkdownFinal = path.join(carpetaOutput, `${nombreSalidaInput}.md`);

    if (!fs.existsSync(carpetaOutput)) {
      fs.mkdirSync(carpetaOutput, { recursive: true });
      // Solo creamos la carpeta resources si NO es solo texto (o si queremos asegurar estructura)
      if (!soloTexto) fs.mkdirSync(carpetaRecursosBase, { recursive: true });
      console.log(`📂 Carpeta creada: ${carpetaOutput}`);
    } else {
      console.log(`📂 Usando carpeta existente: ${carpetaOutput}`);
      if (!soloTexto && !fs.existsSync(carpetaRecursosBase)) fs.mkdirSync(carpetaRecursosBase);
    }

    const todosLosArchivos = fs.readdirSync(DIR_ENTRADAS).filter((f) => f.endsWith(".html"));

    // --- FILTRADO ---
    let archivosAProcesar = [];
    if (filtrosBusqueda[0] === "all") {
      archivosAProcesar = todosLosArchivos;
    } else {
      archivosAProcesar = todosLosArchivos.filter((archivo) => {
        return filtrosBusqueda.some((filtro) => {
          if (filtro.endsWith(".html")) return archivo === filtro;
          return archivo.includes(filtro);
        });
      });
    }

    if (archivosAProcesar.length === 0) {
      console.log("❌ No encontré archivos que coincidan.");
      return;
    }

    let totalMediaGlobal = 0;

    // Solo escaneamos para la barra de carga si vamos a convertir
    if (!soloTexto) {
      console.log(`\n🔍 Escaneando ${archivosAProcesar.length} entradas...`);
      for (const archivo of archivosAProcesar) {
        const rutaHtml = path.join(DIR_ENTRADAS, archivo);
        const html = fs.readFileSync(rutaHtml, "utf8");
        const $ = cheerio.load(html);
        totalMediaGlobal += $(".asset_image").length;
        totalMediaGlobal += $("video source").length;
      }
      console.log(`📊 Total detectado: ${totalMediaGlobal} archivos multimedia.`);
    } else {
      console.log(`\n🚀 MODO SOLO TEXTO ACTIVADO: Saltando conversión multimedia.`);
    }

    console.log("📝 Generando Markdown...\n");

    const startTime = Date.now();
    let contenidoMarkdown = "";
    let stats = { img: 0, vid: 0, err: 0 };
    let mediaProcesadaActual = 0;

    // --- LOOP PRINCIPAL ---
    for (const [index, archivo] of archivosAProcesar.entries()) {
      const rutaHtml = path.join(DIR_ENTRADAS, archivo);
      const html = fs.readFileSync(rutaHtml, "utf8");
      const $ = cheerio.load(html);

      const nombreEntry = path.parse(archivo).name;

      // Solo creamos carpetas de recursos si estamos convirtiendo
      const carpetaRecursosEntry = path.join(carpetaRecursosBase, nombreEntry);
      if (!soloTexto && !fs.existsSync(carpetaRecursosEntry)) {
        fs.mkdirSync(carpetaRecursosEntry, { recursive: true });
      }

      // Datos Entry
      const textoFecha = $(".pageHeader").text().trim();
      const matchFecha = textoFecha.match(/(\d{1,2}\s+de\s+[a-záéíóúñ]+)/i);
      const fecha = matchFecha ? matchFecha[0] : textoFecha;

      let texto = "";
      $("p.p2 span.s2").each((i, el) => {
        texto += $(el).text().trim() + "\n\n";
      });

      // --- MULTIMEDIA LOOP ---
      let multimediaMD = "";
      let contadorFotoLocal = 1;
      let contadorVideoLocal = 1;

      const procesarAsset = (srcRelativo, tipo) => {
        if (!srcRelativo) return null;

        mediaProcesadaActual++;

        // Feedback visual
        if (!soloTexto) {
          const porcentaje = Math.round((mediaProcesadaActual / totalMediaGlobal) * 100) || 0;
          logUpdate(
            `⏳ Procesando Entry ${index + 1}/${
              archivosAProcesar.length
            } | Media: ${mediaProcesadaActual}/${totalMediaGlobal} (${porcentaje}%)`
          );
        } else {
          // Feedback simplificado para modo texto
          logUpdate(
            `⏳ Leyendo Entry ${index + 1}/${archivosAProcesar.length}: ${archivo.substring(
              0,
              15
            )}...`
          );
        }

        const srcDecoded = decodeURIComponent(srcRelativo);
        // Aunque sea solo texto, necesitamos calcular el nombre final (foto1.webp)
        // para poner el link correcto en el markdown
        let nuevoNombre = "";

        // NO procesamos conversión si es soloTexto, pero SÍ calculamos nombres
        if (tipo === "imagen") {
          nuevoNombre = `foto${contadorFotoLocal}.webp`;

          if (!soloTexto) {
            const rutaAbsolutaOriginal = path.resolve(DIR_ENTRADAS, srcDecoded);
            const rutaDestino = path.join(carpetaRecursosEntry, nuevoNombre);
            if (fs.existsSync(rutaAbsolutaOriginal)) {
              if (!fs.existsSync(rutaDestino)) convertirImagen(rutaAbsolutaOriginal, rutaDestino);
              stats.img++;
            }
          }
          contadorFotoLocal++;
        } else if (tipo === "video") {
          nuevoNombre = `video${contadorVideoLocal}.webm`;

          if (!soloTexto) {
            const rutaAbsolutaOriginal = path.resolve(DIR_ENTRADAS, srcDecoded);
            const rutaDestino = path.join(carpetaRecursosEntry, nuevoNombre);
            if (fs.existsSync(rutaAbsolutaOriginal)) {
              if (!fs.existsSync(rutaDestino)) convertirVideo(rutaAbsolutaOriginal, rutaDestino);
              stats.vid++;
            }
          }
          contadorVideoLocal++;
        }

        // Devolvemos el string del link para el MD
        return `resources/${nombreEntry}/${nuevoNombre}`;
      };

      $(".asset_image").each((i, el) => {
        const rutaFinal = procesarAsset($(el).attr("src"), "imagen");
        if (rutaFinal) multimediaMD += `![Imagen](${rutaFinal})\n\n`;
      });

      $("video source").each((i, el) => {
        const rutaFinal = procesarAsset($(el).attr("src"), "video");
        if (rutaFinal) multimediaMD += `> 🎥 **Video:** [Ver video](${rutaFinal})\n\n`;
      });

      contenidoMarkdown += `### ${fecha || archivo}\n\n`;
      contenidoMarkdown += `${texto}\n`;
    }

    fs.writeFileSync(archivoMarkdownFinal, contenidoMarkdown, "utf8");

    const endTime = Date.now();
    const elapsedTime = ((endTime - startTime) / 1000).toFixed(1);

    process.stdout.write("\n");
    console.log("\n========================================");
    console.log("✅ ¡PROCESO COMPLETADO!");
    console.log(`📁 Carpeta Output:  ${carpetaOutput}`);
    console.log(`📄 Archivo MD:      ${path.basename(archivoMarkdownFinal)}`);
    if (!soloTexto) {
      console.log(`🖼  Fotos (WebP):    ${stats.img}`);
      console.log(`🎥 Videos (WebM):   ${stats.vid}`);
    } else {
      console.log(`ℹ️  Modo:            SOLO TEXTO (Multimedia no procesado)`);
    }
    console.log(`⏱  Tiempo total:    ${elapsedTime}s`);
    console.log("========================================");
  } catch (error) {
    console.error("\n❌ Error inesperado:", error.message);
  }
}

procesarArchivos();
