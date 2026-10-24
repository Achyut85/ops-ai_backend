#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/28c0a255c9949ced04ee6655f7c7a2e24aa9c7512a245060d11db0dd417a3476/contract';
import endContract from '../../snapshots/28c0a255c9949ced04ee6655f7c7a2e24aa9c7512a245060d11db0dd417a3476/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/97b49bcf8dbdf200e7d76f70b83538a7721189acf2f99f53fc2591d1c0323614/contract';
import startContract from '../../snapshots/97b49bcf8dbdf200e7d76f70b83538a7721189acf2f99f53fc2591d1c0323614/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'refreshSession',
        column: col('absoluteExpiresAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
