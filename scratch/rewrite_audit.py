import re

def main():
    path = r"d:\agent1.0\ai-legal-kz\src\pages\DocumentWorkspace.jsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Stats grid
    old_stats = """            <section className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs text-steel-500">Всего рисков</p>
                <p className="mt-1 text-2xl font-bold text-white">{riskStats.total}</p>
              </div>
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-xs text-red-200/70">Высокие</p>
                <p className="mt-1 text-2xl font-bold text-red-200">{riskStats.high}</p>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <p className="text-xs text-amber-200/70">Средние</p>
                <p className="mt-1 text-2xl font-bold text-amber-200">{riskStats.medium}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs text-steel-500">Объём</p>
                <p className="mt-1 text-2xl font-bold text-white">{textStats.pages}</p>
                <p className="text-xs text-steel-500">стр.</p>
              </div>
              <div className="col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:col-span-1">
                <p className="text-xs text-steel-500">Слов</p>
                <p className="mt-1 text-2xl font-bold text-white">{textStats.words}</p>
              </div>
            </section>"""
    new_stats = """            <section className="grid shrink-0 grid-cols-2 gap-6 md:grid-cols-5">
              <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6 lg:p-8 hover:bg-white/[0.04] transition-colors">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Всего рисков</p>
                <p className="mt-2 text-3xl font-black text-white">{riskStats.total}</p>
              </div>
              <div className="rounded-[2rem] border border-red-500/10 bg-red-500/5 p-6 lg:p-8 hover:bg-red-500/10 transition-colors">
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-500/60">Высокие</p>
                <p className="mt-2 text-3xl font-black text-red-400">{riskStats.high}</p>
              </div>
              <div className="rounded-[2rem] border border-amber-500/10 bg-amber-500/5 p-6 lg:p-8 hover:bg-amber-500/10 transition-colors">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/60">Средние</p>
                <p className="mt-2 text-3xl font-black text-amber-400">{riskStats.medium}</p>
              </div>
              <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6 lg:p-8 hover:bg-white/[0.04] transition-colors">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Объём (стр.)</p>
                <p className="mt-2 text-3xl font-black text-white">{textStats.pages}</p>
              </div>
              <div className="col-span-2 md:col-span-1 rounded-[2rem] border border-white/5 bg-white/[0.02] p-6 lg:p-8 hover:bg-white/[0.04] transition-colors">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Слов</p>
                <p className="mt-2 text-3xl font-black text-white">{textStats.words}</p>
              </div>
            </section>"""
    content = content.replace(old_stats, new_stats)

    # 2. Main wrapper
    content = content.replace(
        '<div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_460px] 2xl:grid-cols-[minmax(0,1fr)_520px]">',
        '<div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_460px] 2xl:grid-cols-[minmax(0,1fr)_520px]">'
    )

    # 3. Editor wrappers
    content = content.replace(
        '<section className="relative flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.01]">',
        '<section className="relative flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.02] hover:bg-white/[0.03] transition-colors">'
    )
    content = content.replace(
        '<div className="border-b border-white/5 bg-white/[0.02] px-5 py-4">',
        '<div className="border-b border-white/5 px-6 lg:px-8 py-5">'
    )

    # 4. Search inputs and sections inside editor
    old_inputs = """                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(220px,280px)]">
                      <div className="relative">
                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel-500" />
                        <input
                          value={contractSearch}
                          onChange={(e) => setContractSearch(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') goToSearchMatch(e.shiftKey ? -1 : 0);
                          }}
                          placeholder="Поиск по тексту договора"
                          className="h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-steel-600 focus:border-white/20"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-2">
                        <button
                          onClick={() => goToSearchMatch(-1)}
                          disabled={!searchMatches.length}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-steel-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
                          title="Предыдущее совпадение"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="min-w-16 text-center text-xs text-steel-400">
                          {searchMatches.length ? `${searchMatchIndex + 1}/${searchMatches.length}` : '0/0'}
                        </span>
                        <button
                          onClick={() => goToSearchMatch(1)}
                          disabled={!searchMatches.length}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-steel-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
                          title="Следующее совпадение"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      <div className="relative">
                        <button
                          onClick={() => setShowSections(!showSections)}
                          className="flex h-10 w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white outline-none transition-colors hover:bg-white/10 focus:border-white/20"
                        >
                          <ListTree size={15} className="absolute left-3 text-steel-500" />"""
    
    new_inputs = """                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(220px,280px)]">
                      <div className="relative">
                        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input
                          value={contractSearch}
                          onChange={(e) => setContractSearch(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') goToSearchMatch(e.shiftKey ? -1 : 0);
                          }}
                          placeholder="Поиск по тексту договора"
                          className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-white/20"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-2">
                        <button
                          onClick={() => goToSearchMatch(-1)}
                          disabled={!searchMatches.length}
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
                          title="Предыдущее совпадение"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="min-w-16 text-center text-xs font-bold text-neutral-400">
                          {searchMatches.length ? `${searchMatchIndex + 1}/${searchMatches.length}` : '0/0'}
                        </span>
                        <button
                          onClick={() => goToSearchMatch(1)}
                          disabled={!searchMatches.length}
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
                          title="Следующее совпадение"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      <div className="relative">
                        <button
                          onClick={() => setShowSections(!showSections)}
                          className="flex h-12 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-white outline-none transition-colors hover:bg-white/10 focus:border-white/20"
                        >
                          <ListTree size={16} className="absolute left-4 text-neutral-500" />"""
    content = content.replace(old_inputs, new_inputs)

    # 5. Textarea classes
    old_textarea = """className={`custom-scrollbar min-h-0 flex-1 resize-none bg-transparent p-5 text-[15px] leading-7 text-steel-200 outline-none placeholder:text-steel-600 sm:p-7 ${"""
    new_textarea = """className={`custom-scrollbar min-h-0 flex-1 resize-none bg-transparent p-6 lg:p-8 text-[15px] leading-8 text-neutral-300 outline-none placeholder:text-neutral-600 ${"""
    content = content.replace(old_textarea, new_textarea)

    # 6. Sidebar wrapper
    content = content.replace(
        '<aside className="flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.01]">',
        '<aside className="flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.02] hover:bg-white/[0.03] transition-colors">'
    )

    # 7. Sidebar header
    old_side_header = """                  <div className="border-b border-white/5 bg-white/[0.02] p-4">
                    <div className="mb-4 flex items-start gap-3">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${riskStats.total ? 'bg-amber-500/10 text-amber-200' : 'bg-emerald-500/10 text-emerald-200'}`}>
                        {riskStats.total ? <AlertTriangle size={22} /> : <FileCheck2 size={22} />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{riskStats.total ? `Найдено ${riskStats.total} рисков` : 'Рисков не обнаружено'}</p>
                        <p className="mt-1 line-clamp-3 text-sm leading-5 text-steel-400">{summary || 'Анализ завершён.'}</p>
                      </div>
                    </div>

                    <div className="relative mb-3">
                      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel-500" />
                      <input
                        value={riskSearch}
                        onChange={(e) => setRiskSearch(e.target.value)}
                        placeholder="Поиск по рискам"
                        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-steel-600 focus:border-white/20"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {riskFilters.map((filter) => (
                        <button
                          key={filter.value}
                          onClick={() => setRiskFilter(filter.value)}
                          className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                            riskFilter === filter.value ? 'bg-white text-black' : 'bg-white/5 text-steel-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>"""
    
    new_side_header = """                  <div className="border-b border-white/5 p-6 lg:p-8">
                    <div className="mb-6 flex items-start gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.25rem] ${riskStats.total ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
                        {riskStats.total ? <AlertTriangle size={24} /> : <FileCheck2 size={24} />}
                      </div>
                      <div className="min-w-0 pt-1">
                        <p className="text-lg font-bold text-white">{riskStats.total ? `Найдено ${riskStats.total} рисков` : 'Рисков не обнаружено'}</p>
                        <p className="mt-1 line-clamp-3 text-sm leading-6 text-neutral-400">{summary || 'Анализ завершён.'}</p>
                      </div>
                    </div>

                    <div className="relative mb-4">
                      <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        value={riskSearch}
                        onChange={(e) => setRiskSearch(e.target.value)}
                        placeholder="Поиск по рискам"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-white/20"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {riskFilters.map((filter) => (
                        <button
                          key={filter.value}
                          onClick={() => setRiskFilter(filter.value)}
                          className={`rounded-2xl px-4 py-2.5 text-[10px] font-bold tracking-wide uppercase transition-colors ${
                            riskFilter === filter.value ? 'bg-white text-black' : 'bg-white/5 text-neutral-500 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>"""
    content = content.replace(old_side_header, new_side_header)

    # 8. Risks list inner
    old_risk_item = """                        <motion.article
                          key={`${risk.title}-${index}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`rounded-2xl border p-4 transition-colors ${
                            isActive ? `${meta.border} ${meta.bg}` : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                          }`}
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="flex min-w-0 gap-3">
                              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${meta.bg} ${meta.text}`}>
                                <Icon size={16} />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm font-semibold leading-5 text-white">{risk.title || 'Риск без названия'}</h3>
                                <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[11px] ${meta.border} ${meta.bg} ${meta.text}`}>
                                  {meta.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          <p className="mb-4 text-sm leading-6 text-steel-400">{risk.description}</p>

                          {contextSnippet && (
                            <button
                              onClick={() => handleFocusRisk(risk, index)}
                              className="mb-4 w-full rounded-xl border border-white/10 bg-black/35 p-3 text-left transition-colors hover:border-white/20 hover:bg-white/5"
                            >
                              <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-steel-400">
                                <Target size={13} />
                                Фрагмент в договоре
                              </span>
                              <span className="block border-l border-white/10 pl-3 text-xs leading-5 text-steel-300">{contextSnippet}</span>
                            </button>
                          )}

                          <div className="rounded-xl border border-white/10 bg-black/35 p-3">
                            <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-steel-400">
                              <Sparkles size={13} />
                              Рекомендация ИИ
                            </p>
                            <p className="text-sm leading-6 text-white">{risk.recommendation}</p>

                            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
                              {risk.url ? (
                                <a
                                  href={risk.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-steel-300 transition-colors hover:bg-white/10 hover:text-white"
                                >
                                  <LinkIcon size={13} />
                                  {risk.article || 'Норма'}
                                </a>
                              ) : (
                                <span className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-steel-500">{risk.article || 'Норма не указана'}</span>
                              )}

                              <button
                                onClick={() => handleCopyRecommendation(risk)}
                                className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-steel-300 transition-colors hover:bg-white/10 hover:text-white"
                              >
                                <Clipboard size={13} />
                                Копировать
                              </button>

                              {activeAuditId && (
                                <button
                                  disabled={fixingRiskIndex !== null || generating}
                                  onClick={() => handleQuickFix(risk, index)}
                                  className="ml-auto inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {fixingRiskIndex === index ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                  {fixingRiskIndex === index ? 'Исправляем' : 'Исправить'}
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.article>"""
    new_risk_item = """                        <motion.article
                          key={`${risk.title}-${index}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`rounded-3xl border p-5 lg:p-6 transition-all ${
                            isActive ? `${meta.border} bg-white/[0.05]` : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="mb-4 flex items-start justify-between gap-4">
                            <div className="flex min-w-0 gap-4">
                              <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] ${meta.bg} ${meta.text}`}>
                                <Icon size={20} />
                              </div>
                              <div className="min-w-0 pt-0.5">
                                <h3 className="text-base font-bold leading-6 text-white mb-2">{risk.title || 'Риск без названия'}</h3>
                                <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${meta.border} ${meta.bg} ${meta.text}`}>
                                  {meta.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          <p className="mb-5 text-sm leading-relaxed text-neutral-400">{risk.description}</p>

                          {contextSnippet && (
                            <button
                              onClick={() => handleFocusRisk(risk, index)}
                              className="mb-5 w-full rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-left transition-colors hover:border-white/10 hover:bg-white/5"
                            >
                              <span className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                                <Target size={14} />
                                Фрагмент в договоре
                              </span>
                              <span className="block border-l-2 border-white/10 pl-4 text-sm leading-6 text-neutral-300">{contextSnippet}</span>
                            </button>
                          )}

                          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 lg:p-5">
                            <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                              <Sparkles size={14} />
                              Рекомендация ИИ
                            </p>
                            <p className="text-sm leading-relaxed text-white">{risk.recommendation}</p>

                            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/5 pt-4">
                              {risk.url ? (
                                <a
                                  href={risk.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
                                >
                                  <LinkIcon size={14} />
                                  {risk.article || 'Норма'}
                                </a>
                              ) : (
                                <span className="rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-neutral-500">{risk.article || 'Норма не указана'}</span>
                              )}

                              <button
                                onClick={() => handleCopyRecommendation(risk)}
                                className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
                              >
                                <Clipboard size={14} />
                                Копировать
                              </button>

                              {activeAuditId && (
                                <button
                                  disabled={fixingRiskIndex !== null || generating}
                                  onClick={() => handleQuickFix(risk, index)}
                                  className="ml-auto inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {fixingRiskIndex === index ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                  {fixingRiskIndex === index ? 'Исправляем' : 'Исправить'}
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.article>"""
    content = content.replace(old_risk_item, new_risk_item)

    # 9. Final generate button
    old_generate = """                    <div className="border-t border-white/5 bg-black/50 p-4">
                      <button
                        disabled={generating}
                        onClick={handleGenerateFinal}
                        className="relative flex h-12 w-full items-center justify-center overflow-hidden rounded-2xl text-sm font-bold transition-colors bg-white text-black hover:bg-neutral-200"
                      >
                        {generating && (
                          <motion.span
                            className="absolute inset-y-0 left-0 bg-emerald-400/40"
                            initial={{ width: '0%' }}
                            animate={{ width: `${genProgress}%` }}
                            transition={{ duration: 0.25 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                          {generating ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Генерация {Math.round(genProgress)}%
                            </>
                          ) : (
                            <>
                              <Download size={16} />
                              Создать финальную DOCX
                            </>
                          )}
                        </span>
                      </button>
                    </div>"""
    new_generate = """                    <div className="border-t border-white/5 bg-white/[0.02] p-6 lg:p-8">
                      <button
                        disabled={generating}
                        onClick={handleGenerateFinal}
                        className="relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl text-sm font-bold transition-colors bg-white text-black hover:bg-neutral-200"
                      >
                        {generating && (
                          <motion.span
                            className="absolute inset-y-0 left-0 bg-neutral-300"
                            initial={{ width: '0%' }}
                            animate={{ width: `${genProgress}%` }}
                            transition={{ duration: 0.25 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                          {generating ? (
                            <>
                              <Loader2 size={18} className="animate-spin" />
                              Генерация {Math.round(genProgress)}%
                            </>
                          ) : (
                            <>
                              <Download size={18} />
                              Создать финальную DOCX
                            </>
                          )}
                        </span>
                      </button>
                    </div>"""
    content = content.replace(old_generate, new_generate)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print("DocumentWorkspace layout updated.")

if __name__ == '__main__':
    main()
