import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {emailAddress,accountInput,validateNewPassword} from '../lib/accounts.ts';
test('account validation separates login IDs from real email, normalizes both and requires matching passwords',()=>{
 assert.deepEqual(accountInput({username:' STAFF@SISTEMA.COM ',role:'operator',email:'Owner@Example.com'}),{username:'staff@sistema.com',role:'operator',email:'owner@example.com'});
 assert.equal(emailAddress(''),null);assert.equal(validateNewPassword('eight123','eight123'),'eight123');
 for(const x of ['without-domain','x@','x\r\n@example.com'])assert.throws(()=>emailAddress(x));
 assert.throws(()=>validateNewPassword('eight123','different'));assert.throws(()=>validateNewPassword('short','short'));
 assert.throws(()=>accountInput({username:'name with spaces',role:'admin',email:null}));assert.throws(()=>accountInput({username:'staff',role:'unknown',email:null}));
});
test('account migration preserves business data and old sessions until credentials are rotated',()=>{
 const db=new DatabaseSync(':memory:');try{
  for(const file of ['0000_puzzling_zaladane','0001_typical_nighthawk','0002_simple_cloak','0003_awesome_micromax'])db.exec(readFileSync(`drizzle/${file}.sql`,'utf8'));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM products').get().n,25);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM days').get().n,0);
  db.exec("INSERT INTO auth_users (id,username,password_hash,created_at,role) VALUES ('u','admin','hash',0,'admin'); INSERT INTO auth_sessions (token_hash,user_id,expires_at) VALUES ('token','u',9999999999999)");
  const sessions=()=>db.prepare('SELECT COUNT(*) AS n FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id WHERE s.auth_version=u.auth_version').get().n;
  assert.equal(sessions(),1);db.exec("UPDATE auth_users SET auth_version=auth_version+1 WHERE id='u'");assert.equal(sessions(),0);
 }finally{db.close();}
});
