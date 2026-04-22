import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PaymentPlan, Quota } from '../types';

// Configurar el worker de pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const parseAmount = (val: string): number => {
  if (!val || val === '-') return 0;
  // Convert "276.894,72" to 276894.72
  const cleaned = val.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

const parseDate = (val: string): Date | null => {
  if (!val) return null;
  const parts = val.split('/');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  return null;
};

/**
 * Valida un CUIT argentino con el algoritmo de módulo 11.
 */
const isValidCuit = (cuit: string): boolean => {
  if (!/^\d{11}$/.test(cuit)) return false;
  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const digits = cuit.split('').map(Number);
  const checkDigit = digits[10];
  const sum = multipliers.reduce((acc, mult, idx) => acc + digits[idx] * mult, 0);
  const remainder = sum % 11;
  const expected = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder;
  return checkDigit === expected;
};

export const extractPlanFromPDF = async (file: File): Promise<PaymentPlan> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // Fix #4: Handler de error para FileReader
    reader.onerror = () => {
      reject(new Error(`No se pudo leer el archivo "${file.name}". Verificá que no esté corrupto o en uso.`));
    };

    reader.onload = async function () {
      try {
        const typedarray = new Uint8Array(this.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        
        let fullText = '';
        
        // Iterar sobre las páginas
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + ' ';
        }

        // Buscar campos con Regex
        const cuitMatch = fullText.match(/CUIT:\s*(\d{11})/i);
        const planMatch = fullText.match(/Número de Plan:\s*([A-Z0-9]+)/i);
        const nameMatch = fullText.match(/Nombre y Apellido:\s*([^,]+)/i);
        const dateMatch = fullText.match(/Consolidación:\s*(\d{2}\/\d{2}\/\d{4})/i);

        if (!planMatch) {
          throw new Error('No se pudo encontrar el Número de Plan en el PDF.');
        }

        // Fix #12: Validar CUIT con dígito verificador
        const cuit = cuitMatch ? cuitMatch[1] : 'Desconocido';
        if (cuit !== 'Desconocido' && !isValidCuit(cuit)) {
          throw new Error(`El CUIT ${cuit} extraído del PDF no es válido (dígito verificador incorrecto).`);
        }

        // El PDF de AFIP tiene 2 filas por cuota:
        // Fila 1 (1er vto): Nro | Capital | Int.Fin | Int.Res | Total | Fecha
        // Fila 2 (2do vto):                Int.Fin | Int.Res | Total | Fecha
        // Al unir con pdf.js quedan consecutivas en el texto.
        const quotas: Quota[] = [];
        
        // Regex mejorado: capturamos las 2 filas de la cuota.
        // La segunda parte es opcional pero buscamos que coincida con el patrón de 4 columnas adicionales.
        const rowRegex = /\b(\d{1,4})\s+([\d.,]+)\s+([\d.,]+|-)\s+([\d.,]+|-)\s+([\d.,]+)\s+(\d{2}\/\d{2}\/\d{4})(?:\s+([\d.,]+|-)\s+([\d.,]+|-)\s+([\d.,]+)\s+(\d{2}\/\d{2}\/\d{4}))?/g;
        
        let match;
        while ((match = rowRegex.exec(fullText)) !== null) {
          const quotaNum = parseInt(match[1]);
          
          // Validar que el número de cuota sea razonable (1-999)
          if (quotaNum < 1 || quotaNum > 999) continue;

          const capital = parseAmount(match[2]);
          const financialInt = parseAmount(match[3]);
          const compensatoryInt = parseAmount(match[4]);
          const total1 = parseAmount(match[5]);
          const date1 = parseDate(match[6]);
          
          // Datos del 2do vencimiento (IntFin2, IntRes2, Total2, Fecha2)
          const total2 = match[9] ? parseAmount(match[9]) : null;
          const date2 = match[10] ? parseDate(match[10]) : null;

          if (date1) {
            quotas.push({
              number: quotaNum,
              capital: capital,
              financialInterest: financialInt,
              compensatoryInterest: compensatoryInt,
              total: total1,
              dueDate1: date1,
              dueDate2: date2,
              total2: total2
            });
          }
        }

        // Fix #3: Validar que se hayan extraído cuotas
        if (quotas.length === 0) {
          throw new Error(
            `Se encontró el plan ${planMatch[1]} pero no se pudieron extraer cuotas. ` +
            `Verificá que el PDF sea un plan de Mis Facilidades válido con tabla de cuotas.`
          );
        }

        const plan: PaymentPlan = {
          planNumber: planMatch[1],
          cuit: cuit,
          name: nameMatch ? nameMatch[1].trim() : 'Desconocido',
          consolidationDate: dateMatch ? parseDate(dateMatch[1]) : null,
          quotas: quotas,
          loadedAt: new Date()
        };

        resolve(plan);
      } catch (err) {
        console.error(err);
        if (err instanceof Error) {
          reject(err);
        } else {
          reject(new Error('Error al leer el PDF. Asegúrate de que sea un plan de Mis Facilidades válido.'));
        }
      }
    };
    reader.readAsArrayBuffer(file);
  });
};
