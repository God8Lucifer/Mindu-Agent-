import test from 'node:test';
import assert from 'node:assert/strict';
import {INSTRUCTIONS,cleanHistory,extractResponse,extractWebSources,respond} from '../src/ai.js';
import {contextText} from '../src/knowledge.js';
test('includes curated official leadership and sectors',()=>{assert.match(contextText(),/Seow Hiang Lee/);assert.match(contextText(),/Aviation and Logistics/);});
test('instructions allow variations and prohibit unrelated requests',()=>{assert.match(INSTRUCTIONS,/misspelled/);assert.match(INSTRUCTIONS,/unrelated/);});
test('history bounds',()=>{assert.equal(cleanHistory(Array.from({length:20},()=>({role:'user',content:'hi'}))).length,8);});
test('extract response text',()=>assert.equal(extractResponse({output:[{content:[{type:'output_text',text:'A specific answer'}]}]}),'A specific answer'));
test('only official domains become source links',()=>{const result=extractWebSources({output:[{content:[{annotations:[{url:'https://gmc.bt/people',title:'Board'},{url:'https://example.com/bad'}]}]}]});assert.equal(result.length,1);});
test('demo answers varied questions without repeating generic fallback',async()=>{
 const old=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;
 try {const a=await respond({question:'Who leads GMC?'});const b=await respond({question:'What are the eight sectors?'});assert.notEqual(a.answer,b.answer);assert.match(a.answer,/Board/);assert.match(b.answer,/Tourism/);}finally{if(old)process.env.OPENAI_API_KEY=old;}
});
test('live mocked API answers question using Responses API',async()=>{
 const old=process.env.OPENAI_API_KEY, web=process.env.ENABLE_WEB_SEARCH;process.env.OPENAI_API_KEY='test-only';process.env.ENABLE_WEB_SEARCH='true';
 try {const result=await respond({question:'Who leads GMC?',fetchImpl:async(url,init)=>{const body=JSON.parse(init.body);assert.equal(body.tools[0].type,'web_search');return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:'According to GMC, His Majesty chairs the board.'}]}]})};}});assert.match(result.answer,/chairs/);}finally{if(old)process.env.OPENAI_API_KEY=old;else delete process.env.OPENAI_API_KEY;if(web===undefined)delete process.env.ENABLE_WEB_SEARCH;else process.env.ENABLE_WEB_SEARCH=web;}
});
test('invalid web search tool retries grounded AI once',async()=>{
 const old=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only';let n=0;
 try {const result=await respond({question:'GMC laws?',fetchImpl:async()=>{n++;return n===1?{ok:false,status:400,json:async()=>({error:{message:'Invalid web_search tool'}})}:{ok:true,json:async()=>({output:[{content:[{type:'output_text',text:'Official legislation includes the Companies Act 2025.'}]}]})};}});assert.equal(n,2);assert.equal(result.mode,'live-ai-grounded');}finally{if(old)process.env.OPENAI_API_KEY=old;else delete process.env.OPENAI_API_KEY;}
});
