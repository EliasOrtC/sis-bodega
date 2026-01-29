import { toBlob, toPng, toJpeg } from 'html-to-image';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, ImageRun, VerticalMergeType } from 'docx';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';

/**
 * Filtro para excluir los botones de acción y otros elementos no deseados de la captura.
 */
const actionButtonsFilter = (node) => {
    const exclusionClasses = [
        'mermaid-actions',
        'chart-actions',
        'chart-actions-container',
        'MuiButtonBase-root',
        'MuiIconButton-root',
        'MuiTooltip-popper',
        'recharts-tooltip-cursor',
        'ai-message-actions'
    ];

    if (node.classList) {
        // Excluimos si contiene alguna clase prohibida
        return !exclusionClasses.some(cls => node.classList.contains(cls));
    }
    return true;
};

/**
 * Captura un elemento con dimensiones precisas y resolución optimizada para estabilidad.
 */
const getCaptureOptions = (node) => {
    // Usamos el tamaño real del contenido. Math.ceil evita bordes blancos por subpíxeles.
    const totalWidth = Math.ceil(node.scrollWidth);
    const totalHeight = Math.ceil(node.scrollHeight);

    // Ajustamos el pixelRatio para evitar bloqueos del navegador (Pantalla Negra)
    // En móviles limitamos a 2 para mayor estabilidad. En desktop podemos subir a 2.5 si no es gigante.
    const isMobile = window.innerWidth < 780;
    let pixelRatio = isMobile ? 2 : (window.devicePixelRatio || 2);

    const maxDimension = Math.max(totalWidth, totalHeight);
    if (maxDimension > 3000) {
        pixelRatio = 1.0;
    } else if (maxDimension > 1500 && !isMobile) {
        pixelRatio = 1.5;
    }

    return {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: pixelRatio,
        filter: actionButtonsFilter,
        width: totalWidth,
        height: totalHeight,
        fontEmbedCSS: '',
        skipFonts: true,
        style: {
            margin: '0',
            padding: '0',
            boxShadow: 'none',
            borderRadius: '0',
            width: `${totalWidth}px`,
            height: `${totalHeight}px`,
            overflow: 'visible',
            display: 'block',
            position: 'relative',
            background: '#ffffff',
            transform: 'none',
            maxWidth: 'none',
            maxHeight: 'none'
        },
        onClone: (clonedNode) => {
            try {
                // Función helper para expandir
                const expand = (el) => {
                    el.style.overflow = 'visible';
                    el.style.width = 'auto';
                    el.style.height = 'auto';
                    el.style.maxWidth = 'none';
                    el.style.maxHeight = 'none';
                };

                // 1. Si el mismo nodo es el contenedor de scroll
                if (clonedNode.classList && clonedNode.classList.contains('native-chart-scroll-container')) {
                    expand(clonedNode);
                }

                // 2. Buscar hijos contenedores de scroll
                if (clonedNode.querySelectorAll) {
                    const scrolls = clonedNode.querySelectorAll('.native-chart-scroll-container');
                    scrolls.forEach(expand);
                }

                // 3. Forzar wrapper principal también
                if (clonedNode.classList && clonedNode.classList.contains('native-chart-wrapper')) {
                    expand(clonedNode);
                }
            } catch (e) {
                // Silencioso
            }
        }
    };
};

/**
 * Función interna para realizar reintentos si la imagen sale vacía
 */
const captureProcess = async (node, action, options) => {
    // html-to-image a veces falla en el primer intento con SVGs complejos (Mermaid).
    // Hacemos una pre-captura invisible para "calentar" el renderizado.
    try {
        await action(node, { ...options, pixelRatio: 1, skipFonts: true });
        // Pausa minúscula para que el navegador procese el renderizado previo
        await new Promise(resolve => setTimeout(resolve, 100));
        return await action(node, options);
    } catch (err) {
        console.warn("Reintentando captura debido a error inicial...", err);
        return await action(node, options);
    }
};

/**
 * Copia un elemento del DOM al portapapeles como una imagen PNG.
 */
export const copyElementToClipboard = async (node) => {
    if (!node) return false;

    try {
        const options = getCaptureOptions(node);
        // Usamos el proceso de captura con calentamiento
        const blob = await captureProcess(node, toBlob, options);

        if (!blob || blob.size < 100) { // Si el blob es sospechosamente pequeño, falló
            throw new Error('Imagen generada vacía o corrupta');
        }

        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);

        return true;
    } catch (err) {
        console.error('Error al copiar imagen:', err);
        // Intento desesperado con pixel ratio 1
        try {
            const lowResBlob = await toBlob(node, { ...getCaptureOptions(node), pixelRatio: 1 });
            const item = new ClipboardItem({ 'image/png': lowResBlob });
            await navigator.clipboard.write([item]);
            return true;
        } catch (e) {
            return false;
        }
    }
};

/**
 * Descarga un elemento del DOM como una imagen PNG.
 */
export const downloadElementAsImage = async (node, fileName = 'visualizacion.png') => {
    if (!node) return;

    try {
        const options = getCaptureOptions(node);
        const dataUrl = await captureProcess(node, toPng, options);

        if (!dataUrl || dataUrl.length < 1000) {
            throw new Error('DataURL generado está vacío');
        }

        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        link.click();
    } catch (err) {
        console.error('Error al descargar imagen:', err);
        // Fallback a resolución estándar
        try {
            const dataUrl = await toPng(node, { ...getCaptureOptions(node), pixelRatio: 1 });
            const link = document.createElement('a');
            link.download = fileName;
            link.href = dataUrl;
            link.click();
        } catch (e) {
            alert("No se pudo generar la imagen. El diagrama es demasiado grande para la memoria del navegador.");
        }
    }
};

/**
 * Filtra sugerencias automáticas de la IA, preguntas de seguimiento, etc.
 * Mantiene intactos los bloques de código y tablas.
 */
export const filterSuggestions = (markdownText) => {
    if (!markdownText) return "";

    // Normalizar saltos de línea y separar por líneas para procesar el final
    let lines = markdownText.trim().split('\n');
    let changed = false;

    // Bucle para eliminar líneas finales que parezcan sugerencias
    while (lines.length > 0) {
        const lastLine = lines[lines.length - 1].trim();
        if (lastLine === "") {
            lines.pop();
            changed = true;
            continue;
        }

        // PROTECCIÓN: No eliminar si es parte de un bloque o tabla
        if (lastLine.startsWith('```') || lastLine.endsWith('```') || lastLine.startsWith('|')) {
            break;
        }

        const lower = lastLine.toLowerCase();
        const isQuestion = lower.includes('?') || lower.includes('¿');
        const isPhrase = lower.includes('le gustaría') || lower.includes('desea conocer') || lower.includes('puedo ayudarte') || lower.includes('alguna otra');
        const isItalic = (lastLine.startsWith('*') && lastLine.endsWith('*')) || (lastLine.startsWith('_') && lastLine.endsWith('_'));

        // Criterio de eliminación: Corta y (pregunta o frase típica o itálica)
        if (lastLine.length < 300 && (isQuestion || isPhrase || isItalic)) {
            lines.pop();
            changed = true;
        } else {
            break;
        }
    }

    // Si no cambiamos nada, devolvemos el original trimmeado
    if (!changed) return markdownText.trim();

    // Unimos y limpiamos espacios excesivos al final
    return lines.join('\n').trim();
};

/**
 * Genera un nombre de archivo inteligente basado en el contenido markdown.
 * Busca encabezados o texto en negrita significativos.
 */
export const getSmartFileName = (markdownText, extension = 'docx', prefix = 'Informe') => {
    if (!markdownText) return `${prefix}_SIS_Bodega.${extension}`;

    // 1. Filtrar sugerencias finales y bloques de código para la detección del nombre
    const paragraphs = markdownText.trim().split(/\n\s*\n/);
    const lastPara = paragraphs.length > 1 ? paragraphs[paragraphs.length - 1].trim() : "";
    const isSugerencia = lastPara.endsWith('?') || lastPara.endsWith('¿') || lastPara.includes('¿') ||
        (lastPara.toLowerCase().startsWith('¿') && lastPara.length < 200);

    const filteredForContext = (isSugerencia ? paragraphs.slice(0, -1) : paragraphs)
        .join('\n\n')
        .replace(/```[\s\S]*?```/g, '') // Limpiar código técnico
        .trim();

    // 2. Buscar específicamente texto en negrita significativo (prioridad 1)
    const boldMatches = Array.from(filteredForContext.matchAll(/\*\*([^*]+)\*\*/g));
    let bestContext = "";

    const forbidden = ['estimado', 'señor', 'administrador', 'claro', 'aquí tiene', 'aquí le presento'];
    for (const match of boldMatches) {
        const candidate = match[1].trim();
        if (candidate.length > 4 && !forbidden.some(word => candidate.toLowerCase().includes(word))) {
            bestContext = candidate;
            break;
        }
    }

    // 3. Si no hay negritas, buscar encabezados (prioridad 2)
    if (!bestContext) {
        const titleMatch = filteredForContext.match(/(?:^#\s+|^##\s+)([^\n#]+)/m) ||
            filteredForContext.match(/^([^\n\.,\?]{5,60})/m);
        if (titleMatch && titleMatch[1]) bestContext = titleMatch[1];
    }

    if (bestContext) {
        let context = bestContext.trim()
            .replace(/[\\/:*?"<>|]/g, '')
            .replace(/`/g, '')
            .replace(/\./g, '')
            .replace(/\s+/g, '_');

        // Limpiar prefijos de relleno
        context = context.replace(/^(Aquí_tiene_un_|Aquí_tiene_el_|Resumen_de_|Este_es_el_|Reporte_de_|Diagrama_de_|Diagrama_que_|Flujo_de_|Tabla_de_)/i, '');

        if (context.length > 2) {
            return `${prefix}_${context.slice(0, 50)}.${extension}`;
        }
    }

    return `${prefix}_SIS_Bodega.${extension}`;
};

/**
 * Exporta datos a un archivo Excel con formato VISUAL de tabla profesional.
 * Soporta celdas combinadas (rowspan/colspan) y estilos de alta calidad.
 */
export const exportToExcel = async (tableOrData, markdownText = null) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Datos');
        const finalFileName = getSmartFileName(markdownText, 'xlsx', 'Informe');

        let matrix = [];
        let mergeRanges = [];

        // 1. Extraer datos con soporte para celdas combinadas (rowspan/colspan)
        if (tableOrData instanceof HTMLTableElement) {
            const rows = Array.from(tableOrData.querySelectorAll('tr'));
            rows.forEach((tr, rIdx) => {
                if (!matrix[rIdx]) matrix[rIdx] = [];
                let cIdx = 0;

                // Extraer celdas (th o td)
                const cells = Array.from(tr.querySelectorAll(':scope > th, :scope > td'));

                cells.forEach(cell => {
                    // Buscar siguiente hueco libre en la matriz (por rowspans de filas superiores)
                    while (matrix[rIdx][cIdx] !== undefined) cIdx++;

                    const content = cell.innerText.trim();
                    const rs = parseInt(cell.getAttribute('rowspan') || 1);
                    const cs = parseInt(cell.getAttribute('colspan') || 1);
                    const isHeader = cell.tagName.toLowerCase() === 'th' || tr.closest('thead') !== null;

                    // Llenar la matriz para todas las celdas cubiertas por el span
                    for (let r = 0; r < rs; r++) {
                        for (let c = 0; c < cs; c++) {
                            const trIndex = rIdx + r;
                            const tcIndex = cIdx + c;
                            if (!matrix[trIndex]) matrix[trIndex] = [];
                            matrix[trIndex][tcIndex] = {
                                value: (r === 0 && c === 0) ? content : "",
                                isHeader,
                                main: (r === 0 && c === 0),
                                logicalRowIdx: rIdx // Para colores alternos sutiles
                            };
                        }
                    }

                    if (rs > 1 || cs > 1) {
                        mergeRanges.push({
                            s: { r: rIdx + 1, c: cIdx + 1 },
                            e: { r: rIdx + rs, c: cIdx + cs }
                        });
                    }
                    cIdx += cs;
                });
            });
        } else if (Array.isArray(tableOrData) && tableOrData.length > 0) {
            const headers = Object.keys(tableOrData[0]);
            matrix.push(headers.map(h => ({ value: h, isHeader: true, main: true, logicalRowIdx: 0 })));
            tableOrData.forEach((obj, idx) => {
                matrix.push(Object.values(obj).map(v => ({ value: String(v), isHeader: false, main: true, logicalRowIdx: idx + 1 })));
            });
        }

        if (matrix.length === 0) return;

        // 2. Volcar la matriz en el worksheet aplicando estilos
        matrix.forEach((row, rIdx) => {
            const rowValues = row.map(c => c.value);
            const excelRow = worksheet.addRow(rowValues);

            row.forEach((cellData, cIdx) => {
                if (!cellData) return;
                const cell = excelRow.getCell(cIdx + 1);

                // Estilo general: Times New Roman 11pt (Igual que en Word)
                cell.font = { name: 'Times New Roman', size: 11 };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFAAAAAA' } },
                    left: { style: 'thin', color: { argb: 'FFAAAAAA' } },
                    bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } },
                    right: { style: 'thin', color: { argb: 'FFAAAAAA' } }
                };

                // Alineación base
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

                if (cellData.isHeader) {
                    // Estilo Cabecera Premium (Fondo oscuro, texto blanco)
                    cell.font = { name: 'Times New Roman', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'medium', color: { argb: 'FF000000' } },
                        right: { style: 'thin' }
                    };
                } else {
                    // Fondo alterno sutil
                    if (cellData.logicalRowIdx % 2 === 1) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
                    }

                    // Formateo numérico inteligente y alineación
                    const rawValue = String(cellData.value);
                    if (rawValue && cellData.main) {
                        // Limpiar símbolos de moneda y separadores para detectar números
                        const cleanValue = rawValue.replace(/[C\$¥€\s,]/g, '').trim();
                        // Evitar formatear como número si parece un ID largo o código
                        if (!isNaN(cleanValue) && cleanValue !== '' && !/^\d{10,}$/.test(cleanValue)) {
                            cell.value = parseFloat(cleanValue);
                            // Detectar si era moneda
                            if (rawValue.includes('C$') || rawValue.includes('$')) {
                                cell.numFmt = '"C$"#,##0.00';
                            } else if (cleanValue.includes('.')) {
                                cell.numFmt = '#,##0.00';
                            } else {
                                cell.numFmt = '#,##0';
                            }
                        }
                    }

                    // Alineación final según contenido
                    if (typeof cell.value === 'number') {
                        cell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
                    } else {
                        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                    }
                }
            });
        });

        // 3. Ejecutar las combinaciones de celdas
        mergeRanges.forEach(range => {
            try {
                worksheet.mergeCells(range.s.r, range.s.c, range.e.r, range.e.c);
            } catch (e) {
                // Prevenir que un error de merge detenga la exportación
            }
        });

        // 4. Configurar anchos de columna fijos (aprox 12-15 chars de Times New Roman)
        const colCount = matrix[0] ? matrix[0].length : 0;
        for (let i = 1; i <= colCount; i++) {
            worksheet.getColumn(i).width = 22; // Valor que favorece el wrap de texto en celdas estrechas
        }

        // 5. Filtros automáticos en la cabecera lógica
        if (matrix.length > 0) {
            worksheet.autoFilter = {
                from: { row: 1, column: 1 },
                to: { row: 1, column: colCount }
            };
        }

        // 6. Generar el buffer y descargar
        const buffer = await workbook.xlsx.writeBuffer();
        const dataBlob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(dataBlob, finalFileName);

    } catch (error) {
        console.error("Error crítico exportando a Excel:", error);
    }
};

/**
 * Limpia el texto Markdown (normalización de espacios).
 * Se conservan los bloques de código (JSON, Mermaid) por petición del usuario para depuración.
 */
export const cleanMarkdown = (text) => {
    if (!text) return "";
    let cleaned = text; // .replace(/```json[\s\S]*?```/g, '');
    // cleaned = cleaned.replace(/```mermaid[\s\S]*?```/g, '');
    return cleaned.trim().replace(/\n{3,}/g, '\n\n');
};

/**
 * Formatea una tabla de Markdown a una versión de texto plano alineada con espacios.
 */
const formatTableAsASCII = (markdownLines) => {
    const rawRows = markdownLines.map(line =>
        line.split('|')
            .filter((s, i, a) => i > 0 && i < a.length - 1)
            .map(c => c.trim())
    ).filter(row => row.length > 0);

    if (rawRows.length === 0) return "";

    // Expandir filas físicamente según <br>
    const expandedRows = [];
    let separatorIndex = 0;

    rawRows.forEach((row, rowIndex) => {
        const splitted = row.map(c => c.split(/<br\s*\/?>/gi).map(s => s.trim()));
        const maxLines = Math.max(...splitted.map(l => l.length));
        for (let i = 0; i < maxLines; i++) {
            expandedRows.push(splitted.map(l => l[i] || ""));
        }
        if (rowIndex === 0) separatorIndex = maxLines;
    });

    if (expandedRows.length === 0) return "";

    // Calcular colWidths basándose en todas las filas expandidas
    const colWidths = expandedRows[0].map((_, i) => Math.max(...expandedRows.map(row => (row[i] || "").length)));

    // Crear filas formateadas
    const formattedRows = expandedRows.map(row =>
        "| " + row.map((cell, i) => cell.padEnd(colWidths[i])).join(" | ") + " |"
    );

    // Añadir línea separadora después del encabezado lógico (que puede tener varias líneas físicas)
    if (formattedRows.length > 1) {
        const separator = "|-" + colWidths.map(w => "-".repeat(w)).join("-|-") + "-|";
        formattedRows.splice(separatorIndex, 0, separator);
    }

    return formattedRows.join("\n");
};

/**
 * Copia el contenido al portapapeles en múltiples formatos (HTML y Texto Plano).
 * HTML incluye estilos INLINE MASIVOS para máxima compatibilidad con Word.
 */
export const copyMessageToClipboard = async (markdownText, messageElement = null) => {
    try {
        // const { toJpeg } = await import('html-to-image'); // Removed dynamic import

        // --- 0. FILTRAR SUGERENCIAS FINALES (Paridad con exportToWord) ---
        // --- 0. FILTRAR SUGERENCIAS (Solo preguntas finales, respetando gráficos) ---
        const filteredMarkdown = filterSuggestions(markdownText);

        // --- 1. PREPARAR TEXTO PLANO ---
        let plainText = "";
        const lines = filteredMarkdown.split('\n');
        let currentTable = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            const isTableRow = trimmed.startsWith('|') && trimmed.endsWith('|');
            const isSeparator = trimmed.match(/^\|[:-\s|]+\|$/);

            if (isTableRow && !isSeparator) {
                currentTable.push(line);
            } else {
                if (currentTable.length > 0) {
                    plainText += formatTableAsASCII(currentTable) + "\n\n";
                    currentTable = [];
                }
                if (!isSeparator) {
                    plainText += line + "\n";
                }
            }
        }
        if (currentTable.length > 0) plainText += formatTableAsASCII(currentTable);
        // Preservar bloques de código para paridad con la respuesta de la IA
        plainText = plainText.trim().replace(/\n{3,}/g, '\n\n');

        // --- 2. CAPTURAR IMÁGENES ---
        let visualImages = [];
        if (messageElement) {
            const containers = messageElement.querySelectorAll('.native-chart-wrapper, .mermaid-container');
            for (const container of containers) {
                try {
                    const options = getCaptureOptions(container);
                    // Forzar pixelRatio 2 para buena calidad
                    options.pixelRatio = 2;
                    options.quality = 0.95;
                    options.type = 'image/jpeg';

                    // Intentar captura con Jpeg
                    let dataUrl = await captureProcess(container, toJpeg, options);

                    if (!dataUrl) {
                        // Reintentar con PNG si falla Jpeg
                        options.type = undefined;
                        dataUrl = await captureProcess(container, toPng, options);
                    }
                    visualImages.push(dataUrl);
                } catch (e) {
                    console.warn("Captura visual fallida en portapapeles:", e);
                    visualImages.push(null);
                }
            }
        }
        // --- 3. PREPARAR HTML (ESTRATEGIA "EMAIL LEGACY") ---
        // Word interpreta mejor el HTML simple y antiguo (tablas, atributos align, etiquetas font)
        // que el CSS moderno o los Doctype complejos.
        // Estrategia: Envolver TODO en una tabla contenedora con la fuente deseada.

        // --- 3. PREPARAR HTML (ESTRATEGIA "MODERN CSS") ---
        // Usamos HTML5 semántico con CSS en bloque <style>, que las versiones modernas de Word
        // interpretan correctamente para mapear estilos.

        // DEFINICIÓN DE ESTILOS INLINE (MÁXIMA COMPATIBILIDAD WORD 2026)
        const S_BODY = "font-family: 'Times New Roman', serif !important; font-size: 11pt; mso-ansi-font-size: 11pt; color: #000000;";
        const S_P = "margin: 0cm; margin-bottom: 0cm; font-size: 11pt; mso-ansi-font-size: 11pt; font-family: 'Times New Roman', serif; line-height: 1.0; mso-line-height-rule: exactly; mso-para-margin: 0cm;";
        const S_H1 = "font-size: 16pt; mso-ansi-font-size: 16pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; color: #2E74B5; font-family: 'Times New Roman', serif; mso-para-margin-top: 12pt; mso-para-margin-bottom: 6pt;";
        const S_H2 = "font-size: 14pt; mso-ansi-font-size: 14pt; font-weight: bold; margin-top: 10pt; margin-bottom: 5pt; color: #2E74B5; font-family: 'Times New Roman', serif; mso-para-margin-top: 10pt; mso-para-margin-bottom: 5pt;";
        const S_TBL = "border-collapse: collapse; width: 100%; border: 1px solid #A0A0A0; margin: 10pt 0; mso-yfti-tbllook: 1184; mso-padding-alt: 0cm 0cm 0cm 0cm;";
        const S_TH = "background-color: #333333; color: #ffffff; font-weight: bold; border: 1px solid #A0A0A0; padding: 0cm; mso-padding-alt: 0cm 0cm 0cm 0cm; vertical-align: middle; font-size: 11pt; mso-ansi-font-size: 11pt; font-family: 'Times New Roman', serif; text-align: center;";
        const S_TD = "border: 1px solid #A0A0A0; padding: 0cm; mso-padding-alt: 0cm 0cm 0cm 0cm; vertical-align: middle; font-size: 11pt; mso-ansi-font-size: 11pt; font-family: 'Times New Roman', serif; width: 0cm; max-width: 10ch; word-wrap: break-word;";
        const S_DIV_TD = "margin: 0cm; font-size: 11pt !important; mso-ansi-font-size: 11pt; font-family: 'Times New Roman', serif; line-height: 1.0; mso-line-height-rule: exactly; mso-para-margin: 0cm;";

        // Eliminamos S_STRONG ya que usaremos etiqueta <b> directa

        let htmlContent = `<!DOCTYPE html><html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset="utf-8"></head><body style="${S_BODY}"><div style="${S_BODY}">`;

        // SEGMENTACIÓN INTELIGENTE
        const segments = [];
        let currentSeg = "";
        const allLines = filteredMarkdown.split('\n');
        for (let i = 0; i < allLines.length; i++) {
            const line = allLines[i];
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('```')) {
                if (currentSeg.trim()) segments.push(currentSeg.trim());
                let block = line + "\n";
                for (let j = i + 1; j < allLines.length; j++) {
                    block += allLines[j] + "\n";
                    if (allLines[j].trim().startsWith('```')) {
                        i = j;
                        break;
                    }
                }
                segments.push(block.trim());
                currentSeg = "";
            } else if (trimmedLine.startsWith('|')) {
                if (currentSeg.trim() && !currentSeg.trim().startsWith('|')) {
                    segments.push(currentSeg.trim());
                    currentSeg = "";
                }
                currentSeg += line + "\n";
            } else if (trimmedLine === "") {
                if (currentSeg.trim()) segments.push(currentSeg.trim());
                currentSeg = "";
            } else {
                if (currentSeg.trim().startsWith('|')) {
                    segments.push(currentSeg.trim());
                    currentSeg = "";
                }
                currentSeg += line + "\n";
            }
        }
        if (currentSeg.trim()) segments.push(currentSeg.trim());

        let visualIdx = 0;
        segments.forEach(seg => {
            const trimmed = seg.trim();
            if (trimmed.startsWith('```')) {
                const lang = trimmed.slice(3).toLowerCase();
                if (lang.includes('mermaid') || lang.includes('json')) {
                    let extractedTitle = "";
                    if (lang.includes('json')) {
                        const match = trimmed.match(/"title"\s*:\s*"([^"]+)"/i);
                        if (match) extractedTitle = match[1];
                    }

                    if (visualImages[visualIdx]) {
                        // Solo añadimos título de texto explícito si NO es JSON (NativeChart ya lo incluye en la imagen)
                        if (extractedTitle && !lang.includes('json')) {
                            htmlContent += `<div style="text-align: center; margin: 10pt 0;"><p style="font-size: 13pt; font-weight: bold; font-family: 'Times New Roman', serif; mso-para-margin: 0cm;">${extractedTitle}</p></div>`;
                        }
                        htmlContent += `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; mso-table-tspace: 0pt; mso-table-bspace: 0pt;"><tr><td align="center" style="text-align: center; border: none; line-height: 1pt; font-size: 1pt;"><img src="${visualImages[visualIdx]}" width="600" style="display: block; margin: 0 auto;" /></td></tr></table>`;
                    }
                }
                visualIdx++;
                return;
            }


            if (trimmed.startsWith('|')) {
                // TABLA
                const rowsFlat = trimmed.split('\n').filter(r => !r.match(/^\|[:-\s|]+\|$/));
                htmlContent += `<table cellpadding="0" cellspacing="0" style="${S_TBL}">`;
                rowsFlat.forEach((r, rowIndex) => {
                    const cells = r.split('|').filter((c, i, a) => i > 0 && i < a.length - 1);
                    const isHeader = rowIndex === 0;
                    const cellTag = isHeader ? 'th' : 'td';
                    const styleBase = isHeader ? S_TH : S_TD;

                    // Expandir contenido multilínea en filas físicas con ROWSPAN
                    const splitted = cells.map(c => c.trim().split(/<br\s*\/?>/gi));
                    const maxLines = Math.max(...splitted.map(l => l.length));

                    for (let i = 0; i < maxLines; i++) {
                        htmlContent += `<tr>`;
                        splitted.forEach((lines, colIdx) => {
                            if (lines.length === 1) {
                                if (i === 0) {
                                    const content = lines[0] || "";
                                    const formattedContent = content
                                        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                                        .replace(/<br\s*\/?>/gi, '<br>');

                                    // Celda que ocupa múltiples filas físicas (ROWSPAN)
                                    htmlContent += `<${cellTag} rowspan="${maxLines}" style="${styleBase}"><div style="${S_DIV_TD}">${formattedContent}</div></${cellTag}>`;
                                }
                                // No se genera nada para las filas siguientes en esta columna combinada
                            } else {
                                const content = lines[i] || "";
                                const formattedContent = content
                                    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Negritas en tablas
                                    .replace(/<br\s*\/?>/gi, '<br>');

                                htmlContent += `<${cellTag} style="${styleBase}"><div style="${S_DIV_TD}">${formattedContent}</div></${cellTag}>`;
                            }
                        });
                        htmlContent += `</tr>`;
                    }
                });
                htmlContent += `</table>`;
            } else {
                // TEXTO / TÍTULOS
                if (trimmed.startsWith('# ')) {
                    const text = trimmed.replace('# ', '');
                    htmlContent += `<p style="${S_H1}"><b>${text}</b></p>`;
                } else if (trimmed.startsWith('## ')) {
                    const text = trimmed.replace('## ', '');
                    htmlContent += `<p style="${S_H2}"><b>${text}</b></p>`;
                } else {
                    const formatted = trimmed
                        .replace(/\*\*(.*?)\*\*/g, `<b>$1</b>`) // Usamos <b> directo para negritas
                        .replace(/<br\s*\/?>/gi, '<br>');

                    htmlContent += `<p style="${S_P}">${formatted}</p>`;
                }
            }
        });

        htmlContent += `</div></body></html>`;



        const data = [new ClipboardItem({
            'text/html': new Blob([htmlContent], { type: 'text/html' }),
            'text/plain': new Blob([plainText], { type: 'text/plain' })
        })];

        await navigator.clipboard.write(data);
        return true;
    } catch (err) {
        console.error("Error al copiar mensaje enriquecido:", err);
        try {
            await navigator.clipboard.writeText(cleanMarkdown(markdownText));
            return true;
        } catch (e) { return false; }
    }
};

/**
 * Exporta el contenido del chat a un archivo Word (.docx) con ALTA COMPATIBILIDAD.
 */
export const exportToWord = async (markdownText, messageElement = null) => {
    try {
        // const { toJpeg } = await import('html-to-image'); // Removed dynamic import
        const children = [];

        // 1. FILTRAR SUGERENCIAS (Solo preguntas finales, respetando gráficos)
        const filteredMarkdown = filterSuggestions(markdownText);

        // 2. Determinar nombre de archivo inteligente
        const finalFileName = getSmartFileName(markdownText, 'docx', 'Informe');

        // Saneamiento estricto para XML de Word
        const cleanTextForXML = (text) => {
            if (!text) return " ";
            return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
        };

        // 3. Captura de visuales (JPEG/PNG) con detección de tamaño total (evita recorte por scroll)
        let visualImages = [];
        if (messageElement) {
            const containers = messageElement.querySelectorAll('.native-chart-wrapper, .mermaid-container');
            for (const container of containers) {
                try {
                    // Usar getCaptureOptions para aprovechar el onClone que expande el scroll
                    const options = getCaptureOptions(container);
                    // Forzar pixelRatio 2 para buena calidad en Word
                    options.pixelRatio = 2;
                    options.quality = 0.95;
                    options.type = 'image/jpeg';

                    // Intentar captura con Jpeg
                    let dataUrl = await captureProcess(container, toJpeg, options);

                    if (!dataUrl) {
                        // Reintentar con PNG si falla Jpeg
                        options.type = undefined; // toPng no usa type
                        dataUrl = await captureProcess(container, toPng, options);
                    }

                    if (dataUrl && dataUrl.includes('base64,')) {
                        const base64Data = dataUrl.split(',')[1];
                        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                        visualImages.push({
                            data: binaryData,
                            width: options.width || 600,
                            height: options.height || 300,
                            type: dataUrl.includes('jpeg') ? 'jpg' : 'png'
                        });
                    } else {
                        visualImages.push(null);
                    }
                } catch (e) {
                    console.warn("Captura visual fallida:", e);
                    visualImages.push(null);
                }
            }
        }

        const lines = filteredMarkdown.split('\n');
        let currentTableRows = [];
        let isProcessingTable = false;
        let isInsideVisualBlock = false;
        let visualPointer = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('```')) {
                if (!isInsideVisualBlock) {
                    const lang = trimmedLine.slice(3).toLowerCase();
                    if (lang === 'mermaid' || lang === 'json') {
                        isInsideVisualBlock = true;

                        let extractedTitle = "";
                        if (lang === 'json') {
                            let blockLines = [];
                            for (let j = i + 1; j < lines.length; j++) {
                                if (lines[j].trim().startsWith('```')) break;
                                blockLines.push(lines[j]);
                            }
                            const blockContent = blockLines.join('\n');
                            try {
                                const parsed = JSON.parse(blockContent);
                                if (parsed.title) extractedTitle = parsed.title;
                            } catch (e) {
                                const match = blockContent.match(/"title"\s*:\s*"([^"]+)"/);
                                if (match) extractedTitle = match[1];
                            }
                        }

                        if (extractedTitle && lang !== 'json') {
                            children.push(new Paragraph({
                                children: [new TextRun({
                                    text: cleanTextForXML(extractedTitle),
                                    bold: true, size: 24, font: "Times New Roman"
                                })],
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 200, after: 100 }
                            }));
                        }

                        const imgInfo = visualImages[visualPointer];
                        if (imgInfo) {
                            const maxWidthWord = 520;
                            const scale = Math.min(1, maxWidthWord / imgInfo.width);
                            const finalWidth = imgInfo.width * scale;
                            const finalHeight = imgInfo.height * scale;

                            children.push(new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: imgInfo.data,
                                        transformation: {
                                            width: finalWidth,
                                            height: finalHeight
                                        },
                                        type: imgInfo.type || "jpg"
                                    })
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 100, after: 300 }
                            }));
                        }
                        visualPointer++;
                    } else { isInsideVisualBlock = true; }
                } else { isInsideVisualBlock = false; }
                continue;
            }

            if (isInsideVisualBlock) continue;

            const isTableRow = trimmedLine.startsWith('|') && trimmedLine.endsWith('|');
            const isSeparatorRow = trimmedLine.match(/^\|[:-\s|]+\|$/);

            if (isTableRow && !isSeparatorRow) {
                isProcessingTable = true;
                const cells = line.split('|').map(s => s.trim()).filter((s, idx, arr) => idx > 0 && idx < arr.length - 1);

                if (cells.length > 0) {
                    const isLogicalHeader = currentTableRows.length === 0;

                    const splitted = cells.map(c => c.split(/<br\s*\/?>/gi));
                    const maxLines = Math.max(...splitted.map(l => l.length));

                    for (let i = 0; i < maxLines; i++) {
                        currentTableRows.push(new TableRow({
                            children: splitted.map((lines, colIdx) => {
                                // Lógica de verticalMerge para Word (docx v7+)
                                let vMerge = undefined;
                                let cellText = (lines[i] || "").trim();

                                if (lines.length === 1) {
                                    // Caso 1: La celda solo tiene 1 línea, combinamos verticalmente todo el grupo
                                    vMerge = (i === 0) ? VerticalMergeType.RESTART : VerticalMergeType.CONTINUE;
                                    if (i > 0) cellText = ""; // Texto solo en la primera fila física
                                } else {
                                    // Caso 2: Celda multilínea
                                    if (i === 0) {
                                        vMerge = VerticalMergeType.RESTART;
                                    } else if (i < lines.length) {
                                        // Aún hay texto original, no combinamos, dejamos que fluya en su propia fila
                                        vMerge = undefined;
                                    } else {
                                        // Se acabó su texto pero otras celdas siguen, combinamos el espacio vacío
                                        vMerge = VerticalMergeType.CONTINUE;
                                        cellText = "";
                                    }
                                }

                                const cellContentText = cleanTextForXML(cellText);
                                const cellChildren = [];

                                // Dividir por marcadores de negrita **texto**
                                const parts = cellContentText.split(/(\*\*.*?\*\*)/g);

                                parts.forEach(part => {
                                    if (part.startsWith('**') && part.endsWith('**')) {
                                        cellChildren.push(new TextRun({
                                            text: part.slice(2, -2),
                                            bold: true,
                                            size: 22,
                                            font: "Times New Roman",
                                            color: isLogicalHeader ? "FFFFFF" : undefined
                                        }));
                                    } else if (part) {
                                        cellChildren.push(new TextRun({
                                            text: part,
                                            bold: isLogicalHeader, // Heredar negrita si es header
                                            size: 22,
                                            font: "Times New Roman",
                                            color: isLogicalHeader ? "FFFFFF" : undefined
                                        }));
                                    }
                                });

                                return new TableCell({
                                    verticalMerge: vMerge,
                                    children: [new Paragraph({
                                        children: cellChildren,
                                        spacing: { before: 0, after: 0 },
                                        alignment: AlignmentType.CENTER
                                    })],
                                    shading: isLogicalHeader ? { fill: "333333" } : undefined,
                                    verticalAlign: "center"
                                });
                            })
                        }));
                    }
                }
                continue;
            }

            if (isProcessingTable && (isSeparatorRow || !isTableRow)) {
                if (currentTableRows.length > 0 && !isSeparatorRow) {
                    children.push(new Table({ rows: currentTableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
                    children.push(new Paragraph({ text: "" }));
                    currentTableRows = [];
                    isProcessingTable = false;
                }
                if (isSeparatorRow) continue;
            }

            if (trimmedLine === '') continue;

            if (line.startsWith('# ')) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: cleanTextForXML(line.replace('# ', '')), bold: true, size: 32, font: "Times New Roman" })],
                    spacing: { before: 300, after: 150 }
                }));
            } else if (line.startsWith('## ')) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: cleanTextForXML(line.replace('## ', '')), bold: true, size: 28, font: "Times New Roman" })],
                    spacing: { before: 200, after: 100 }
                }));
            } else {
                const parts = line.split(/(\*\*.*?\*\*)/);
                const runs = parts.map(part => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return new TextRun({ text: cleanTextForXML(part.slice(2, -2)), bold: true, size: 22, font: "Times New Roman" });
                    }
                    return new TextRun({ text: cleanTextForXML(part), size: 22, font: "Times New Roman" });
                });
                children.push(new Paragraph({ children: runs, spacing: { after: 120 } }));
            }
        }

        if (isProcessingTable && currentTableRows.length > 0) {
            children.push(new Table({ rows: currentTableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        }

        const doc = new Document({
            sections: [{
                properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
                children: children
            }]
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, finalFileName);
    } catch (error) {
        console.error("Error fatal en exportToWord:", error);
    }
};
