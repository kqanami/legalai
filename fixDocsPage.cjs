const fs = require('fs');
let c = fs.readFileSync('src/pages/DocumentsPage.jsx', 'utf8');

c = c.replace('p-6 lg:p-10', 'p-4 sm:p-6 lg:p-10');
c = c.replace(
  '<div className="flex items-center gap-3 w-full lg:w-auto">',
  '<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">'
);
c = c.replace(
  '<motion.div variants={itemVariants} className="grid grid-cols-3 gap-4 shrink-0">',
  '<motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 shrink-0">'
);
for(let i=0; i<3; i++) {
  c = c.replace(
    'className="p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 flex flex-col justify-center"',
    'className="p-4 sm:p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 flex flex-col justify-center"'
  );
}
c = c.replace(
  '<div className="flex items-start gap-5 mb-6">',
  '<div className="flex items-start gap-4 sm:gap-5 mb-5 sm:mb-6">'
);
c = c.replace(
  'size={24} />',
  'size={20} className="sm:w-6 sm:h-6" />'
);
c = c.replace(
  'w-16 h-16 rounded-2xl',
  'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl'
);
c = c.replace(
  '<h3 className="text-xl font-bold text-white truncate"',
  '<h3 className="text-lg sm:text-xl font-bold text-white truncate"'
);
c = c.replace(
  'text-[10px] font-black uppercase tracking-widest text-white/50 shrink-0 inline-block mb-2',
  'text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/50 shrink-0 inline-block mb-1 sm:mb-2'
);
c = c.replace(
  '<div className="flex items-center justify-between pt-5 border-t border-white/5">',
  '<div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 sm:pt-5 border-t border-white/5 gap-4">'
);
c = c.replace(
  '<div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">',
  '<div className="flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0 w-full sm:w-auto">'
);
c = c.replace(
  'className="h-10 px-4 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors"',
  'className="flex-1 sm:flex-none h-10 px-4 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors"'
);
c = c.replace(
  'w-10 h-10 rounded-xl bg-white/[0.05] text-white hover:bg-white/[0.1] flex items-center justify-center transition-colors',
  'w-10 h-10 rounded-xl bg-white/[0.05] text-white hover:bg-white/[0.1] flex items-center justify-center transition-colors shrink-0'
);
c = c.replace(
  'w-10 h-10 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors',
  'w-10 h-10 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors shrink-0'
);

fs.writeFileSync('src/pages/DocumentsPage.jsx', c);
