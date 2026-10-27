import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const connectionString =
  process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Set ADMIN_DATABASE_URL or DATABASE_URL before migrating.");
  process.exit(1);
}

const client = new Client({ connectionString });
await client.connect();

try {
  await client.query("begin");
  const directory = path.join(process.cwd(), "db", "migrations");
  const files = (await readdir(directory))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = await readFile(path.join(directory, file), "utf8");
    await client.query(sql);
    console.log(`applied ${file}`);
  }

  await client.query("commit");
} catch (error) {
  await client.query("rollback").catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end();
}
