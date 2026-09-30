import {sqliteTable,text,integer,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const days=sqliteTable('days',{id:text('id').primaryKey(),date:text('date').notNull().unique(),active:integer('active'),revision:integer('revision').notNull().default(1),payload:text('payload').notNull()},t=>[uniqueIndex('idx_days_active').on(t.active)]);
