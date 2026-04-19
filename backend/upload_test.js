const fs = require('fs');
const fetch = require('node-fetch'); // wait, built in fetch exists in node 18+

async function test() {
  try {
    const FormData = require('form-data');
    const fd = new FormData();
    fd.append('image', fs.createReadStream('test.jpg'));
    fd.append('claim', 'Test claim from script');

    const res = await fetch('http://localhost:3001/api/verify', {
      method: 'POST',
      body: fd,
      headers: fd.getHeaders()
    });
    const text = await res.text();
    console.log(res.status, text);
  } catch(e) {
    console.error(e);
  }
}
test();
