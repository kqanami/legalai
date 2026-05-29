import re

def main():
    path = r"d:\agent1.0\ai-legal-kz\src\pages\DocumentWorkspace.jsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # The layout changes start from `<motion.div` right after `return createPortal(`
    # and go up to the beginning of the text editor `<section>`.

    # Regex search to find the start of the `<motion.div`
    start_str = """    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.99 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="fixed inset-0 z-[100] flex h-screen flex-col overflow-hidden bg-[#050505] text-white selection:bg-white/20"
    >"""
    
    end_str = """                  <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_460px] 2xl:grid-cols-[minmax(0,1fr)_520px]">
                    <section className="relative flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.02] hover:bg-white/[0.03] transition-colors">"""

    # Add ArrowLeft to imports if not there
    if "ArrowLeft" not in content and "lucide-react" in content:
        content = re.sub(r'(import\s*{[^}]*)(}\s*from\s*[\'"]lucide-react[\'"])', r'\1, ArrowLeft \2', content)

    # Make sure we can find the start and end strings
    if start_str not in content:
        # Fallback to a regex if indentation differs
        import sys
        print("start_str not found! Here is the context of what is near there:")
        idx = content.find("return createPortal")
        print(content[idx:idx+500])
        sys.exit(1)

    if end_str not in content:
        import sys
        print("end_str not found! Context:")
        idx = content.find("grid min-h-0 flex-1 grid-cols-1 gap-6")
        print(content[idx-200:idx+200])
        sys.exit(1)

    # Replacement part
    new_layout = """    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.99 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="fixed inset-0 z-[100] flex flex-col lg:flex-row overflow-hidden bg-[#050505] text-white selection:bg-white/20"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`fixed left-1/2 top-5 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border px-5 py-3 text-sm shadow-2xl backdrop-blur-xl ${
              toast.type === 'error'
                ? 'border-red-500/30 bg-red-500/10 text-red-200'
                : 'border-white/10 bg-neutral-900/90 text-white'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Left Pane: Sticky Document Identity ── */}
      <div className="lg:w-[35%] xl:w-[28%] border-b lg:border-b-0 lg:border-r border-white/5 bg-[#050505] z-20 flex flex-col">
        <div className="p-6 lg:p-8 pb-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/10 transition-colors">
            <ArrowLeft size={16} />
          </button>
          {renderStatusPill()}
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 lg:px-8 py-8 lg:py-0">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
            <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-[2rem] bg-white/[0.02] border border-white/10 flex items-center justify-center mb-8 shadow-2xl">
              <FileSearch size={40} className="text-white/40" />
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight leading-none mb-4 break-words">
              Аудит договора
            </h1>
            <p className="text-sm lg:text-base text-neutral-400 font-medium mb-10 leading-relaxed">
              {auditDocType || 'Редактор, риски и исправления в одном рабочем экране'}
            </p>

            <div className="grid grid-cols-2 gap-x-6 gap-y-8">
              <div>
                <div className="text-4xl font-black tracking-tighter text-white mb-2">{riskStats.total}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Всего рисков</div>
              </div>
              <div>
                <div className="text-4xl font-black tracking-tighter text-red-400 mb-2">{riskStats.high}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-red-500/60">Высоких рисков</div>
              </div>
              <div>
                <div className="text-4xl font-black tracking-tighter text-white mb-2">{textStats.pages}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Страниц</div>
              </div>
              <div>
                <div className="text-4xl font-black tracking-tighter text-white mb-2">{textStats.words}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Слов</div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="p-6 lg:p-8 border-t border-white/5 bg-[#050505] flex flex-col gap-3">
          {hasChanges && (
            <button
              onClick={handleCompareWithOriginal}
              className="w-full h-14 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-200 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-500/20 transition-colors active:scale-95"
            >
              <Columns2 size={16} /> Сравнить с оригиналом
            </button>
          )}
          {activeAuditId && (
            <button
              onClick={handleDownloadReport}
              className="w-full h-14 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-neutral-200 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95"
            >
              <Download size={16} /> PDF отчёт
            </button>
          )}
        </div>
      </div>

      {/* ── Right Pane: Management ── */}
      <div className="lg:w-[65%] xl:w-[72%] bg-[#050505] flex flex-col h-[60vh] lg:h-screen relative">
        <main className="min-h-0 flex-1 overflow-hidden p-4 sm:p-6 lg:p-8">
          {!results && !analyzing && renderEmptyState()}
          {analyzing && renderLoading()}

          {results && !analyzing && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex h-full min-h-0 flex-col gap-6">
              {diffResult ? (
                renderDiffView()
              ) : (
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_460px] 2xl:grid-cols-[minmax(0,1fr)_520px]">
                  <section className="relative flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.02] hover:bg-white/[0.03] transition-colors">"""

    # Do the slice replacement
    start_idx = content.find(start_str)
    end_idx = content.find(end_str) + len(end_str)
    
    content = content[:start_idx] + new_layout + content[end_idx:]

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print("Layout restructured successfully!")

if __name__ == '__main__':
    main()
