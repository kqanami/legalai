const fs = require('fs');
let c = fs.readFileSync('src/pages/DocumentsPage.jsx', 'utf8');

// 1. Make the root container scrollable instead of hidden
c = c.replace(
  'className="flex flex-col h-full bg-[#050505] text-white overflow-hidden p-4 sm:p-6 lg:p-10 selection:bg-white/20 relative font-sans"',
  'className="flex flex-col h-full bg-[#050505] text-white overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-10 selection:bg-white/20 relative font-sans"'
);

// 2. Remove h-full from the inner motion.div wrapper so it sizes to content
c = c.replace(
  'className="flex flex-col h-full gap-8 max-w-6xl mx-auto w-full"',
  'className="flex flex-col gap-8 max-w-6xl mx-auto w-full"'
);

// 3. Remove flex-1 overflow-y-auto custom-scrollbar from the list area wrapper
c = c.replace(
  '<div className="flex-1 overflow-y-auto custom-scrollbar relative pr-2">',
  '<div className="relative pr-2">'
);

fs.writeFileSync('src/pages/DocumentsPage.jsx', c);
