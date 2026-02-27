import { queryDb, isDbAvailable } from './db.js';
import { withTransaction } from './transaction-wrapper.js';

export async function recordTransaction(
  fromUid: string | null,
  toUid: string | null,
  txType: string,
  amount: number,
  currency: string,
  description: string,
  tickNumber: number
): Promise<any> {
  if (!isDbAvailable()) return null;

  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO matrix_transactions (from_uid, to_uid, tx_type, amount, currency, description, tick_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [fromUid, toUid, txType, amount, currency, description, tickNumber]
    );
    return result.rows[0];
  });
}

export async function getBalance(uid: string): Promise<number> {
  if (!isDbAvailable()) return 0;

  const incoming = await queryDb(
    "SELECT COALESCE(SUM(amount), 0) as total FROM matrix_transactions WHERE to_uid = $1 AND currency = 'MATRIX_ENERGY'",
    [uid]
  );
  const outgoing = await queryDb(
    "SELECT COALESCE(SUM(amount), 0) as total FROM matrix_transactions WHERE from_uid = $1 AND currency = 'MATRIX_ENERGY'",
    [uid]
  );

  const inTotal = parseFloat(incoming.rows?.[0]?.total || '0');
  const outTotal = parseFloat(outgoing.rows?.[0]?.total || '0');
  return inTotal - outTotal + 100;
}

export async function transferEnergy(
  fromUid: string, toUid: string,
  amount: number, tickNumber: number
): Promise<{ success: boolean; message: string }> {
  if (!isDbAvailable()) return { success: false, message: 'Database unavailable' };

  const balance = await getBalance(fromUid);
  if (balance < amount) {
    return { success: false, message: 'Insufficient matrix energy' };
  }

  await recordTransaction(
    fromUid, toUid, 'TRANSFER', amount, 'MATRIX_ENERGY',
    `Energy transfer: ${fromUid} -> ${toUid}`, tickNumber
  );

  return { success: true, message: `Transferred ${amount} matrix energy` };
}

export async function rewardEnergy(
  toUid: string, amount: number,
  reason: string, tickNumber: number
): Promise<void> {
  await recordTransaction(
    null, toUid, 'REWARD', amount, 'MATRIX_ENERGY', reason, tickNumber
  );
}

export async function getTransactionHistory(
  uid: string, limit = 50
): Promise<any[]> {
  const res = await queryDb(
    `SELECT * FROM matrix_transactions
     WHERE from_uid = $1 OR to_uid = $1
     ORDER BY created_at DESC LIMIT $2`,
    [uid, limit]
  );
  return res.rows || [];
}

export async function getAllTransactions(limit = 100): Promise<any[]> {
  const res = await queryDb(
    'SELECT * FROM matrix_transactions ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return res.rows || [];
}
