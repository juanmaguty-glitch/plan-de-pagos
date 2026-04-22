import React, { useMemo } from 'react';
import type { PaymentPlan, MonthlyProjection } from '../types';
import { format, isAfter, isSameMonth, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardProps {
  plans: PaymentPlan[];
}

const cn = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
};

export const Dashboard: React.FC<DashboardProps> = ({ plans }) => {
  
  // Fix #6: useMemo para evitar recálculos innecesarios en cada render
  const projections = useMemo(() => {
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
          
          // Cálculo del 2do vencimiento
          // En planes AFIP, el capital no varía entre vencimientos.
          // La diferencia entre total2 y total1 es recargo por mora.
          const effectiveTotal2 = quota.total2 ?? quota.total;
          proj.totalSecondDueDate += effectiveTotal2;
          proj.capitalSecondDueDate += quota.capital;
          if (quota.total2) {
             proj.interestSecondDueDate += Math.max(quota.total2 - quota.capital, 0);
          } else {
             proj.interestSecondDueDate += (quota.financialInterest + quota.compensatoryInterest);
          }
          proj.breakdown.push({ 
            planNumber: plan.planNumber, 
            amount1: quota.total, 
            amount2: effectiveTotal2
          });
        }
      });
    });

    // Añadir conteo de planes involucrados por mes
    projectionsMap.forEach((proj, key) => {
       const plansInMonth = new Set<string>();
       plans.forEach(plan => {
          const hasQuota = plan.quotas.some(q => format(q.dueDate1, 'yyyy-MM') === key);
          if (hasQuota) plansInMonth.add(plan.planNumber);
       });
       proj.plansCount = plansInMonth.size;
    });

    return Array.from(projectionsMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [plans]);

  return (
    <div>
      <div className="flex-between mb-4">
        <h3 style={{ margin: 0, color: '#374151' }}>Proyección de Fondos Necesarios</h3>
        <span className="text-muted">Planes activos: {plans.length}</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        {/* Fix #7: Estilos movidos a clases CSS en index.css */}
        <table className="projection-table">
          <thead>
            <tr>
              <th rowSpan={2}>Mes</th>
              <th rowSpan={2}>Planes involucrados</th>
              <th colSpan={3} className="pt-header-group">
                Total 1er vto
                <div className="pt-header-note">fecha estimada 16 de cada mes</div>
              </th>
              <th colSpan={3} className="pt-header-group">
                Total al 2do vto
                <div className="pt-header-note">fecha estimada 26 de cada mes</div>
              </th>
              <th rowSpan={2}>Desglose 1er vto</th>
              <th rowSpan={2}>Desglose 2do vto</th>
              <th rowSpan={2}>Plan</th>
            </tr>
            <tr>
              <th className="pt-sub">Total</th>
              <th className="pt-sub">Capital</th>
              <th className="pt-sub">Intereses</th>
              <th className="pt-sub">Total</th>
              <th className="pt-sub">Capital</th>
              <th className="pt-sub">Intereses</th>
            </tr>
          </thead>
          <tbody>
            {projections.map((proj, idx) => {
              return (
                <React.Fragment key={idx}>
                  {proj.breakdown.length > 0 ? (
                    proj.breakdown.map((item, bIdx) => {
                      const isLast = bIdx === proj.breakdown.length - 1;
                      return (
                        <tr key={`${idx}-${bIdx}`} className={cn('pt-row', isLast && 'pt-sep')}>
                          {bIdx === 0 && (
                            <>
                              <td rowSpan={proj.breakdown.length} className={cn('pt-cell', 'pt-alt', 'pt-mid', 'pt-center', 'pt-lc', 'pt-sep')}>{proj.monthYear}</td>
                              <td rowSpan={proj.breakdown.length} className={cn('pt-cell', 'pt-mid', 'pt-center', 'pt-sep')}>{proj.plansCount}</td>
                              <td rowSpan={proj.breakdown.length} className={cn('pt-cell', 'pt-alt', 'pt-mid', 'pt-right', 'pt-sep')}>{formatCurrency(proj.totalFirstDueDate)}</td>
                              <td rowSpan={proj.breakdown.length} className={cn('pt-cell', 'pt-alt', 'pt-mid', 'pt-right', 'pt-sep')}>{formatCurrency(proj.capitalFirstDueDate)}</td>
                              <td rowSpan={proj.breakdown.length} className={cn('pt-cell', 'pt-alt', 'pt-mid', 'pt-right', 'pt-sep')}>{formatCurrency(proj.interestFirstDueDate)}</td>
                              <td rowSpan={proj.breakdown.length} className={cn('pt-cell', 'pt-mid', 'pt-right', 'pt-sep')}>{formatCurrency(proj.totalSecondDueDate)}</td>
                              <td rowSpan={proj.breakdown.length} className={cn('pt-cell', 'pt-mid', 'pt-right', 'pt-sep')}>{formatCurrency(proj.capitalSecondDueDate)}</td>
                              <td rowSpan={proj.breakdown.length} className={cn('pt-cell', 'pt-mid', 'pt-right', 'pt-sep')}>{formatCurrency(proj.interestSecondDueDate)}</td>
                            </>
                          )}
                          <td className={cn('pt-cell', 'pt-alt', 'pt-right', item.amount2 > item.amount1 ? 'font-bold' : '')}>
                            {formatCurrency(item.amount1)}
                          </td>
                          <td className={cn('pt-cell', 'pt-alt', 'pt-right', item.amount2 > item.amount1 ? 'font-bold' : '')} style={{ color: item.amount2 > item.amount1 ? '#b91c1c' : 'inherit' }}>
                            {formatCurrency(item.amount2)}
                          </td>
                          <td className={cn('pt-cell', 'pt-center')}>{item.planNumber}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr key={idx} className="pt-row pt-sep">
                      <td className="pt-cell pt-alt pt-mid pt-center pt-lc pt-sep">{proj.monthYear}</td>
                      <td className="pt-cell pt-mid pt-center pt-sep">{proj.plansCount}</td>
                      <td className="pt-cell pt-alt pt-mid pt-right pt-sep">{formatCurrency(proj.totalFirstDueDate)}</td>
                      <td className="pt-cell pt-alt pt-mid pt-right pt-sep">{formatCurrency(proj.capitalFirstDueDate)}</td>
                      <td className="pt-cell pt-alt pt-mid pt-right pt-sep">{formatCurrency(proj.interestFirstDueDate)}</td>
                      <td className="pt-cell pt-mid pt-right pt-sep">{formatCurrency(proj.totalSecondDueDate)}</td>
                      <td className="pt-cell pt-mid pt-right pt-sep">{formatCurrency(proj.capitalSecondDueDate)}</td>
                      <td className="pt-cell pt-mid pt-right pt-sep">{formatCurrency(proj.interestSecondDueDate)}</td>
                      <td colSpan={3} className="pt-cell pt-alt pt-center pt-sep">Sin cuotas</td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {projections.length > 0 && (
              <tr className="pt-total-row">
                <td colSpan={2} className="pt-right">Total Proyectado:</td>
                <td className="pt-right">{formatCurrency(projections.reduce((acc, p) => acc + p.totalFirstDueDate, 0))}</td>
                <td className="pt-right">{formatCurrency(projections.reduce((acc, p) => acc + p.capitalFirstDueDate, 0))}</td>
                <td className="pt-right">{formatCurrency(projections.reduce((acc, p) => acc + p.interestFirstDueDate, 0))}</td>
                <td className="pt-right">{formatCurrency(projections.reduce((acc, p) => acc + p.totalSecondDueDate, 0))}</td>
                <td className="pt-right">{formatCurrency(projections.reduce((acc, p) => acc + p.capitalSecondDueDate, 0))}</td>
                <td className="pt-right">{formatCurrency(projections.reduce((acc, p) => acc + p.interestSecondDueDate, 0))}</td>
                <td colSpan={3}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
