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
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    await connectDB();

    const now = new Date();
    const start = fromParam ? startOfDay(parseISO(fromParam)) : startOfMonth(now);
    const end = toParam ? endOfDay(parseISO(toParam)) : endOfMonth(now);

    // Get all bills for this range
    const currentMonthBills = await Bill.find({
      createdAt: { $gte: start, $lte: end }
    }).lean();

    // Get all expenses for this month
    const currentMonthExpenses = await Expense.find({
      date: { $gte: start, $lte: end }
    }).lean();

    // Get all salaries for this month
    const currentMonthSalaries = await Salary.find({
        paidAt: { $gte: start, $lte: end }
    }).lean();

    // Summary Totals
    const totalSales = currentMonthBills.reduce((acc, bill) => acc + bill.subtotal, 0);
    const totalExpenses = currentMonthExpenses.reduce((acc, exp) => acc + exp.amount, 0);
    const totalSalaries = currentMonthSalaries.reduce((acc, sal) => acc + sal.amount, 0);

    // Chart Data: Daily Sales vs Expenses
    const days = eachDayOfInterval({ start, end });
    const chartData = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const label = format(day, 'MMM dd');
      
      const dayBills = currentMonthBills.filter(b => format(new Date(b.createdAt), 'yyyy-MM-dd') === dayStr);
      const dayExpenses = currentMonthExpenses.filter(e => format(new Date(e.date), 'yyyy-MM-dd') === dayStr);
      
      return {
        name: label,
        sales: dayBills.reduce((acc, b) => acc + b.subtotal, 0),
        expenses: dayExpenses.reduce((acc, e) => acc + e.amount, 0),
      };
    }).filter(d => new Date(d.name + ' ' + now.getFullYear()) <= now); // Filter out future days in the month

    return NextResponse.json({
      summary: {
        totalSales,
        totalExpenses,
        totalSalaries,
        netProfit: totalSales - totalExpenses - totalSalaries
      },
      chartData
    });
  } catch (error) {
    console.error('GET stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
}
