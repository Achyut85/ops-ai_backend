#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/97b49bcf8dbdf200e7d76f70b83538a7721189acf2f99f53fc2591d1c0323614/contract';
import endContract from '../../snapshots/97b49bcf8dbdf200e7d76f70b83538a7721189acf2f99f53fc2591d1c0323614/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e5cbc61ccf32b262da666c18570565eb18d37dc0837c39f5f14062e406b3e3d7/contract';
import startContract from '../../snapshots/e5cbc61ccf32b262da666c18570565eb18d37dc0837c39f5f14062e406b3e3d7/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'refreshSession',
        columns: [
          col('actorId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('actorType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('familyId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('organizationId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('revokedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'refreshSession',
        constraint: 'refreshSession_tokenHash_key',
        columns: ['tokenHash'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'refreshSession',
        index: 'refreshSession_actorId_actorType_organizationId_idx_c76db2e8',
        columns: ['actorId', 'actorType', 'organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'refreshSession',
        index: 'refreshSession_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'refreshSession',
        index: 'refreshSession_familyId_idx_3d03045e',
        columns: ['familyId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
