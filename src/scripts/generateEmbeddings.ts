import { ingestCairoBook } from '../ingester/cairoBookIngester';

async function main() {
  console.log('Starting Cairo Book ingestion process...');
  try {
  await ingestCairoBook();
    console.log('Cairo Book ingestion completed successfully.');
  } catch (error) {
    console.error('Error during Cairo Book ingestion:', error);
    process.exit(1);
  }
}

main();
