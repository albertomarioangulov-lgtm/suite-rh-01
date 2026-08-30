import dayjs from 'dayjs'
import { Employee } from '~~/server/models/Employee'
import { Loan } from '~~/server/models/Loan'

const round2 = (value: number) => Math.round(value * 100) / 100

/**
 * Cuota fija mensual (método francés) a partir del capital, la tasa mensual
 * y el número de cuotas. Si la tasa es 0, es capital ÷ cuotas.
 */
export const calculateInstallment = (
  principal: number,
  monthlyRate: number,
  termMonths: number,
) => {
  if (monthlyRate <= 0 || termMonths <= 0) {
    return round2(principal / termMonths)
  }
  const factor = Math.pow(1 + monthlyRate, termMonths)
  return round2((principal * monthlyRate * factor) / (factor - 1))
}

/** Crea un préstamo con su cuota, total y saldo inicial calculados. */
export const createLoan = async (
  data: {
    employeeId: string
    description?: string
    principal: number
    interestRate?: number
    termMonths: number
    startDate: Date
  },
  userId?: string,
) => {
  const employee = await Employee.findById(data.employeeId)
  if (!employee) {
    throw createError({ statusCode: 404, message: 'Empleado no encontrado' })
  }

  const monthlyRate = data.interestRate ?? 0
  const installment = calculateInstallment(
    data.principal,
    monthlyRate,
    data.termMonths,
  )
  const totalWithInterest = round2(installment * data.termMonths)

  const loan = await Loan.create({
    tenantId: employee.tenantId,
    employee: employee._id,
    description: data.description,
    principal: data.principal,
    interestRate: monthlyRate,
    totalWithInterest,
    termMonths: data.termMonths,
    installment,
    balance: totalWithInterest,
    startDate: data.startDate,
    status: 'active',
    createdBy: userId,
  })

  return loan.toJSON()
}

/**
 * Deducción de préstamos para la nómina de un empleado:
 * suma la cuota de cada préstamo activo que aún no se haya cobrado en el período.
 */
export const getLoanDeductionForPeriod = async (
  employeeId: string,
  periodStart: Date,
  periodEnd: Date,
) => {
  const loans = await Loan.find({
    employee: employeeId,
    status: 'active',
    balance: { $gt: 0 },
  })
    .select('installment balance payments')
    .lean()

  let deduction = 0
  for (const loan of loans) {
    const alreadyCharged = (loan.payments ?? []).some(
      (payment) =>
        payment.periodStart &&
        payment.periodEnd &&
        new Date(payment.periodStart).getTime() ===
          new Date(periodStart).getTime() &&
        new Date(payment.periodEnd).getTime() === new Date(periodEnd).getTime(),
    )
    if (!alreadyCharged) {
      deduction += Math.min(loan.installment ?? 0, loan.balance ?? 0)
    }
  }
  return round2(deduction)
}

/**
 * Registra los pagos de préstamos al aprobar la nómina: agrega el historial
 * y descuenta el saldo de cada préstamo activo del empleado (una vez por período).
 */
export const recordLoanPayments = async (
  employeeId: string,
  periodStart: Date,
  periodEnd: Date,
  userId?: string,
) => {
  const loans = await Loan.find({
    employee: employeeId,
    status: 'active',
    balance: { $gt: 0 },
  })

  let total = 0
  for (const loan of loans) {
    const alreadyCharged = (loan.payments ?? []).some(
      (payment) =>
        payment.periodStart &&
        payment.periodEnd &&
        new Date(payment.periodStart).getTime() ===
          new Date(periodStart).getTime() &&
        new Date(payment.periodEnd).getTime() === new Date(periodEnd).getTime(),
    )
    if (alreadyCharged) continue

    const amount = Math.min(loan.installment, loan.balance)
    loan.payments.push({
      periodStart,
      periodEnd,
      amount,
      type: 'installment',
      paidAt: new Date(),
      recordedBy: userId,
    } as never)
    loan.balance = round2(loan.balance - amount)
    if (loan.balance <= 0) {
      loan.balance = 0
      loan.status = 'paid'
    }
    await loan.save()
    total += amount
  }
  return round2(total)
}

/** Abono manual al saldo de un préstamo (sin pasar por nómina). */
export const addManualPayment = async (
  id: string,
  amount: number,
  userId?: string,
) => {
  const loan = await Loan.findById(id)
  if (!loan) {
    throw createError({ statusCode: 404, message: 'Préstamo no encontrado' })
  }
  if (loan.status !== 'active') {
    throw createError({
      statusCode: 400,
      message: 'Solo se pueden abonar préstamos activos.',
    })
  }

  const paid = Math.min(amount, loan.balance)
  loan.payments.push({
    amount: paid,
    type: 'manual',
    paidAt: new Date(),
    recordedBy: userId,
  } as never)
  loan.balance = round2(loan.balance - paid)
  if (loan.balance <= 0) {
    loan.balance = 0
    loan.status = 'paid'
  }
  await loan.save()
  return loan.toJSON()
}

/** Formatea el período para mensajes (DD/MM/YYYY – DD/MM/YYYY). */
export const formatLoanPeriod = (start: Date, end: Date) =>
  `${dayjs(start).format('DD/MM/YYYY')} – ${dayjs(end).format('DD/MM/YYYY')}`
