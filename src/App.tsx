import { useState } from 'react';
import { Dropzone } from './components/Dropzone';
import { Dashboard } from './components/Dashboard';
import { PlanList } from './components/PlanList';
import { extractPlanFromPDF } from './utils/pdfParser';
import type { PaymentPlan } from './types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function App() {
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(false);

  // Se eliminó la persistencia en LocalStorage según lo solicitado.

  const handleFiles = async (files: File[]) => {
    setLoading(true);
    const newPlans: PaymentPlan[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const plan = await extractPlanFromPDF(file);
        
        // Validar duplicados y CUIT
        const existingPlans = [...plans, ...newPlans];
        const isDuplicate = existingPlans.some(p => p.planNumber === plan.planNumber);
        const hasDifferentCuit = existingPlans.length > 0 && existingPlans.some(p => p.cuit !== plan.cuit);
        
        if (isDuplicate) {
          errors.push(`El plan ${plan.planNumber} ya se encuentra cargado.`);
        } else if (hasDifferentCuit) {
          errors.push(`El plan ${plan.planNumber} pertenece a otro CUIT (${plan.cuit}). Todos los planes deben ser del mismo contribuyente.`);
        } else {
          newPlans.push(plan);
        }
      } catch (err: any) {
        errors.push(`Error procesando ${file.name}: ${err.message}`);
      }
    }

    if (newPlans.length > 0) {
      setPlans(prev => [...prev, ...newPlans]);
    }

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }
    setLoading(false);
  };

  const handleRemove = (planNumber: string) => {
    if (confirm(`¿Estás seguro de eliminar el plan ${planNumber}?`)) {
      setPlans(prev => prev.filter(p => p.planNumber !== planNumber));
    }
  };

  const exportPDF = async () => {
    const element = document.getElementById('dashboard-report');
    if (!element) return;
    
    // Ocultar botones temporalmente (ej. Eliminar plan)
    const buttons = element.querySelectorAll('button');
    buttons.forEach(btn => btn.style.display = 'none');
    
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      // Usar JPEG con compresión (0.8) reduce drásticamente el peso del archivo comparado a PNG
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.setFontSize(16);
      pdf.text('Reporte de Planes de Pago AFIP', 10, 15);
      
      let heightLeft = imgHeight;
      let position = 25; // Top margin for the first page
      
      pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - position);
      
      while (heightLeft > 0) {
        position = position - pageHeight; // Shift image up
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save('Reporte_Planes_AFIP.pdf');
    } catch (err) {
      console.error('Error al exportar a PDF', err);
      alert('Hubo un error al exportar el PDF.');
    } finally {
      // Restaurar botones
      buttons.forEach(btn => btn.style.display = '');
    }
  };

  return (
    <div className="container">
      <header className="flex-between mb-4">
        <div>
          <h1>Gestión de Planes de Pago</h1>
          <p className="text-muted">ARCA / AFIP - Control de Flujo Mensual</p>
        </div>
        {plans.length > 0 && (
          <button className="btn btn-primary" onClick={exportPDF}>
            Exportar Reporte a PDF
          </button>
        )}
      </header>

      <main>
        <section className="mb-4">
          <Dropzone onFileDrop={handleFiles} loading={loading} />
        </section>

        {plans.length > 0 ? (
          <div id="dashboard-report" style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px' }}>
            <div className="mb-4 text-center">
              <h2 style={{ margin: 0 }}>{plans[0].name}</h2>
              <p className="text-muted" style={{ margin: 0 }}>CUIT: {plans[0].cuit}</p>
            </div>
            
            <section>
              <Dashboard plans={plans} />
            </section>

            <section>
              <PlanList plans={plans} onRemove={handleRemove} />
            </section>
          </div>
        ) : (
          <div className="card text-center" style={{ padding: '3rem 2rem' }}>
            <h3>No hay planes cargados</h3>
            <p className="text-muted">Carga uno o más PDFs para ver la proyección de fondos.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
