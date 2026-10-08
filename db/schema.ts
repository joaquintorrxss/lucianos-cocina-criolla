import {sqliteTable,text,integer,uniqueIndex,index} from 'drizzle-orm/sqlite-core';
export const days=sqliteTable('days',{id:text('id').primaryKey(),date:text('date').notNull().unique(),active:integer('active'),revision:integer('revision').notNull().default(1),payload:text('payload').notNull()},t=>[uniqueIndex('idx_days_active').on(t.active)]);
export const authUsers=sqliteTable('auth_users',{
 id:text('id').primaryKey(),username:text('username').notNull().unique(),
 passwordHash:text('password_hash').notNull(),active:integer('active').notNull().default(1),createdAt:integer('created_at').notNull(),role:text('role').notNull().default('operator'),
 email:text('email'),emailVerifiedAt:integer('email_verified_at'),revision:integer('revision').notNull().default(1),authVersion:integer('auth_version').notNull().default(1),
});
export const authSessions=sqliteTable('auth_sessions',{
 tokenHash:text('token_hash').primaryKey(),userId:text('user_id').notNull().references(()=>authUsers.id,{onDelete:'cascade'}),expiresAt:integer('expires_at').notNull(),
 authVersion:integer('auth_version').notNull().default(1),
});
export const authAttempts=sqliteTable('auth_attempts',{
 key:text('key').primaryKey(),windowStart:integer('window_start').notNull(),attempts:integer('attempts').notNull(),
});
export const products=sqliteTable('products',{
 id:text('id').primaryKey(),name:text('name').notNull(),category:text('category').notNull(),
 price:integer('price').notNull(),days:text('days').notNull(),active:integer('active').notNull().default(1),
 revision:integer('revision').notNull().default(1),updatedAt:integer('updated_at').notNull(),
 stockSourceId:text('stock_source_id'),persistentStock:integer('persistent_stock').notNull().default(0),
});
export const inventory=sqliteTable('inventory',{id:integer('id').primaryKey(),revision:integer('revision').notNull().default(1),quantities:text('quantities').notNull(),lastOp:text('last_op')});
export const inventoryMovements=sqliteTable('inventory_movements',{id:text('id').primaryKey(),opId:text('op_id').notNull(),productId:text('product_id').notNull(),delta:integer('delta').notNull(),remaining:integer('remaining').notNull(),reason:text('reason').notNull(),actor:text('actor').notNull(),dayId:text('day_id'),at:text('at').notNull()},t=>[index('idx_inventory_op').on(t.opId),index('idx_inventory_at').on(t.at,t.id),index('idx_inventory_product_at').on(t.productId,t.at,t.id)]);
export const catalogMeta=sqliteTable('catalog_meta',{
 id:integer('id').primaryKey(),revision:integer('revision').notNull().default(1),
});
export const authTokens=sqliteTable('auth_tokens',{
 tokenHash:text('token_hash').primaryKey(),userId:text('user_id').notNull().references(()=>authUsers.id,{onDelete:'cascade'}),
 purpose:text('purpose').notNull(),email:text('email').notNull(),authVersion:integer('auth_version').notNull(),expiresAt:integer('expires_at').notNull(),consumedAt:integer('consumed_at'),createdAt:integer('created_at').notNull(),
});
