import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword, verifyPassword, createSessionToken, tokenHash, normalizeUsername} from '../lib/password.ts';
import {safeAuthOrigin, sessionCookie} from '../lib/auth-http.ts';

test('passwords use unique salts and reject incorrect, missing or malformed hashes',async()=>{
 const password='local-test-only-password-123';
 const first=await hashPassword(password),second=await hashPassword(password);
 assert.notEqual(first,second);assert.ok(!first.includes(password));
 assert.equal(await verifyPassword(password,first),true);
 assert.equal(await verifyPassword('incorrect-password',first),false);
 assert.equal(await verifyPassword(password,null),false);
 assert.equal(await verifyPassword(password,'scrypt$999999999$8$5$bad$bad'),false);
 await assert.rejects(()=>hashPassword('short'));
});
test('session tokens have 256 bits of randomness and only their hashes are persisted',()=>{
 const a=createSessionToken(),b=createSessionToken();
 assert.match(a,/^[a-f0-9]{64}$/);assert.notEqual(a,b);assert.notEqual(a,tokenHash(a));
 assert.equal(tokenHash(a),tokenHash(a));
});
test('auth rejects absent, cross-origin and non-local plaintext origins',()=>{
 const req=(url,origin)=>new Request(url,{method:'POST',headers:origin?{Origin:origin}:{}});
 assert.equal(safeAuthOrigin(req('https://lucianos.example/api/auth/login','https://lucianos.example')),true);
 assert.equal(safeAuthOrigin(req('https://lucianos.example/api/auth/login','https://evil.example')),false);
 assert.equal(safeAuthOrigin(req('https://lucianos.example/api/auth/login',null)),false);
 assert.equal(safeAuthOrigin(req('http://lucianos.example/api/auth/login','http://lucianos.example')),false);
 assert.equal(safeAuthOrigin(req('http://localhost:5174/api/auth/login','http://localhost:5174')),true);
});
test('session cookie blocks JavaScript access, cross-site requests and expires on logout',()=>{
 const value=sessionCookie('abc','https://lucianos.example');
 for(const part of ['HttpOnly','SameSite=Strict','Secure','Path=/','Max-Age=43200'])assert.ok(value.includes(part));
 assert.ok(sessionCookie('abc','https://lucianos.example',true).includes('lucianos_session=;'));
 assert.ok(sessionCookie('abc','https://lucianos.example',true).includes('Max-Age=0'));
 assert.equal(normalizeUsername(' LUCIANOS@SISTEMA.COM '),'lucianos@sistema.com');
});
