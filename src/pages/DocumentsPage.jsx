import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Download,
  FileSearch,
  FileText,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { docsApi } from '../services/api';

const docTypeOptions = [
  { value: 'contract', label: 'Договор', hint: 'Услуги, аренда, поставка, подряд' },
  { value: 'claim', label: 'Исковое заявление', hint: 'Для суда и досудебной подготовки' },
  { value: 'complaint', label: 'Жалоба / претензия', hint: 'Требование, претензия, обращение' },
  { value: 'statement', label: 'Заявление', hint: 'Официальное заявление в орган' },
];

const formatSize = (size = 0) => {
  if (!size) return '0 KB';
  if (size > 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
};

const normalizeDocName = (name = '') => name.replace(/_/g, ' ');

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

export default function DocumentsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [docs, setDocs] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [docType, setDocType] = useState('contract');
  const [docDesc, setDocDesc] = useState('');
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3600);
  }, []);

  const loadDocs = useCallback(async (q = '') => {
    try {
      const list = await docsApi.list({ q });
      setDocs(
        list.map((doc) => ({
          id: doc.id,
          name: doc.name || doc.original_filename || 'Документ',
          originalName: doc.original_filename || doc.name || 'document',
          type: doc.doc_type,
          date: doc.created_at?.split('T')[0] || '',
          size: formatSize(doc.file_size),
        })),
      );
    } catch (e) {
      console.error('Load docs error:', e);
      showToast(`Не удалось загрузить документы: ${e.message}`, 'error');
    }
  }, [showToast]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadDocs(searchQuery), 400);
    return () => window.clearTimeout(timer);
  }, [loadDocs, searchQuery]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const generateType = params.get('generate');
    const descParam = params.get('desc');

    if (generateType && docTypeOptions.some((item) => item.value === generateType)) {
      setDocType(generateType);
      setIsModalOpen(true);
      if (descParam) setDocDesc(decodeURIComponent(descParam));
    }
  }, []);

  const stats = useMemo(
    () => ({
      total: docs.length,
      generated: docs.filter((doc) => doc.type === 'generated').length,
      uploaded: docs.filter((doc) => doc.type !== 'generated').length,
    }),
    [docs],
  );

  const handleUpload = async (files) => {
    const fileList = Array.from(files || []);
    if (!fileList.length) return;

    const allowed = ['.pdf', '.docx', '.doc', '.txt'];
    const invalid = fileList.find((file) => !allowed.some((ext) => file.name.toLowerCase().endsWith(ext)));
    if (invalid) {
      showToast('Поддерживаются только PDF, DOCX, DOC и TXT', 'error');
      return;
    }

    const tooLarge = fileList.find((file) => file.size > 10 * 1024 * 1024);
    if (tooLarge) {
      showToast('Файл должен быть до 10 MB', 'error');
      return;
    }

    setUploading(true);
    try {
      for (const file of fileList) {
        await docsApi.upload(file);
      }
      await loadDocs(searchQuery);
      showToast(fileList.length > 1 ? 'Документы загружены' : 'Документ загружен');
    } catch (e) {
      console.error('Upload error:', e);
      showToast(`Ошибка загрузки: ${e.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    try {
      await docsApi.remove(docId);
      setDocs((prev) => prev.filter((doc) => doc.id !== docId));
      showToast('Документ удалён');
    } catch (e) {
      console.error('Delete error:', e);
      showToast(`Ошибка удаления: ${e.message}`, 'error');
    }
  };

  const handleGenerate = async () => {
    if (!docDesc.trim()) return;
    setGenerating(true);
    try {
      const created = await docsApi.generate(docType, docDesc);
      await loadDocs(searchQuery);
      setIsModalOpen(false);
      setDocDesc('');
      showToast('Документ создан');
      if (created?.id) navigate(`/dashboard/documents/${created.id}`);
    } catch (e) {
      console.error('Generate error:', e);
      showToast(`Ошибка генерации: ${e.message}`, 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white overflow-hidden p-6 lg:p-10 selection:bg-white/20 relative font-sans">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed left-1/2 top-5 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border px-5 py-3 text-sm shadow-2xl backdrop-blur-xl ${
              toast.type === 'error'
                ? 'border-red-500/30 bg-red-500/10 text-red-200'
                : 'border-white/10 bg-white/[0.05] text-white'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle size={18} /> : <FileText size={18} />}
            <span className="font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col h-full gap-8 max-w-6xl mx-auto w-full">
        
        {/* ── Header ── */}
        <motion.header variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 shrink-0">
          <div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-2">Документы</h1>
            <p className="text-white/40 text-sm max-w-xl">
              Анализируйте риски, загружайте файлы и создавайте новые версии документов с помощью AI.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск..."
                className="w-full h-12 bg-white/[0.02] border border-white/5 rounded-2xl pl-11 pr-4 text-sm text-white placeholder:text-white/30 focus:bg-white/[0.05] focus:border-white/20 outline-none transition-all"
              />
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="h-12 px-6 rounded-2xl bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Sparkles size={16} />
              AI создание
            </button>
          </div>
        </motion.header>

        {/* ── Stats ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4 shrink-0">
          <div className="p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 flex flex-col justify-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Всего</span>
            <span className="text-3xl font-black">{stats.total}</span>
          </div>
          <div className="p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 flex flex-col justify-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Загружено</span>
            <span className="text-3xl font-black">{stats.uploaded}</span>
          </div>
          <div className="p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 flex flex-col justify-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Создано ИИ</span>
            <span className="text-3xl font-black">{stats.generated}</span>
          </div>
        </motion.div>

        {/* ── Upload Zone ── */}
        <input type="file" multiple accept=".pdf,.doc,.docx,.txt" ref={fileInputRef} className="hidden" onChange={(e) => handleUpload(e.target.files)} />
        <motion.div
          variants={itemVariants}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); handleUpload(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          className={`shrink-0 cursor-pointer rounded-[2rem] border border-dashed transition-all p-6 flex items-center gap-5 ${
            dragActive ? 'border-white/30 bg-white/[0.05]' : 'border-white/10 bg-transparent hover:bg-white/[0.02]'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white shrink-0">
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={20} />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">{uploading ? 'Загрузка документов...' : 'Загрузить новый документ'}</p>
            <p className="text-[11px] text-white/40 mt-0.5">Перетащите файлы сюда или нажмите. Поддерживаются PDF, DOCX, TXT.</p>
          </div>
        </motion.div>

        {/* ── List Area ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative pr-2">
          <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-8">
            {docs.map((doc) => (
              <motion.div
                key={doc.id}
                variants={itemVariants}
                onClick={() => navigate(`/dashboard/documents/${doc.id}`)}
                className="group flex flex-col p-6 lg:p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="flex items-start gap-5 mb-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border ${doc.type === 'generated' ? 'bg-white text-black border-white' : 'bg-white/5 text-white border-white/10'}`}>
                    <FileText size={24} />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-white truncate" title={doc.name}>{normalizeDocName(doc.name)}</h3>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 shrink-0 inline-block mb-2">
                      {doc.type === 'generated' ? 'AI Сгенерировано' : 'Загруженный Файл'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-white/5">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1">Дата</span>
                      <span className="text-sm font-semibold text-white/80">{doc.date}</span>
                    </div>
                    <div className="w-px h-6 bg-white/5" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1">Размер</span>
                      <span className="text-sm font-semibold text-white/80">{doc.size}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/documents/${doc.id}`); }} className="h-10 px-4 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors">
                      Аудит
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); docsApi.download(doc.id); }} className="w-10 h-10 rounded-xl bg-white/[0.05] text-white hover:bg-white/[0.1] flex items-center justify-center transition-colors">
                      <Download size={16} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }} className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {docs.length === 0 && !uploading && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-4">
                  <FileText size={24} className="text-white/20" />
                </div>
                <h3 className="text-lg font-bold text-white/50 mb-1">Документов нет</h3>
                <p className="text-sm text-white/30">Загрузите свой первый договор или сгенерируйте новый с помощью AI.</p>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* ── Modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="relative w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#050505] p-8 shadow-2xl"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute right-6 top-6 text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>

              <div className="mb-8">
                <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center mb-4">
                  <Sparkles size={20} />
                </div>
                <h2 className="text-3xl font-black">Создать документ</h2>
                <p className="text-white/40 text-sm mt-2">Опишите ситуацию, и AI подготовит шаблон с учетом законов РК.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3 block">Тип документа</label>
                  <div className="grid grid-cols-2 gap-2">
                    {docTypeOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setDocType(opt.value)}
                        className={`text-left p-4 rounded-2xl border transition-all ${
                          docType === opt.value ? 'bg-white border-white text-black' : 'bg-transparent border-white/10 text-white hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="font-bold text-sm">{opt.label}</div>
                        <div className={`text-[10px] mt-1 ${docType === opt.value ? 'text-black/60' : 'text-white/30'}`}>{opt.hint}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3 block">Описание ситуации</label>
                  <textarea
                    value={docDesc}
                    onChange={(e) => setDocDesc(e.target.value)}
                    placeholder="Пример: договор оказания услуг между ТОО и ИП на 500 тыс. тг..."
                    className="w-full h-32 resize-none bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-white/30 focus:border-white/30 outline-none transition-colors"
                  />
                </div>

                <button
                  disabled={generating || !docDesc.trim()}
                  onClick={handleGenerate}
                  className="w-full h-14 rounded-2xl bg-white text-black font-bold flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                  {generating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  {generating ? 'Генерация...' : 'Сгенерировать'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
