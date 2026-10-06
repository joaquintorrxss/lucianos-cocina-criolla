import {sqliteTable,text,integer,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const days=sqliteTable('days',{id:text('id').primaryKey(),date:text('date').notNull().unique(),active:integer('active'),revision:integer('revision').notNull().default(1),payload:text('payload').notNull()},t=>[uniqueIndex('idx_days_active').on(t.active)]);
export const authUsers=sqliteTable('auth_users',{
 id:text('id').primaryKey(),username:text('username').notNull().unique(),
 passwordHash:text('password_hash').notNull(),active:integer('active').notNull().default(1),createdAt:integer('created_at').notNull(),
});
export const authSessions=sqliteTable('auth_sessions',{
 tokenHash:text('token_hash').primaryKey(),userId:text('user_id').notNull().references(()=>authUsers.id,{onDelete:'cascade'}),expiresAt:integer('expires_at').notNull(),
});
export const authAttempts=sqliteTable('auth_attempts',{
 key:text('key').primaryKey(),windowStart:integer('window_start').notNull(),attempts:integer('attempts').notNull(),
});
