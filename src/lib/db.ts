import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

const globalForPg = globalThis as unknown as { reviewResponderPool?: Pool };

export const pool =
  globalForPg.reviewResponderPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.reviewResponderPool = pool;
}

let safeRoleCheck: Promise<void> | null = null;

async function ensureSafeRole(): Promise<void> {
  if (!safeRoleCheck) {
    safeRoleCheck = pool
      .query<{ rolsuper: boolean; rolbypassrls: boolean }>(
        "select rolsuper, rolbypassrls from pg_roles where rolname = current_user"
      )
      .then(({ rows }) => {
        const role = rows[0];

        if (!role) {
          throw new Error("Could not verify the database role.");
        }

        if (role.rolsuper || role.rolbypassrls) {
          throw new Error(
            "The database role must not be a superuser or have BYPASSRLS. Use a restricted app_user role."
          );
        }
      })
      .catch((error) => {
        safeRoleCheck = null;
        throw error;
      });
  }

  return safeRoleCheck;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  await ensureSafeRole();
  return pool.query<T>(text, params);
}

export async function withUser<T>(
  userId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  await ensureSafeRole();

  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query("select set_config('app.user_id', $1, true)", [userId]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
