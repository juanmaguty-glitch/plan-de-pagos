import React from 'react';
import type { PaymentPlan, MonthlyProjection } from '../types';
import { format, isAfter, isSameMonth, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardProps {
  plans: PaymentPlan[];
}

export const Dashboard: React.FC<DashboardProps> = ({ plans }) => {
  
  const generateProjections = (): MonthlyProjection[] => {
    const projectionsMap = new Map<string, MonthlyProjection>();
    
    // Asumimos mes actual
    const today = new Date();
    const currentMonthStart = startOfMonth(today);

    plans.forEach(plan => {
      plan.quotas.forEach(quota => {
        // Solo consideramos cuotas del mes actual en adelante
        if (isAfter(quota.dueDate1, currentMonthStart) || isSameMonth(quota.dueDate1, currentMonthStart)) {
          const monthKey = format(quota.dueDate1, 'yyyy-MM');
          
          if (!projectionsMap.has(monthKey)) {
            projectionsMap.set(monthKey, {
              monthYear: format(quota.dueDate1, 'MMM-yy', { locale: es }).replace('.', ''),
              date: startOfMonth(quota.dueDate1),
              totalFirstDueDate: 0,
              totalSecondDueDate: 0,
              plansCount: 0,
              breakdown: []
            });
          }
          
          const proj = projectionsMap.get(monthKey)!;
          proj.totalFirstDueDate += quota.total;
          if (quota.total2) {
             proj.totalSecondDueDate += quota.total2;
          } else {
             proj.totalSecondDueDate += quota.total; // Fallback
          }
          proj.breakdown.push({ planNumber: plan.planNumber, amount: quota.total });
        }
      });
    });

    // Añadir conteo de planes involucrados por mes (simplificado, cuenta planes únicos en ese mes)
    projectionsMap.forEach((proj, key) => {
       const plansInMonth = new Set();
       plans.forEach(plan => {
          const hasQuota = plan.quotas.some(q => format(q.dueDate1, 'yyyy-MM') === key);
          if (hasQuota) plansInMonth.add(plan.planNumber);
       });
       proj.plansCount = plansInMonth.size;
    });

    return Array.from(projectionsMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const projections = generateProjections();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <h3 style={{ margin: 0, color: '#374151' }}>Proyección de Fondos Necesarios</h3>
        <span className="text-muted">Planes activos: {plans.length}</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.95rem', color: '#4b5563' }}>
          <thead>
            <tr>
              <th style={{ backgroundColor: '#6b7280', color: 'white', borderRight: '2px solid white', padding: '12px 8px', textAlign: 'center' }}>Mes</th>
              <th style={{ backgroundColor: '#6b7280', color: 'white', borderRight: '2px solid white', padding: '12px 8px', textAlign: 'center' }}>Planes involucrados</th>
              <th style={{ backgroundColor: '#6b7280', color: 'white', borderRight: '2px solid white', padding: '12px 8px', textAlign: 'center' }}>
                Total al 1er vto
                <div style={{ fontSize: '0.8rem', fontWeight: 'normal', opacity: 0.9, marginTop: '4px' }}>fecha estimada 16 de cada mes</div>
              </th>
              <th style={{ backgroundColor: '#6b7280', color: 'white', borderRight: '2px solid white', padding: '12px 8px', textAlign: 'center' }}>
                Total al 2do vto
                <div style={{ fontSize: '0.8rem', fontWeight: 'normal', opacity: 0.9, marginTop: '4px' }}>fecha estimada 26 de cada mes</div>
              </th>
              <th style={{ backgroundColor: '#6b7280', color: 'white', borderRight: '2px solid white', padding: '12px 8px', textAlign: 'center' }}>Desglose 1er cuota</th>
              <th style={{ backgroundColor: '#6b7280', color: 'white', padding: '12px 8px', textAlign: 'center' }}>Plan</th>
            </tr>
          </thead>
          <tbody>
            {projections.map((proj, idx) => {
              return (
                <React.Fragment key={idx}>
                  {proj.breakdown.length > 0 ? (
                    proj.breakdown.map((item, bIdx) => {
                      const isLastItem = bIdx === proj.breakdown.length - 1;
                      const rowBorder = isLastItem ? '1px solid #f97316' : 'none';
                      return (
                        <tr key={`${idx}-${bIdx}`}>
                          {bIdx === 0 && (
                            <>
                              <td rowSpan={proj.breakdown.length} style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #f97316', padding: '10px 8px', textTransform: 'lowercase', verticalAlign: 'middle', textAlign: 'center' }}>{proj.monthYear}</td>
                              <td rowSpan={proj.breakdown.length} style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #f97316', padding: '10px 8px', verticalAlign: 'middle', textAlign: 'center' }}>{proj.plansCount}</td>
                              <td rowSpan={proj.breakdown.length} style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #f97316', padding: '10px 8px', verticalAlign: 'middle', textAlign: 'right' }}>{formatCurrency(proj.totalFirstDueDate)}</td>
                              <td rowSpan={proj.breakdown.length} style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #f97316', padding: '10px 8px', verticalAlign: 'middle', textAlign: 'right' }}>{formatCurrency(proj.totalSecondDueDate)}</td>
                            </>
                          )}
                          <td style={{ backgroundColor: '#f3f4f6', borderBottom: rowBorder, padding: '10px 8px', textAlign: 'right' }}>{formatCurrency(item.amount)}</td>
                          <td style={{ backgroundColor: '#ffffff', borderBottom: rowBorder, padding: '10px 8px', textAlign: 'center' }}>{item.planNumber}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr key={idx}>
                      <td style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #f97316', padding: '10px 8px', textTransform: 'lowercase', verticalAlign: 'middle', textAlign: 'center' }}>{proj.monthYear}</td>
                      <td style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #f97316', padding: '10px 8px', verticalAlign: 'middle', textAlign: 'center' }}>{proj.plansCount}</td>
                      <td style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #f97316', padding: '10px 8px', verticalAlign: 'middle', textAlign: 'right' }}>{formatCurrency(proj.totalFirstDueDate)}</td>
                      <td style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #f97316', padding: '10px 8px', verticalAlign: 'middle', textAlign: 'right' }}>{formatCurrency(proj.totalSecondDueDate)}</td>
                      <td colSpan={2} style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #f97316', padding: '10px 8px', textAlign: 'center' }}>Sin cuotas</td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {projections.length > 0 && (
              <tr style={{ backgroundColor: '#6b7280', color: 'white', fontWeight: 'bold' }}>
                <td colSpan={2} style={{ padding: '12px 8px', textAlign: 'right' }}>Total Proyectado:</td>
                <td style={{ padding: '12px 8px', textAlign: 'right' }}>{formatCurrency(projections.reduce((acc, p) => acc + p.totalFirstDueDate, 0))}</td>
                <td style={{ padding: '12px 8px', textAlign: 'right' }}>{formatCurrency(projections.reduce((acc, p) => acc + p.totalSecondDueDate, 0))}</td>
                <td colSpan={2} style={{ padding: '12px 8px' }}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
