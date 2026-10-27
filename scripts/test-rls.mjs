import { Client } from "pg";

const appUrl = process.env.DATABASE_URL;
const adminUrl = process.env.ADMIN_DATABASE_URL;

if (!appUrl) {
  console.error("Set DATABASE_URL before running the RLS check.");
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function withUser(client, userId, fn) {
  await client.query("begin");
  try {
    await client.query("select set_config('app.user_id', $1, true)", [userId]);
    const result = await fn();
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
}

const client = new Client({ connectionString: appUrl });
await client.connect();

const stamp = Date.now();
let userA;
let userB;
let reviewId;

try {
  const a = await client.query(
    "select id, email from app.create_user($1, $2)",
    [`rls-a-${stamp}@example.com`, "not-a-real-hash"]
  );
  const b = await client.query(
    "select id, email from app.create_user($1, $2)",
    [`rls-b-${stamp}@example.com`, "not-a-real-hash"]
  );

  userA = a.rows[0];
  userB = b.rows[0];
  assert(userA?.id && userB?.id, "failed to create test users");

  const inserted = await withUser(client, userA.id, () =>
    client.query(
      `insert into public.reviews
         (user_id, business_name, review_text, tone, reply_text)
       values ($1, 'RLS Test', 'This is a test review for RLS.', 'friendly', 'Thanks for the review.')
       returning id`,
      [userA.id]
    )
  );
  reviewId = inserted.rows[0].id;

  const seenByA = await withUser(client, userA.id, () =>
    client.query("select id from public.reviews where id = $1", [reviewId])
  );
  assert(seenByA.rowCount === 1, "user A should see their own review");

  const seenByB = await withUser(client, userB.id, () =>
    client.query("select id from public.reviews where id = $1", [reviewId])
  );
  assert(seenByB.rowCount === 0, "user B must not see user A's review");

  const deletedByB = await withUser(client, userB.id, () =>
    client.query("delete from public.reviews where id = $1", [reviewId])
  );
  assert(deletedByB.rowCount === 0, "user B must not delete user A's review");

  let insertBlocked = false;
  try {
    await withUser(client, userB.id, () =>
      client.query(
        `insert into public.reviews
           (user_id, business_name, review_text, tone, reply_text)
         values ($1, 'Nope', 'This is a test review for RLS.', 'friendly', 'Nope')
        `,
        [userA.id]
      )
    );
  } catch {
    insertBlocked = true;
  }
  assert(insertBlocked, "user B must not insert a review for user A");

  const stillThere = await withUser(client, userA.id, () =>
    client.query("select id from public.reviews where id = $1", [reviewId])
  );
  assert(stillThere.rowCount === 1, "user A's review should still exist");

  await withUser(client, userA.id, () =>
    client.query("delete from public.reviews where id = $1", [reviewId])
  );

  console.log("RLS check passed: users are isolated from each other.");
} catch (error) {
  console.error("RLS check failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();

  if (adminUrl) {
    const admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    try {
      if (userA?.id) {
        await admin.query("delete from public.reviews where user_id = $1", [userA.id]);
        await admin.query("delete from public.users where id = $1", [userA.id]);
      }
      if (userB?.id) {
        await admin.query("delete from public.reviews where user_id = $1", [userB.id]);
        await admin.query("delete from public.users where id = $1", [userB.id]);
      }
      console.log("Test users cleaned up.");
    } finally {
      await admin.end();
    }
  } else {
    console.log("ADMIN_DATABASE_URL not set; test users were left in place.");
  }
}
