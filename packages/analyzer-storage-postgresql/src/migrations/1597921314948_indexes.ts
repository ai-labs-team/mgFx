import { MigrationBuilder } from 'node-pg-migrate';

export const up = async (pgm: MigrationBuilder) => {
  pgm.createIndex('spans', 'createdAt');
};

export const down = async (pgm: MigrationBuilder) => {
  pgm.dropIndex('spans', 'createdAt');
};
