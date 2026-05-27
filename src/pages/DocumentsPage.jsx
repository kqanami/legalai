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
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 110, damping: 18 } },
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
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            className={`fixed left-1/2 top-5 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border px-5 py-3 text-sm shadow-2xl backdrop-blur-xl ${
              toast.type === 'error'
                ? 'border-red-500/30 bg-red-500/10 text-red-200'
                : 'border-white/10 bg-neutral-900/90 text-white'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle size={18} /> : <FileText size={18} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
        <motion.header variants={itemVariants} className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-steel-300">
              <FileSearch size={14} />
              Документы и аудит
            </div>
            <h1 className="text-3xl font-bold text-white md:text-4xl">Документы</h1>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              Загружайте договоры, запускайте аудит рисков, редактируйте текст и создавайте финальные версии в одном workflow.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative min-w-0 flex-1 lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-neutral-500 focus:border-white/20"
                placeholder="Поиск документа"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-black transition-colors hover:bg-neutral-200"
            >
              <Sparkles size={17} />
              AI создание
            </button>
          </div>
        </motion.header>

        <motion.section variants={itemVariants} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs text-steel-500">Всего</p>
            <p className="mt-1 text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs text-steel-500">Загружено</p>
            <p className="mt-1 text-2xl font-bold text-white">{stats.uploaded}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs text-steel-500">Создано ИИ</p>
            <p className="mt-1 text-2xl font-bold text-white">{stats.generated}</p>
          </div>
        </motion.section>

        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt"
          ref={fileInputRef}
          className="hidden"
          onChange={(event) => handleUpload(event.target.files)}
        />

        <motion.section
          variants={itemVariants}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            handleUpload(event.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative cursor-pointer overflow-hidden rounded-3xl border border-dashed p-7 text-center transition-colors ${
            dragActive ? 'border-white/40 bg-white/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
          }`}
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/40 transition-transform group-hover:scale-105">
            {uploading ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <UploadCloud size={25} className="text-steel-300" />}
          </div>
          <p className="font-semibold text-white">{uploading ? 'Загрузка документов...' : 'Перетащите файлы сюда или нажмите для выбора'}</p>
          <p className="mt-2 text-xs text-neutral-500">PDF, DOCX, DOC, TXT до 10 MB. После загрузки можно открыть аудит договора.</p>
        </motion.section>

        <motion.section variants={containerVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {docs.map((doc) => (
            <motion.article
              key={doc.id}
              variants={itemVariants}
              onClick={() => navigate(`/dashboard/documents/${doc.id}`)}
              className="group relative flex min-h-[230px] cursor-pointer flex-col rounded-3xl border border-white/10 bg-neutral-950 p-5 transition-colors hover:border-white/20 hover:bg-neutral-900"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${doc.type === 'generated' ? 'bg-white text-black' : 'bg-white/5 text-white'}`}>
                  <FileText size={22} />
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-steel-300">
                  {doc.type === 'generated' ? 'AI документ' : 'Загружен'}
                </span>
              </div>

              <h3 className="mb-3 line-clamp-2 pr-2 text-base font-semibold leading-6 text-white" title={doc.name}>
                {normalizeDocName(doc.name)}
              </h3>
              <p className="line-clamp-1 text-xs text-steel-500">{doc.originalName}</p>

              <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-4 text-xs text-neutral-500">
                <span>{doc.date}</span>
                <span>{doc.size}</span>
              </div>

              <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/dashboard/documents/${doc.id}`);
                  }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white text-xs font-bold text-black transition-colors hover:bg-neutral-200"
                >
                  <FileSearch size={14} />
                  Открыть аудит
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    docsApi.download(doc.id);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-steel-300 transition-colors hover:bg-white/10 hover:text-white"
                  title="Скачать"
                >
                  <Download size={15} />
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(doc.id);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-steel-300 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-200"
                  title="Удалить"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </motion.article>
          ))}

          {docs.length === 0 && !uploading && (
            <div className="col-span-full rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center">
              <FileText className="mx-auto mb-4 text-neutral-600" size={34} />
              <p className="font-semibold text-white">Документов пока нет</p>
              <p className="mt-2 text-sm text-neutral-500">Загрузите договор или создайте документ через ИИ.</p>
            </div>
          )}
        </motion.section>
      </motion.div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-neutral-950 p-6 shadow-2xl"
              initial={{ scale: 0.96, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 18 }}
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 rounded-xl p-2 text-neutral-500 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X size={20} />
              </button>

              <div className="mb-6 pr-10">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black">
                  <Plus size={22} />
                </div>
                <h2 className="text-2xl font-bold text-white">Создать документ</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-400">Опишите ситуацию, стороны, суммы, сроки и нужные условия.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-neutral-400">Тип документа</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {docTypeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setDocType(option.value)}
                        className={`rounded-2xl border p-3 text-left transition-colors ${
                          docType === option.value
                            ? 'border-white/30 bg-white text-black'
                            : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                        }`}
                      >
                        <span className="block text-sm font-bold">{option.label}</span>
                        <span className={`mt-1 block text-xs ${docType === option.value ? 'text-neutral-600' : 'text-neutral-500'}`}>{option.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-neutral-400">Описание ситуации</label>
                  <textarea
                    value={docDesc}
                    onChange={(event) => setDocDesc(event.target.value)}
                    placeholder="Например: договор оказания услуг между ТОО и ИП на сумму 500 000 тенге, предоплата 50%, срок 30 дней, нужна ответственность за просрочку..."
                    className="h-36 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-white/20"
                  />
                </div>

                <button
                  disabled={generating || !docDesc.trim()}
                  onClick={handleGenerate}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  {generating ? 'Генерируем...' : 'Сгенерировать и открыть'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
