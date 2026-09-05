#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0c8d3b31ebfe44bff636eca53ae812a0628b9a04e035221e27607de6f6b5733f/contract';
import endContract from '../../snapshots/0c8d3b31ebfe44bff636eca53ae812a0628b9a04e035221e27607de6f6b5733f/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/edd8b74807724474789c757154acd9559f6feb017186da9660bcba6764bd33fa/contract';
import startContract from '../../snapshots/edd8b74807724474789c757154acd9559f6feb017186da9660bcba6764bd33fa/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'ticket',
        column: col('deletedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
