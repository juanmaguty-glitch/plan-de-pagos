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
        
        // Estrategia: Buscamos filas que comiencen con el número de cuota, seguidos de importes y fechas.
        // Formato esperado: (Nro) (Capital) (Int.Fin) (Int.Pun) (Total1) (Fecha1) [(Total2) (Fecha2)]
        // Ej: "1 276.894,72 106.544,60 - 383.439,32 16/04/2026 411.014,78 26/04/2026"
        const quotas: Quota[] = [];
        const rowRegex = /(\d+)\s+([\d.,]+)\s+([\d.,]+|-)\s+([\d.,]+|-)\s+([\d.,]+)\s+(\d{2}\/\d{2}\/\d{4})(?:\s+([\d.,]+)\s+(\d{2}\/\d{2}\/\d{4}))?/g;
        
        let match;
        while ((match = rowRegex.exec(fullText)) !== null) {
          const quotaNum = parseInt(match[1]);
          const capital = parseAmount(match[2]);
          const financialInt = parseAmount(match[3]);
          const compensatoryInt = parseAmount(match[4]);
          const total1 = parseAmount(match[5]);
          const date1 = parseDate(match[6]);
          
          const total2 = match[7] ? parseAmount(match[7]) : null;
          const date2 = match[8] ? parseDate(match[8]) : null;

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
