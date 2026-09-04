import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { format } from 'date-fns';
import { db } from '@/lib/db/client';
import { bills, expenses, salaries, salaryPayments, dailyClosings } from '@/lib/db/schema';
import { getSession } from '@/lib/session';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Everything is filtered by the *local* calendar date (via date-fns `format`,
// which renders in the machine's local timezone) rather than a UTC date —
// this has to match exactly how the write-side "is this date closed" guards
// in the bills/expenses/salaries routes compute the date, or a transaction
// could be locked under one date but reported under another.
//
// Bills carry no payment method: the business only learns how a customer
// actually pays *after* the bill is printed (and some small/off-menu sales
// never get billed at all), so tagging it at checkout would just be a guess.
// The real cash/online split comes from the ledger book, typed in by the
// admin as cashReceived/onlineReceived when the day is closed (see POST).
// Expenses and salary payments are different — the business controls those
// payments and knows the method the instant it pays, so they keep the tag.
function computeLiveTotals(dateStr: string) {
  const dayBills = db
    .select()
    .from(bills)
    .where(eq(bills.isDeleted, false))
    .all()
    .filter((b) => format(new Date(b.createdAt), 'yyyy-MM-dd') === dateStr);

  const dayExpenses = db
    .select()
    .from(expenses)
    .all()
    .filter((e) => format(new Date(e.date), 'yyyy-MM-dd') === dateStr);

  const dayPayments = db
    .select()
    .from(salaryPayments)
    .all()
    .filter((p) => format(new Date(p.paidAt), 'yyyy-MM-dd') === dateStr);

  const staffNames = new Map(db.select().from(salaries).all().map((s) => [s.id, s.staffName]));

  const billAmount = (b: typeof dayBills[number]) => b.subtotal + b.takeawayCharge;
  const byMethod = <T,>(rows: T[], method: 'Cash' | 'Online', get: (r: T) => number, matches: (r: T) => 'Cash' | 'Online') =>
    rows.filter((r) => matches(r) === method).reduce((sum, r) => sum + get(r), 0);

  const totalSales = dayBills.reduce((sum, b) => sum + billAmount(b), 0);
  const cashExpenses = byMethod(dayExpenses, 'Cash', (e) => e.amount, (e) => e.paymentMethod);
  const onlineExpenses = byMethod(dayExpenses, 'Online', (e) => e.amount, (e) => e.paymentMethod);
  const cashSalaryPaid = byMethod(dayPayments, 'Cash', (p) => p.amount, (p) => p.paymentMethod);
  const onlineSalaryPaid = byMethod(dayPayments, 'Online', (p) => p.amount, (p) => p.paymentMethod);

  const totalExpenses = cashExpenses + onlineExpenses;
  const totalSalaryPaid = cashSalaryPaid + onlineSalaryPaid;

  return {
    totals: {
      totalSales,
      cashExpenses,
      onlineExpenses,
      totalExpenses,
      cashSalaryPaid,
      onlineSalaryPaid,
      totalSalaryPaid,
      billCount: dayBills.length,
      expenseCount: dayExpenses.length,
      salaryPaymentCount: dayPayments.length,
    },
    bills: dayBills.map((b) => ({
      _id: b.id,
      orderType: b.orderType,
      amount: billAmount(b),
      createdAt: b.createdAt,
    })),
    expenses: dayExpenses.map((e) => ({
      _id: e.id,
      description: e.description,
      category: e.category,
      paymentMethod: e.paymentMethod,
      amount: e.amount,
      date: e.date,
    })),
    salaryPayments: dayPayments.map((p) => ({
      _id: p.id,
      staffName: staffNames.get(p.salaryId) ?? 'Unknown',
      paymentMethod: p.paymentMethod,
      amount: p.amount,
      paidAt: p.paidAt,
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const date = new URL(request.url).searchParams.get('date');
    if (!date || !DATE_RE.test(date)) {
      return NextResponse.json({ error: 'A valid date (yyyy-MM-dd) is required.' }, { status: 400 });
    }

    const existing = db.select().from(dailyClosings).where(eq(dailyClosings.date, date)).get();
    const live = computeLiveTotals(date);

    if (existing) {
      const { id, notes, closedBy, closedAt, ...totals } = existing;
      return NextResponse.json({
        date,
        isClosed: true,
        totals,
        closing: { _id: id, notes, closedBy, closedAt },
        bills: live.bills,
        expenses: live.expenses,
        salaryPayments: live.salaryPayments,
      });
    }

    return NextResponse.json({
      date,
      isClosed: false,
      totals: live.totals,
      closing: null,
      bills: live.bills,
      expenses: live.expenses,
      salaryPayments: live.salaryPayments,
    });
  } catch (error) {
    console.error('GET daily-closing error:', error);
    return NextResponse.json({ error: 'Failed to load daily closing.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date, notes, cashReceived, onlineReceived } = await request.json();
    if (!date || !DATE_RE.test(date)) {
      return NextResponse.json({ error: 'A valid date (yyyy-MM-dd) is required.' }, { status: 400 });
    }
    if (typeof cashReceived !== 'number' || cashReceived < 0 || typeof onlineReceived !== 'number' || onlineReceived < 0) {
      return NextResponse.json({ error: "Enter today's Cash Received and Online Received amounts from the ledger book." }, { status: 400 });
    }

    const { totals } = computeLiveTotals(date);
    const values = {
      date,
      ...totals,
      cashReceived,
      onlineReceived,
      netCashInDrawer: cashReceived - totals.cashExpenses - totals.cashSalaryPaid,
      netOnline: onlineReceived - totals.onlineExpenses - totals.onlineSalaryPaid,
      netOverall: (cashReceived + onlineReceived) - totals.totalExpenses - totals.totalSalaryPaid,
      notes: notes?.trim() || null,
      closedBy: session.username,
      closedAt: new Date().toISOString(),
    };

    const existing = db.select().from(dailyClosings).where(eq(dailyClosings.date, date)).get();
    const row = existing
      ? db.update(dailyClosings).set(values).where(eq(dailyClosings.id, existing.id)).returning().get()
      : db.insert(dailyClosings).values(values).returning().get();

    const { id, ...rest } = row;
    return NextResponse.json({ _id: id, ...rest }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('POST daily-closing error:', error);
    return NextResponse.json({ error: 'Failed to close the day.' }, { status: 500 });
  }
}
