import React from 'react';
import type { PaymentPlan } from '../types';
import { format } from 'date-fns';

interface PlanListProps {
  plans: PaymentPlan[];
  onRemove: (planNumber: string) => void;
}

export const PlanList: React.FC<PlanListProps> = ({ plans, onRemove }) => {
  if (plans.length === 0) return null;

  // Se eliminó la función getQuotaValueLabel ya que no se usará

  return (
    <div className="card mt-4">
      <h3>Planes Cargados</h3>
      <div className="grid-2 mt-4">
        {plans.map(plan => (
          <div key={plan.planNumber} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '1rem' }}>
            <div className="flex-between mb-4">
              <h4 style={{ margin: 0 }}>Plan {plan.planNumber}</h4>
              <button className="btn btn-danger" onClick={() => onRemove(plan.planNumber)}>Eliminar</button>
            </div>
            <p className="text-sm"><strong>CUIT:</strong> {plan.cuit}</p>
            <p className="text-sm"><strong>Contribuyente:</strong> {plan.name}</p>
            <p className="text-sm"><strong>Consolidación:</strong> {plan.consolidationDate ? format(plan.consolidationDate, 'dd/MM/yyyy') : 'N/A'}</p>
            <p className="text-sm"><strong>Cuotas totales:</strong> {plan.quotas.length}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
