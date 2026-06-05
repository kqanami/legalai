const fs = require('fs');

let content = fs.readFileSync('src/pages/DocumentWorkspace.jsx', 'utf8');

// 1. Root
content = content.replace(
  `className="fixed inset-0 z-[100] flex flex-col lg:flex-row overflow-hidden bg-[#050505] text-white selection:bg-white/20"`,
  `className="fixed inset-0 z-[100] flex flex-col lg:flex-row lg:overflow-hidden overflow-y-auto custom-scrollbar bg-[#050505] text-white selection:bg-white/20"`
);

// 2. Left Pane
content = content.replace(
  `className="lg:w-[35%] xl:w-[28%] border-b lg:border-b-0 lg:border-r border-white/5 bg-[#050505] z-20 flex flex-col shrink-0"`,
  `className="lg:w-[35%] xl:w-[28%] border-b lg:border-b-0 lg:border-r border-white/5 bg-[#050505] z-20 flex flex-col shrink-0 lg:h-screen lg:sticky lg:top-0"`
);

// Left pane inner
content = content.replace(
  `className="flex-1 flex flex-col justify-center px-6 lg:px-8 py-8 lg:py-0 overflow-y-auto custom-scrollbar"`,
  `className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-8 lg:py-0 lg:overflow-y-auto custom-scrollbar"`
);

content = content.replace(
  `className="p-6 lg:p-8 border-t border-white/5 bg-[#050505] flex flex-col gap-3 shrink-0"`,
  `className="p-4 sm:p-6 lg:p-8 border-t border-white/5 bg-[#050505] flex flex-col gap-3 shrink-0"`
);

// 3. Right Pane
content = content.replace(
  `className="lg:w-[65%] xl:w-[72%] bg-[#050505] flex flex-col lg:h-screen relative min-h-0"`,
  `className="lg:w-[65%] xl:w-[72%] bg-[#050505] flex flex-col lg:h-screen relative lg:min-h-0"`
);

content = content.replace(
  `className="min-h-0 flex-1 flex flex-col overflow-hidden p-4 sm:p-6 lg:p-8"`,
  `className="lg:min-h-0 flex-1 flex flex-col lg:overflow-hidden p-4 sm:p-6 lg:p-8"`
);

content = content.replace(
  `className="flex h-full min-h-0 flex-col gap-6"`,
  `className="flex lg:h-full lg:min-h-0 flex-col gap-6"`
);

content = content.replace(
  `className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_460px] 2xl:grid-cols-[minmax(0,1fr)_520px]"`,
  `className="grid lg:min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_460px] 2xl:grid-cols-[minmax(0,1fr)_520px]"`
);

// Editor section
content = content.replace(
  `className="relative flex min-h-0 flex-col overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#050505] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] transition-colors"`,
  `className="relative flex min-h-[500px] lg:min-h-0 flex-col lg:overflow-hidden rounded-[2rem] lg:rounded-[2.5rem] border border-white/5 bg-[#050505] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] transition-colors"`
);

// Editor p-6
content = content.replace(
  `className="p-6 lg:p-8 pb-4"`,
  `className="p-4 sm:p-6 lg:p-8 pb-4"`
);

// Textarea
content = content.replace(
  `className={\`custom-scrollbar min-h-0 flex-1 resize-none bg-transparent px-6 lg:px-8 pb-8 text-[15px] leading-8 text-neutral-300 outline-none placeholder:text-neutral-600 \${`,
  `className={\`custom-scrollbar min-h-[300px] lg:min-h-0 flex-1 resize-none bg-transparent px-4 sm:px-6 lg:px-8 pb-8 text-[15px] leading-8 text-neutral-300 outline-none placeholder:text-neutral-600 \${`
);

// Risks section
content = content.replace(
  `className="flex min-h-0 flex-col overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#050505] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] transition-colors"`,
  `className="flex lg:min-h-0 flex-col lg:overflow-hidden rounded-[2rem] lg:rounded-[2.5rem] border border-white/5 bg-[#050505] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] transition-colors"`
);

// Risks inner list
content = content.replace(
  `className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-6 lg:px-8 pb-4"`,
  `className="custom-scrollbar lg:min-h-0 flex-1 space-y-4 lg:overflow-y-auto px-4 sm:px-6 lg:px-8 pb-4"`
);

// Update diff view heights
content = content.replace(
  `className="flex h-full min-h-0 flex-col gap-4"`,
  `className="flex lg:h-full lg:min-h-0 flex-col gap-4"`
);

content = content.replace(
  `className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-2"`,
  `className="grid lg:min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-2"`
);

content = content.replace(
  `className="flex min-h-0 flex-col overflow-hidden`,
  `className="flex min-h-[400px] lg:min-h-0 flex-col lg:overflow-hidden`
);
content = content.replace(
  `className="flex min-h-0 flex-col overflow-hidden`,
  `className="flex min-h-[400px] lg:min-h-0 flex-col lg:overflow-hidden`
);

fs.writeFileSync('src/pages/DocumentWorkspace.jsx', content);
console.log("Modifications applied successfully.");
