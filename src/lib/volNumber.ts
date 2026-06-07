import * as fs from 'node:fs';
import * as path from 'node:path';

export function getNextVolNumber(requested?: number): number {
  const configPath = path.join(process.cwd(), 'data', 'config.json');
  let config = { last_vol_number: 0 };
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    // use default
  }

  const vol = requested ?? config.last_vol_number + 1;

  // Save updated config
  config.last_vol_number = vol;
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch {
    // non-fatal
  }

  return vol;
}
