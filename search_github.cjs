const https = require('https');

const options = {
  hostname: 'api.github.com',
  path: '/search/code?q=scene.splinecode+extension:tsx+OR+extension:js',
  headers: {
    'User-Agent': 'Node.js',
    'Accept': 'application/vnd.github.v3+json'
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('Got result', result.items ? result.items.length : data);
      if (result.items) {
         // just print the text_matches or url
         result.items.slice(0, 10).forEach(item => {
            console.log(item.repository.html_url, item.html_url);
         });
      }
    } catch(e) { console.error(e) }
  });
}).on('error', console.error);
