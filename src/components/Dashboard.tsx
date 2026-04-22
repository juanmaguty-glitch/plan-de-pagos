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
              capitalFirstDueDate: 0,
              interestFirstDueDate: 0,
              totalSecondDueDate: 0,
              capitalSecondDueDate: 0,
              interestSecondDueDate: 0,
              plansCount: 0,
              breakdown: []
            });
          }
          
          const proj = projectionsMap.get(monthKey)!;
          proj.totalFirstDueDate += quota.total;
          proj.capitalFirstDueDate += quota.capital;
          proj.interestFirstDueDate += (quota.financialInterest + quota.compensatoryInterest);
          
          if (quota.total2) {
             proj.totalSecondDueDate += quota.total2;
             proj.capitalSecondDueDate += quota.capital;
             // El interés en el 2do vto es el total2 menos el capital
             proj.interestSecondDueDate += (quota.total2 - quota.capital);
          } else {
             proj.totalSecondDueDate += quota.total;
             proj.capitalSecondDueDate += quota.capital;
             proj.interestSecondDueDate += (quota.financialInterest + quota.compensatoryInterest);
          }
          proj.breakdown.push({ 
            planNumber: plan.planNumber, 
            amount1: quota.total, 
            amount2: quota.total2 || quota.total 
          });
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
        <table className="projection-table" style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.9rem', color: '#4b5563' }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ backgroundColor: '#6b7280', color: 'white', borderRight: '1px solid #e5e7eb', padding: '12px 4px', textAlign: 'center' }}>Mes</th>
              <th rowSpan={2} style={{ backgroundColor: '#6b7280', color: 'white', borderRight: '1px solid #e5e7eb', padding: '12px 4px', textAlign: 'center' }}>Planes involucrados</th>
              <th colSpan={3} style={{ backgroundColor: '#6b7280', color: 'white', borderRight: '1px solid #e5e7eb', padding: '8px 4px', textAlign: 'center' }}>
                Total 1er vto
                <div style={{ fontSize: '0.75rem', fontWeight: 'normal', opacity: 0.9, marginTop: '2px' }}>fecha estimada 16 de cada mes</div>
              </th>
              <th colSpan={3} style={{ backgroundColor: '#6b7280', color: 'white', borderRight: '1px solid #e5e7eb', padding: '8px 4px', textAlign: 'center' }}>
                Total al 2do vto
                <div style={{ fontSize: '0.75rem', fontWeight: 'normal', opacity: 0.9, marginTop: '2px' }}>fecha estimada 26 de cada mes</div>
              </th>
              <th rowSpan={2} style={{ backgroundColor: '#6b7280', color: 'white', borderRight: '1px solid #e5e7eb', padding: '12px 4px', textAlign: 'center' }}>Desglose 1er vto</th>
              <th rowSpan={2} style={{ backgroundColor: '#6b7280', color: 'white', borderRight: '1px solid #e5e7eb', padding: '12px 4px', textAlign: 'center' }}>Desglose 2do vto</th>
              <th rowSpan={2} style={{ backgroundColor: '#6b7280', color: 'white', padding: '12px 4px', textAlign: 'center' }}>Plan</th>
            </tr>
            <tr>
              <th style={{ backgroundColor: '#6b7280', color: 'white', borderRight: '1px solid #e5e7eb', padding: '4px', textAlign: 'center', fontSize: '0.8rem' }}>Total</th>
              <th style={{ backgroundColor: '#6b7280', color: 'white', borderRight: '1px solid #e5e7eb', padding: '4px', textAlign: 'center', fontSize: '0.8rem' }}>Capital</th>
              <th style={{ backgroundColor: '#6b7280', color: 'white', borderRight: '1px solid #e5e7eb', padding: '4px', textAlign: 'center', fontSize: '0.8rem' }}>Intereses</th>
              <th style={{ backgroundColor: '#6b7280', color: 'white', borderRight: '1px solid #e5e7eb', padding: '4px', textAlign: 'center', fontSize: '0.8rem' }}>Total</th>
              <th style={{ backgroundColor: '#6b7280', color: 'white', borderRight: '1px solid #e5e7eb', padding: '4px', textAlign: 'center', fontSize: '0.8rem' }}>Capital</th>
              <th style={{ backgroundColor: '#6b7280', color: 'white', borderRight: '1px solid #e5e7eb', padding: '4px', textAlign: 'center', fontSize: '0.8rem' }}>Intereses</th>
            </tr>
          </thead>
          <tbody>
            {projections.map((proj, idx) => {
              return (
                <React.Fragment key={idx}>
                  {proj.breakdown.length > 0 ? (
                    proj.breakdown.map((item, bIdx) => {
                      const isLastItem = bIdx === proj.breakdown.length - 1;
                      const rowBorder = isLastItem ? '1.5px solid #f97316' : '1px solid #e5e7eb';
                      return (
                        <tr key={`${idx}-${bIdx}`} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                          {bIdx === 0 && (
                            <>
                              <td rowSpan={proj.breakdown.length} style={{ backgroundColor: '#f3f4f6', borderBottom: '1.5px solid #f97316', borderRight: '1px solid #e5e7eb', padding: '8px 4px', textTransform: 'lowercase', verticalAlign: 'middle', textAlign: 'center' }}>{proj.monthYear}</td>
                              <td rowSpan={proj.breakdown.length} style={{ backgroundColor: '#ffffff', borderBottom: '1.5px solid #f97316', borderRight: '1px solid #e5e7eb', padding: '8px 4px', verticalAlign: 'middle', textAlign: 'center' }}>{proj.plansCount}</td>
                              
                              <td rowSpan={proj.breakdown.length} style={{ backgroundColor: '#f3f4f6', borderBottom: '1.5px solid #f97316', borderRight: '1px solid #e5e7eb', padding: '8px 4px', verticalAlign: 'middle', textAlign: 'right' }}>{formatCurrency(proj.totalFirstDueDate)}</td>
                              <td rowSpan={proj.breakdown.length} style={{ backgroundColor: '#f3f4f6', borderBottom: '1.5px solid #f97316', borderRight: '1px solid #e5e7eb', padding: '8px 4px', verticalAlign: 'middle', textAlign: 'right' }}>{formatCurrency(proj.capitalFirstDueDate)}</td>
                              <td rowSpan={proj.breakdown.length} style={{ backgroundColor: '#f3f4f6', borderBottom: '1.5px solid #f97316', borderRight: '1px solid #e5e7eb', padding: '8px 4px', verticalAlign: 'middle', textAlign: 'right' }}>{formatCurrency(proj.interestFirstDueDate)}</td>
                              
                              <td rowSpan={proj.breakdown.length} style={{ backgroundColor: '#ffffff', borderBottom: '1.5px solid #f97316', borderRight: '1px solid #e5e7eb', padding: '8px 4px', verticalAlign: 'middle', textAlign: 'right' }}>{formatCurrency(proj.totalSecondDueDate)}</td>
                              <td rowSpan={proj.breakdown.length} style={{ backgroundColor: '#ffffff', borderBottom: '1.5px solid #f97316', borderRight: '1px solid #e5e7eb', padding: '8px 4px', verticalAlign: 'middle', textAlign: 'right' }}>{formatCurrency(proj.capitalSecondDueDate)}</td>
                              <td rowSpan={proj.breakdown.length} style={{ backgroundColor: '#ffffff', borderBottom: '1.5px solid #f97316', borderRight: '1px solid #e5e7eb', padding: '8px 4px', verticalAlign: 'middle', textAlign: 'right' }}>{formatCurrency(proj.interestSecondDueDate)}</td>
                            </>
                          )}
                          <td style={{ backgroundColor: '#f3f4f6', borderBottom: rowBorder, borderRight: '1px solid #e5e7eb', padding: '8px 4px', textAlign: 'right' }}>{formatCurrency(item.amount1)}</td>
                          <td style={{ backgroundColor: '#f3f4f6', borderBottom: rowBorder, borderRight: '1px solid #e5e7eb', padding: '8px 4px', textAlign: 'right' }}>{formatCurrency(item.amount2)}</td>
                          <td style={{ backgroundColor: '#ffffff', borderBottom: rowBorder, padding: '8px 4px', textAlign: 'center' }}>{item.planNumber}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr key={idx} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <td style={{ backgroundColor: '#f3f4f6', borderBottom: '1.5px solid #f97316', borderRight: '1px solid #e5e7eb', padding: '8px 4px', textTransform: 'lowercase', verticalAlign: 'middle', textAlign: 'center' }}>{proj.monthYear}</td>
                      <td style={{ backgroundColor: '#ffffff', borderBottom: '1.5px solid #f97316', borderRight: '1px solid #e5e7eb', padding: '8px 4px', verticalAlign: 'middle', textAlign: 'center' }}>{proj.plansCount}</td>
                      <td style={{ backgroundColor: '#f3f4f6', borderBottom: '1.5px solid #f97316', borderRight: '1px solid #e5e7eb', padding: '8px 4px', verticalAlign: 'middle', textAlign: 'right' }}>{formatCurrency(proj.totalFirstDueDate)}</td>
                      <td style={{ backgroundColor: '#f3f4f6', borderBottom: '1.5px solid #f97316', borderRight: '1px solid #e5e7eb', padding: '8px 4px', verticalAlign: 'middle', textAlign: 'right' }}>{formatCurrency(proj.capitalFirstDueDate)}</td>
                      <td style={{ backgroundColor: '#f3f4f6', borderBottom: '1.5px solid #f97316', borderRight: '1px solid #e5e7eb', padding: '8px 4px', verticalAlign: 'middle', textAlign: 'right' }}>{formatCurrency(proj.interestFirstDueDate)}</td>
                      <td style={{ backgroundColor: '#ffffff', borderBottom: '1.5px solid #f97316', borderRight: '1px solid #e5e7eb', padding: '8px 4px', verticalAlign: 'middle', textAlign: 'right' }}>{formatCurrency(proj.totalSecondDueDate)}</td>
                      <td style={{ backgroundColor: '#ffffff', borderBottom: '1.5px solid #f97316', borderRight: '1px solid #e5e7eb', padding: '8px 4px', verticalAlign: 'middle', textAlign: 'right' }}>{formatCurrency(proj.capitalSecondDueDate)}</td>
                      <td style={{ backgroundColor: '#ffffff', borderBottom: '1.5px solid #f97316', borderRight: '1px solid #e5e7eb', padding: '8px 4px', verticalAlign: 'middle', textAlign: 'right' }}>{formatCurrency(proj.interestSecondDueDate)}</td>
                      <td colSpan={3} style={{ backgroundColor: '#f3f4f6', borderBottom: '1.5px solid #f97316', padding: '8px 4px', textAlign: 'center' }}>Sin cuotas</td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {projections.length > 0 && (
              <tr style={{ backgroundColor: '#6b7280', color: 'white', fontWeight: 'bold', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td colSpan={2} style={{ padding: '12px 4px', textAlign: 'right' }}>Total Proyectado:</td>
                <td style={{ padding: '12px 4px', textAlign: 'right' }}>{formatCurrency(projections.reduce((acc, p) => acc + p.totalFirstDueDate, 0))}</td>
                <td style={{ padding: '12px 4px', textAlign: 'right' }}>{formatCurrency(projections.reduce((acc, p) => acc + p.capitalFirstDueDate, 0))}</td>
                <td style={{ padding: '12px 4px', textAlign: 'right' }}>{formatCurrency(projections.reduce((acc, p) => acc + p.interestFirstDueDate, 0))}</td>
                <td style={{ padding: '12px 4px', textAlign: 'right' }}>{formatCurrency(projections.reduce((acc, p) => acc + p.totalSecondDueDate, 0))}</td>
                <td style={{ padding: '12px 4px', textAlign: 'right' }}>{formatCurrency(projections.reduce((acc, p) => acc + p.capitalSecondDueDate, 0))}</td>
                <td style={{ padding: '12px 4px', textAlign: 'right' }}>{formatCurrency(projections.reduce((acc, p) => acc + p.interestSecondDueDate, 0))}</td>
                <td colSpan={3} style={{ padding: '12px 4px' }}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
