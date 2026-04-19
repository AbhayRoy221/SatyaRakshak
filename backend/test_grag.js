import { executeGRAG } from './services/grag.js';

async function test() {
  const result = await executeGRAG("Two Indian jets downed, pilot captured by Pakistani forces");
  console.log(JSON.stringify(result, null, 2));
}

test();
