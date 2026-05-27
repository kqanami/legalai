const https = require('https');

const urls = [
  '9v5j3Xb9jR3Z5t9T', 
  'qW7OQsS7d7PqM2sA', 
  '7E7K0gG1vP6P-0u2',
  '7u1H3L3q3x2U9n6W'
];

urls.forEach(id => {
  https.get(`https://prod.spline.design/${id}/scene.splinecode`, (res) => {
    console.log(id, res.statusCode);
  }).on('error', (e) => {
    console.error(e);
  });
});
