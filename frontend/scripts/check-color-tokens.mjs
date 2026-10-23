import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { baseNames, colorLiteralPattern, independentColorSources, nonVisualColorSources, independentColorFragments } from './color-policy.mjs';

const walk=async dir=>(await Promise.all((await readdir(dir,{withFileTypes:true})).map(entry=>entry.isDirectory()?walk(`${dir}/${entry.name}`):`${dir}/${entry.name}`))).flat();
const files=(await walk('src')).filter(file=>/\.(css|tsx?|svg)$/.test(file)&&! /\.(test|spec)\./.test(file));
const themePath='src/shared/style/theme.css';
const theme=await readFile(themePath,'utf8');
const definitions=[...theme.matchAll(/(--[\w-]+):\s*([^;]+);/g)];
const declarations=new Map();
for(const [,name,value] of definitions)declarations.set(name,[...(declarations.get(name)??[]),value]);
const errors=[];
const bases=definitions.filter(([,name])=>name.startsWith('--base-'));
const catalog=await readFile('src/presentation/context/palette.ts','utf8');
const paletteIds=[...catalog.matchAll(/id:\s*"([\w-]+)"/g)].map(match=>match[1]);
const paletteBlocks=[...theme.matchAll(/^(:root[^{]*) \{([^]*?)^\}/gm)]
 .filter(([, ,body])=>/^\s*--base-[\w-]+:/m.test(body));
if(paletteBlocks.length!==4 || bases.length!==32)errors.push('Expected four palettes with eight base definitions each.');
for(const [,selector,body] of paletteBlocks){
 const id=selector.match(/data-palette="([\w-]+)"/)?.[1];
 const entries=[...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)];
 if(!paletteIds.includes(id)||entries.length!==8||baseNames.some(name=>!entries.some(([,key])=>key===name)))errors.push(`Invalid palette block: ${id}`);
}
if(new Set(paletteIds).size!==4 || paletteIds.some(id=>!paletteBlocks.some(([,selector])=>selector.includes(`data-palette="${id}"`))))errors.push('Palette catalog and CSS definitions do not match.');
const visit=(name,stack=[])=>{
 if(baseNames.includes(name))return;
 if(stack.includes(name))throw new Error(`Color dependency cycle: ${[...stack,name].join(' -> ')}`);
 const values=declarations.get(name);
 if(!values)throw new Error(`Undefined theme dependency: ${name}`);
 for(const value of values){
  const dependencies=[...value.matchAll(/var\((--[\w-]+)/g)].map(match=>match[1]);
  if(!dependencies.length)throw new Error(`Color role does not depend on a base: ${name}`);
  for(const dependency of dependencies)visit(dependency,[...stack,name]);
 }
};
for(const name of declarations.keys())try{visit(name);}catch(error){errors.push(error.message);}
const sources=[];
let independentLiterals=0;
for(const file of files){
 let source=(await readFile(file,'utf8')).replace(/\/\*[^]*?\*\//g,'');
 const independentFragment=independentColorFragments.get(file);
 if(independentFragment && source.includes(independentFragment.fragment)){
  independentLiterals++;
  source=source.replace(independentFragment.fragment,'');
 }
 const matches=[...source.matchAll(colorLiteralPattern)].filter(match=>{
  if(nonVisualColorSources.get(file)?.includes(match[0]))return false;
  // Uppercase API/category identifiers are data, not rendered CSS colors.
  if(!file.endsWith('.css') && /^[A-Z]+$/.test(match[0]))return false;
  // An example identifier in a placeholder is not a CSS color.
  if(/placeholder=["']$/.test(source.slice(Math.max(0,match.index-20),match.index)))return false;
  return true;
 });
 if(file===themePath){
  const literalsOutsideBases=source.replace(/^\s*--base-[\w-]+:[^;]+;/gm,'').match(colorLiteralPattern)??[];
  if(literalsOutsideBases.length)errors.push(`${file}: literals outside the eight bases: ${literalsOutsideBases.join(', ')}`);
 }else if(independentColorSources.has(file)){
  independentLiterals+=matches.length;
 }else if(matches.length)errors.push(`${file}: ${matches.map(match=>match[0]).join(', ')}`);
 if(file!==themePath && /--base-[\w-]+\s*:/.test(source))errors.push(`${file}: palette bases must be defined only in theme.css`);
 sources.push({file,literals:matches.length,independent:independentColorSources.get(file)??null});
}
const families=name=>{
 if(baseNames.includes(name))return [name];
 const dependencies=declarations.get(name).flatMap(value=>
  [...value.matchAll(/var\((--[\w-]+)/g)].flatMap(match=>families(match[1])));
 return [...new Set(dependencies)];
};
const roleDependencies=errors.length?{}:Object.fromEntries([...declarations.keys()].filter(name=>!name.startsWith('--base-')&&!name.startsWith('--tone-')).map(name=>[name,families(name)]));
const report={palettes:paletteIds,configurableColors:baseNames.length,derivedVariables:declarations.size-baseNames.length,scannedFiles:files.length,independentLiterals,exceptions:Object.fromEntries(independentColorSources),independentFragments:Object.fromEntries(independentColorFragments),roleDependencies,errors,sources};
await mkdir('demo-output/color-system',{recursive:true});
await writeFile('demo-output/color-system/static-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,sources:undefined,roleDependencies:undefined}));
if(errors.length)process.exitCode=1;
