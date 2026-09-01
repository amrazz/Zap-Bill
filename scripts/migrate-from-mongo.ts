/**
 * One-time import of existing MongoDB data into this installation's local SQLite database.
 * Usage: npx tsx scripts/migrate-from-mongo.ts --uri="mongodb+srv://..." --department=Restaurant
 */
import { migrateFromMongo } from '../lib/migrate/fromMongo';

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found?.slice(prefix.length);
}

async function main() {
  const uri = arg('uri');
  const department = arg('department');

  if (!uri || (department !== 'Restaurant' && department !== 'Bakery')) {
    console.error('Usage: npx tsx scripts/migrate-from-mongo.ts --uri="<mongodb-uri>" --department=Restaurant|Bakery');
    process.exit(1);
  }

  console.log(`Importing ${department} data from ${uri.replace(/:\/\/[^@]+@/, '://***@')} ...`);
  const result = await migrateFromMongo(uri, department);
  console.log('Done:', result);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
