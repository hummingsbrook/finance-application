const fs = require('fs');
const path = require('path');
const os = require('os');
const prisma = require('../../lib/prisma');

/**
 * FIXED: H-4 — Server-side JSON backup of every table.
 *
 * Streams all rows from every Prisma model server-side, writes a single JSON
 * snapshot to a temp file, sends it as an attachment, then deletes the temp
 * file. The `users` table is exported WITHOUT `passwordHash` so a leaked
 * backup cannot be used to crack credentials.
 */
async function backup(req, res) {
  let tmpPath = null;
  try {
    const now = new Date();
    const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');

    // Pull every table. Selecting explicit fields for `users` so we never
    // leak passwordHash; everything else is exported as-is.
    const [
      users,
      tithes,
      offerings,
      expenses,
      harambees,
      harambeeContributions,
      payments,
      churchServices,
      auditLogs,
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          isActive: true,
          lastLoginAt: true,
          failedLoginAttempts: true,
          lockedUntil: true,
          createdAt: true,
          updatedAt: true,
          // passwordResetToken / passwordResetExpiry / passwordHash intentionally excluded
        },
      }),
      prisma.tithe.findMany(),
      prisma.offering.findMany(),
      prisma.expense.findMany(),
      prisma.harambee.findMany(),
      prisma.harambeeContribution.findMany(),
      prisma.payment.findMany(),
      prisma.churchService.findMany(),
      prisma.auditLog.findMany(),
    ]);

    const snapshot = {
      exportedAt: now.toISOString(),
      exportedBy: req.user ? req.user.id : null,
      tables: {
        users,
        tithes,
        offerings,
        expenses,
        harambees,
        harambee_contributions: harambeeContributions,
        payments,
        church_services: churchServices,
        audit_logs: auditLogs,
      },
    };

    tmpPath = path.join(os.tmpdir(), `churchfinance_backup_${stamp}.json`);
    fs.writeFileSync(tmpPath, JSON.stringify(snapshot, null, 2));

    const downloadName = `churchfinance_backup_${now.toISOString().slice(0, 10)}.json`;
    res.download(tmpPath, downloadName, (err) => {
      // Always clean up the temp file after the response is sent (or on error).
      try { if (tmpPath && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_e) { /* ignore */ }
      if (err && !res.headersSent) {
        return res.status(500).json({ success: false, message: 'Backup download failed.', code: 'SERVER_ERROR' });
      }
    });
  } catch (err) {
    try { if (tmpPath && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_e) { /* ignore */ }
    return res.status(500).json({ success: false, message: 'Backup failed.', code: 'SERVER_ERROR' });
  }
}

module.exports = { backup };
