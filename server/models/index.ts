// ============================================================
// Modelos de Mongoose - Registro centralizado
// ============================================================
// Este archivo importa todos los modelos para que Mongoose los
// registre al iniciar la aplicación. Esto es crítico para evitar
// el error "MissingSchemaError: Schema hasn't been registered"
// en entornos serverless (Cloud Run) con cold starts.
// ============================================================

import './User'
import './EmailLog'
import './Company'
import './LegalParams'
import './AuditLog'
import './Employee'
import './Attendance'
import './Alert'
import './Shift'
import './Payroll'
import './Absence'
import './AlertConfig'
import './Loan'
import './TenantConfig'
