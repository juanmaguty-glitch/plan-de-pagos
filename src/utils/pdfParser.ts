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

export const extractPlanFromPDF = async (file: File): Promise<PaymentPlan> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
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

        // Para las cuotas es más complejo porque es una tabla.
        // Vamos a buscar patrones de vencimientos: nn/nn/nnnn
        // Un patrón típico de línea de cuota 1: "1 276.894,72 106.544,60 - 383.439,32 16/04/2026"
        // Pero al hacer join(' '), los espacios pueden variar.
        
        // Estrategia simplificada: Buscamos todas las fechas de vencimiento con sus importes previos.
        // Usaremos una regex para detectar importes y fechas.
        const quotas: Quota[] = [];
        
        // Regex para buscar (Total) y (Fecha) asumiendo que están juntos al final de la fila
        // Ej: 383.439,32 16/04/2026
        const rowRegex = /([\d.,]+)\s+(\d{2}\/\d{2}\/\d{4})/g;
        
        let match;
        const potentialRows = [];
        while ((match = rowRegex.exec(fullText)) !== null) {
          // match[1] es un importe potencial, match[2] es la fecha
          if (match[1].length > 3) { // Filtrar basura
             potentialRows.push({
               total: parseAmount(match[1]),
               date: parseDate(match[2]),
               dateStr: match[2]
             });
          }
        }

        // Agrupar filas de a 2 (vencimiento 1 y vencimiento 2 de cada cuota)
        for (let i = 0; i < potentialRows.length; i += 2) {
          const row1 = potentialRows[i];
          const row2 = potentialRows[i + 1];
          
          if (row1 && row1.date) {
            quotas.push({
              number: (i / 2) + 1,
              capital: 0, // No extraemos todo para simplificar, solo totales
              financialInterest: 0,
              compensatoryInterest: 0,
              total: row1.total,
              dueDate1: row1.date,
              dueDate2: row2 ? row2.date : null,
              total2: row2 ? row2.total : null
            });
          }
        }

        const plan: PaymentPlan = {
          planNumber: planMatch[1],
          cuit: cuitMatch ? cuitMatch[1] : 'Desconocido',
          name: nameMatch ? nameMatch[1].trim() : 'Desconocido',
          consolidationDate: dateMatch ? parseDate(dateMatch[1]) : null,
          quotas: quotas,
          loadedAt: new Date()
        };

        resolve(plan);
      } catch (err) {
        console.error(err);
        reject(new Error('Error al leer el PDF. Asegúrate de que sea un plan de Mis Facilidades válido.'));
      }
    };
    reader.readAsArrayBuffer(file);
  });
};
