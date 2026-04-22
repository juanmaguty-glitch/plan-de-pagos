export interface Quota {
  number: number;
  capital: number;
  financialInterest: number;
  compensatoryInterest: number; // Interés resarcitorio
  total: number;
  dueDate1: Date;
  dueDate2: Date | null;
  total2: number | null; // Total al 2do vencimiento
}

export interface PaymentPlan {
  planNumber: string;
  cuit: string;
  name: string;
  consolidationDate: Date | null;
  quotas: Quota[];
  loadedAt: Date;
}

export interface MonthlyProjection {
  monthYear: string; // e.g., "04/2026"
  date: Date; // para ordenar
  totalFirstDueDate: number;
  totalSecondDueDate: number;
  plansCount: number;
  breakdown: { planNumber: string; amount: number; }[];
}
