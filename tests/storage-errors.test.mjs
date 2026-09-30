import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isDayConflict,isStorageFailure} from '../lib/storage-errors.ts';
test('missing schema must not claim that a day exists',()=>{
 const e=new Error('D1_ERROR: no such table: days: SQLITE_ERROR');
 assert.equal(isDayConflict(e),false);assert.equal(isStorageFailure(e),true);
});
test('only unique day/date constraints produce day conflicts',()=>{
 assert.equal(isDayConflict(new Error('D1_ERROR: UNIQUE constraint failed: days.active: SQLITE_CONSTRAINT')),true);
 assert.equal(isDayConflict(new Error('D1_ERROR: UNIQUE constraint failed: days.date: SQLITE_CONSTRAINT')),true);
 assert.equal(isDayConflict(new Error('Database unavailable')),false);
});
test('D1 nested causes are classified without exposing SQL to the client',()=>{
 const e=new Error('Failed query',{cause:new Error('D1_ERROR: no such table: days')});
 assert.equal(isStorageFailure(e),true);assert.equal(isDayConflict(e),false);
});
