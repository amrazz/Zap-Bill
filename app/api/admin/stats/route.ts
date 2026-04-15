import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Bill from '@/lib/models/Bill';
import Expense from '@/lib/models/Expense';
import Salary from '@/lib/models/Salary';
import { getSession } from '@/lib/session';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, startOfDay, endOfDay, parseISO } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.department !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from'); // YYYY-MM-DD
    const toParam = searchParams.get('to');     // YYYY-MM-DD

    await connectDB();

    const now = new Date();
    const IST_OFFSET = "+05:30";
    let start: Date;
    let end: Date;

    // We'll determine the effective from/to strings
    let effectiveFrom: string;
    let effectiveTo: string;

    if (fromParam && toParam) {
      effectiveFrom = fromParam;
      effectiveTo = toParam;
    } else {
      // Default to current month
      effectiveFrom = format(startOfMonth(now), 'yyyy-MM-dd');
      effectiveTo = format(endOfMonth(now), 'yyyy-MM-dd');
    }

    start = new Date(`${effectiveFrom}T00:00:00${IST_OFFSET}`);
    end = new Date(`${effectiveTo}T23:59:59.999${IST_OFFSET}`);

    // Get all bills for this range (exclude deleted)
    const currentMonthBills = await Bill.find({
      createdAt: { $gte: start, $lte: end },
      isDeleted: { $ne: true }
    }).lean();

    // Get all expenses for this range
    const currentMonthExpenses = await Expense.find({
      date: { $gte: start, $lte: end }
    }).lean();

    // Get all salaries that have any payment in this range OR legacy paidAt in range
    const salaries = await Salary.find({
      $or: [
        { "payments.paidAt": { $gte: start, $lte: end } },
        { paidAt: { $gte: start, $lte: end } }
      ]
    }).lean();

    // Summary Totals
    const totalSales = currentMonthBills.reduce((acc, bill) => acc + (bill.subtotal || 0), 0);
    const totalExpenses = currentMonthExpenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);
    
    // Sum salary payments correctly
    let totalSalaries = 0;
    salaries.forEach(salary => {
      if (salary.payments && salary.payments.length > 0) {
        salary.payments.forEach((p: any) => {
          if (p.paidAt >= start && p.paidAt <= end) {
            totalSalaries += p.amount;
          }
        });
      } else if (salary.amount && salary.paidAt && salary.paidAt >= start && salary.paidAt <= end) {
        totalSalaries += salary.amount;
      }
    });

    // Chart Data: Daily Sales vs Expenses
    const chartData = [];
    const fromDate = parseISO(effectiveFrom);
    const toDate = parseISO(effectiveTo);
    
    let current = new Date(fromDate);
    while (current <= toDate) {
      const dayStr = format(current, 'yyyy-MM-dd');
      const label = format(current, 'MMM dd');

      const istDayStart = new Date(`${dayStr}T00:00:00${IST_OFFSET}`);
      const istDayEnd = new Date(`${dayStr}T23:59:59.999${IST_OFFSET}`);

      const dayBills = currentMonthBills.filter(b => b.createdAt >= istDayStart && b.createdAt <= istDayEnd);
      const dayExpenses = currentMonthExpenses.filter(e => e.date >= istDayStart && e.date <= istDayEnd);

      chartData.push({
        name: label,
        sales: dayBills.reduce((acc, b) => acc + (b.subtotal || 0), 0),
        expenses: dayExpenses.reduce((acc, e) => acc + (e.amount || 0), 0),
        timestamp: istDayStart.getTime()
      });

      current.setDate(current.getDate() + 1);
    }

    // Filter out future days in current month to keep it clean
    const filteredChartData = chartData.filter(d => d.timestamp <= now.getTime() || format(new Date(d.timestamp), 'MMM dd') === format(now, "MMM dd"));

    return NextResponse.json({
      summary: {
        totalSales,
        totalExpenses,
        totalSalaries,
        netProfit: totalSales - totalExpenses - totalSalaries
      },
      chartData: filteredChartData
    });
  } catch (error) {
    console.error('GET stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
}
