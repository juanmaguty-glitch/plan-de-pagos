import { useState, useCallback } from 'react';
import { Dropzone } from './components/Dropzone';
import { Dashboard } from './components/Dashboard';
import { PlanList } from './components/PlanList';
import { extractPlanFromPDF } from './utils/pdfParser';
import type { PaymentPlan } from './types';

interface Notification {
  id: number;
  message: string;
  type: 'error' | 'success' | 'info';
}

function App() {
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // Fix #8: Sistema de notificaciones en lugar de alert()
  const addNotification = useCallback((message: string, type: 'error' | 'success' | 'info' = 'info') => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 6000);
  }, []);

  const dismissNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

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
      addNotification(`Se cargaron ${newPlans.length} plan(es) correctamente.`, 'success');
    }

    if (errors.length > 0) {
      errors.forEach(e => addNotification(e, 'error'));
    }
    setLoading(false);
  };

  // Fix #8: Modal de confirmación en lugar de confirm()
  const handleRemove = (planNumber: string) => {
    setConfirmModal({
      message: `¿Estás seguro de eliminar el plan ${planNumber}?`,
      onConfirm: () => {
        setPlans(prev => prev.filter(p => p.planNumber !== planNumber));
        setConfirmModal(null);
        addNotification(`Plan ${planNumber} eliminado.`, 'info');
      }
    });
  };

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="container">
      {/* Notificaciones */}
      {notifications.length > 0 && (
        <div className="notifications-container no-print">
          {notifications.map(n => (
            <div key={n.id} className={`notification notification-${n.type}`}>
              <span>{n.message}</span>
              <button className="notification-close" onClick={() => dismissNotification(n.id)}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmación */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <p style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>{confirmModal.message}</p>
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={confirmModal.onConfirm}>Eliminar</button>
              <button className="btn" style={{ backgroundColor: '#e5e7eb' }} onClick={() => setConfirmModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

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
          <Dropzone onFileDrop={handleFiles} onError={(msg) => addNotification(msg, 'error')} loading={loading} />
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
