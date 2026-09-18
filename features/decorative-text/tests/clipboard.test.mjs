import test from 'node:test';
import assert from 'node:assert/strict';
import { copyPlainText } from '../reference/clipboard.mjs';
test('success only after write resolves; plain string matches exactly', async () => {
  let finish;
  let written;
  let done = false;
  const environment = {isSecureContext:true,navigator:{clipboard:{writeText(text){written=text;return new Promise(r=>{finish=r;});}}}};
  const pending = copyPlainText('✦ 𝒜\n♡',environment).then(r=>{done=true;return r;});
  await Promise.resolve();
  assert.equal(done,false);
  assert.equal(written,'✦ 𝒜\n♡');
  finish();
  assert.deepEqual(await pending,{status:'copied'});
});
test('denial yields manual copy, never false success', async () => {
  const result = await copyPlainText('A',{isSecureContext:true,navigator:{clipboard:{async writeText(){throw new Error('denied');}}}});
  assert.deepEqual(result,{status:'manual',text:'A',reason:'rejected'});
});
test('insecure context yields manual copy', async () => assert.deepEqual(await copyPlainText('A',{isSecureContext:false}),{status:'manual',text:'A',reason:'unavailable'}));
test('missing API yields manual copy', async () => assert.equal((await copyPlainText('A',{isSecureContext:true})).status,'manual'));
test('empty string does not overwrite clipboard', async () => assert.deepEqual(await copyPlainText('',{}),{status:'empty'}));

