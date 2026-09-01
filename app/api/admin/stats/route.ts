import { NextRequest, NextResponse } from 'next/server';
import { and, gte, lte, ne } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { bills, expenses, salaryPayments } from '@/lib/db/schema';
import { getSession } from '@/lib/session';
import { startOfMonth, endOfMonth, format, parseISO } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const now = new Date();
    const IST_OFFSET = '+05:30';

    let effectiveFrom: string;
    let effectiveTo: string;
    if (fromParam && toParam) {
      effectiveFrom = fromParam;
      effectiveTo = toParam;
    } else {
      effectiveFrom = format(startOfMonth(now), 'yyyy-MM-dd');
      effectiveTo = format(endOfMonth(now), 'yyyy-MM-dd');
    }

    const start = new Date(`${effectiveFrom}T00:00:00${IST_OFFSET}`);
    const end = new Date(`${effectiveTo}T23:59:59.999${IST_OFFSET}`);
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const currentMonthBills = db
      .select()
      .from(bills)
      .where(and(gte(bills.createdAt, startIso), lte(bills.createdAt, endIso), ne(bills.isDeleted, true)))
      .all();

    const currentMonthExpenses = db.select().from(expenses).where(and(gte(expenses.date, startIso), lte(expenses.date, endIso))).all();

    const paymentsInRange = db
      .select()
      .from(salaryPayments)
      .where(and(gte(salaryPayments.paidAt, startIso), lte(salaryPayments.paidAt, endIso)))
      .all();

    const totalSales = currentMonthBills.reduce((acc, bill) => acc + (bill.subtotal || 0), 0);
    const totalExpenses = currentMonthExpenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);
    const totalSalaries = paymentsInRange.reduce((acc, p) => acc + p.amount, 0);

    const chartData = [];
    const fromDate = parseISO(effectiveFrom);
    const toDate = parseISO(effectiveTo);

    const current = new Date(fromDate);
    while (current <= toDate) {
      const dayStr = format(current, 'yyyy-MM-dd');
      const label = format(current, 'MMM dd');

      const istDayStart = new Date(`${dayStr}T00:00:00${IST_OFFSET}`).toISOString();
      const istDayEnd = new Date(`${dayStr}T23:59:59.999${IST_OFFSET}`).toISOString();

      const dayBills = currentMonthBills.filter((b) => b.createdAt >= istDayStart && b.createdAt <= istDayEnd);
      const dayExpenses = currentMonthExpenses.filter((e) => e.date >= istDayStart && e.date <= istDayEnd);

      chartData.push({
        name: label,
        sales: dayBills.reduce((acc, b) => acc + (b.subtotal || 0), 0),
        expenses: dayExpenses.reduce((acc, e) => acc + (e.amount || 0), 0),
        timestamp: new Date(istDayStart).getTime(),
      });

      current.setDate(current.getDate() + 1);
    }

    const filteredChartData = chartData.filter(
      (d) => d.timestamp <= now.getTime() || format(new Date(d.timestamp), 'MMM dd') === format(now, 'MMM dd')
    );

    return NextResponse.json({
      summary: {
        totalSales,
        totalExpenses,
        totalSalaries,
        netProfit: totalSales - totalExpenses - totalSalaries,
      },
      chartData: filteredChartData,
    });
  } catch (error) {
    console.error('GET stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
}
