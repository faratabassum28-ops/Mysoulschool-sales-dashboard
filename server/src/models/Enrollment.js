import mongoose from 'mongoose';

// One document per cleaned enrollment (the DB_Clean rows).
// `raw` holds the original 25 Dashboard columns under their exact header names.
const EnrollmentSchema = new mongoose.Schema({
  syncId: { type: String, index: true },
  sNo: String,
  raw: { type: mongoose.Schema.Types.Mixed },

  // helper columns [NEW]
  date: { type: String, index: true }, // YYYY-MM-DD
  week: String, // Monday of the week
  month: String, // YYYY-MM
  quarter: String, // YYYY-Qn
  year: Number,
  day: String,

  program: { type: String, index: true },
  pymtStatus: String,
  closedBy: { type: String, index: true }, // "Not Tagged" when blank (dashboard only)
  notTagged: Boolean,
  programFee: Number,
  bookingAmount: Number,
  amountReceived: Number,
  amountDue: Number,
}, { minimize: false });

const SyncLogSchema = new mongoose.Schema({
  syncId: String,
  at: { type: Date, default: Date.now },
  source: String,
  ok: Boolean,
  stats: mongoose.Schema.Types.Mixed,
  error: String,
}, { minimize: false });

export const Enrollment = mongoose.models.Enrollment || mongoose.model('Enrollment', EnrollmentSchema);
export const SyncLog = mongoose.models.SyncLog || mongoose.model('SyncLog', SyncLogSchema);
