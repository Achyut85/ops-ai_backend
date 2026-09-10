#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/edd8b74807724474789c757154acd9559f6feb017186da9660bcba6764bd33fa/contract';
import startContract from '../../snapshots/edd8b74807724474789c757154acd9559f6feb017186da9660bcba6764bd33fa/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/fc3ec6c492ab412e07e519bdcdc4b49973e1ac59766b5145a6ed645b83479fd8/contract';
import endContract from '../../snapshots/fc3ec6c492ab412e07e519bdcdc4b49973e1ac59766b5145a6ed645b83479fd8/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  placeholder,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropConstraint({ schema: 'public', table: 'user', constraint: 'user_email_key' }),
      this.createTable({
        schema: 'public',
        table: 'organizationAccount',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('organizationId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'ticket',
        column: col('deletedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('passwordHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(endContract, 'backfill-user-passwordHash', {
        check: () => placeholder('backfill-user-passwordHash:check'),
        run: () => placeholder('backfill-user-passwordHash:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'user', column: 'passwordHash' }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('role', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(endContract, 'backfill-user-role', {
        check: () => placeholder('backfill-user-role:check'),
        run: () => placeholder('backfill-user-role:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'user', column: 'role' }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('status', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(endContract, 'backfill-user-status', {
        check: () => placeholder('backfill-user-status:check'),
        run: () => placeholder('backfill-user-status:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'user', column: 'status' }),
      this.dataTransform(endContract, 'handle-nulls-user-username', {
        check: () => placeholder('handle-nulls-user-username:check'),
        run: () => placeholder('handle-nulls-user-username:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'user', column: 'username' }),
      this.dropNotNull({ schema: 'public', table: 'user', column: 'email' }),
      this.addUnique({
        schema: 'public',
        table: 'organizationAccount',
        constraint: 'organizationAccount_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'organizationAccount',
        constraint: 'organizationAccount_organizationId_key',
        columns: ['organizationId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_organizationId_username_key',
        columns: ['organizationId', 'username'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'organizationAccount',
        foreignKey: {
          name: 'organizationAccount_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
