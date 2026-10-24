import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { assemble } from './assemble-allure.mjs';
import { copyCoverage } from './assemble-public-coverage.mjs';

test('publication verifies provenance, preserves history, and rejects altered snapshots or failed evidence', () => {
  const base = mkdtempSync(path.join(tmpdir(), 'treasury-publication-test-'));
  const json = (file, value) => writeFileSync(file, JSON.stringify(value));
  try {
    const inputs = {}, context = { releaseSha:'b'.repeat(40), publicationId:'42-1',
      fingerprints:{}, sourceShas:{}, workflowRuns:{}, previous:{reports:[{id:'older'}]} };
    for (const app of ['frontend','backend']) {
      const dir = inputs[app] = path.join(base,app);
      for (const sub of ['allure/coverage','allure/allure-results','allure/allure-report']) mkdirSync(path.join(dir,sub),{recursive:true});
      writeFileSync(path.join(dir,'allure/coverage/manifest.json'),'[]');
      writeFileSync(path.join(dir,'allure/allure-report/index.html'),'<html>Validated fixture</html>');
      json(path.join(dir,'allure/allure-report/summary.json'),{stats:{total:3,passed:3}});
      const record = {runId:'example',application:app,suite:'combined',scope:'complete',sha:'a'.repeat(40),dirty:false,
        runnerExitCode:0,exitCode:0,counts:{matches:true,reportMatches:true,runner:{total:3,passed:3,failed:0,skipped:0,todo:0}},
        coverage:{status:'available',application:app,denominator:'fixture',metrics:{lines:{covered:2,total:3,percent:66.67}},
          manifestSha256:createHash('sha256').update('[]').digest('hex')}};
      json(path.join(dir,'allure/run.json'),record);
      context.fingerprints[app]='c'.repeat(64); context.sourceShas[app]=record.sha; context.workflowRuns[app]='24';
      json(path.join(dir,'receipt.json'),{schema:1,application:app,suite:'combined',valid:true,sha:record.sha,
        fingerprint:context.fingerprints[app],runId:record.runId,workflowRunId:'24'});
    }
    const output = path.join(base,'output');
    const catalog = assemble(inputs,output,context);
    assert.equal(catalog.reports.length,3);
    assert.equal(catalog.reports[0].sha,'a'.repeat(40));
    assert.equal(catalog.reports[0].releaseSha,'b'.repeat(40));
    // The same CI artifact feeds public coverage Pages, which must exclude Allure.
    writeFileSync(path.join(inputs.frontend,'index.html'),'Coverage only');
    const publicDir = path.join(base,'public');
    copyCoverage(inputs.frontend,publicDir);
    assert.equal(readFileSync(path.join(publicDir,'index.html'),'utf8'),'Coverage only');
    assert.throws(()=>readFileSync(path.join(publicDir,'allure/run.json')));
    assert.throws(()=>readFileSync(path.join(publicDir,'receipt.json')));
    context.fingerprints.frontend='d'.repeat(64);
    assert.throws(()=>assemble(inputs,output,context),/Unattributed/);
    context.fingerprints.frontend='c'.repeat(64);
    const receiptFile=path.join(inputs.frontend,'receipt.json');
    const receipt=JSON.parse(readFileSync(receiptFile,'utf8')); receipt.valid=false; json(receiptFile,receipt);
    assert.throws(()=>assemble(inputs,output,context),/Unattributed/);
    receipt.valid=true; json(receiptFile,receipt);
    writeFileSync(path.join(inputs.frontend,'allure/coverage/manifest.json'),'[1]');
    assert.throws(()=>assemble(inputs,output,context),/integrity/);
  } finally {
    assert.equal(path.dirname(path.resolve(base)),path.resolve(tmpdir()));
    assert.ok(path.basename(base).startsWith('treasury-publication-test-'));
    rmSync(base,{recursive:true,force:true});
  }
});
