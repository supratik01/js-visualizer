import { useState, useEffect } from 'react';
import { useRuntimeStore, type CustomExample } from '@/lib/runtimeStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GripVertical,
  Edit2,
  Trash2,
  Plus,
  Check,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface EditForm {
  title: string;
  description: string;
  category: string;
  code: string;
}

const newExampleId = () => `ex-${Math.random().toString(36).substr(2, 9)}`;

export function ExamplesControlPanel() {
  const {
    customExamples,
    customCategoryLabels,
    updateCustomExample,
    addCustomExample,
    deleteCustomExample,
    updateCustomCategoryLabel,
  } = useRuntimeStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm>({ title: '', description: '', category: '', code: '' });
  const [isDirty, setIsDirty] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);

  // All categories: from label map + any used in examples
  const exampleCategories = [...new Set(customExamples.map(e => e.category))];
  const allCategories = [...new Set([...Object.keys(customCategoryLabels), ...exampleCategories])];

  const selectedExample = customExamples.find(e => e.id === selectedId);

  useEffect(() => {
    if (selectedExample) {
      setForm({
        title: selectedExample.title,
        description: selectedExample.description,
        category: selectedExample.category,
        code: selectedExample.code,
      });
      setIsDirty(false);
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setField = (field: keyof EditForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!selectedId) return;
    updateCustomExample(selectedId, form);
    setIsDirty(false);
  };

  const handleDiscard = () => {
    if (!selectedExample) return;
    setForm({
      title: selectedExample.title,
      description: selectedExample.description,
      category: selectedExample.category,
      code: selectedExample.code,
    });
    setIsDirty(false);
  };

  const handleAdd = (category: string) => {
    const id = newExampleId();
    addCustomExample({
      id,
      title: 'New Example',
      description: 'Add a description',
      code: '// Write your JavaScript here\nconsole.log("Hello, World!");',
      category,
      visible: true,
    });
    setSelectedId(id);
  };

  const handleDelete = (id: string) => {
    if (selectedId === id) setSelectedId(null);
    deleteCustomExample(id);
  };

  const startEditCat = (key: string) => {
    setEditingCategoryKey(key);
    setEditingCategoryValue(customCategoryLabels[key] || key);
  };

  const commitEditCat = () => {
    if (editingCategoryKey && editingCategoryValue.trim()) {
      updateCustomCategoryLabel(editingCategoryKey, editingCategoryValue.trim());
    }
    setEditingCategoryKey(null);
  };

  const toggleCollapse = (cat: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverCategory(null);
  };

  const handleDragOver = (e: React.DragEvent, cat: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCategory(cat);
  };

  const handleDrop = (e: React.DragEvent, targetCat: string) => {
    e.preventDefault();
    if (draggedId) updateCustomExample(draggedId, { category: targetCat });
    setDraggedId(null);
    setDragOverCategory(null);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const key = newCategoryName.trim().toLowerCase().replace(/\s+/g, '-');
    updateCustomCategoryLabel(key, newCategoryName.trim());
    handleAdd(key);
    setNewCategoryName('');
    setShowNewCategory(false);
  };

  return (
    <div className="flex h-[520px] min-h-0">
      {/* ── Left: category + example list ── */}
      <div className="w-72 flex-shrink-0 border-r border-zinc-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700 flex-shrink-0">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Examples ({customExamples.length})
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-zinc-400 hover:text-emerald-400"
            onClick={() => setShowNewCategory(!showNewCategory)}
            title="Add new category"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* New category input */}
        {showNewCategory && (
          <div className="flex gap-1 px-2 py-1.5 border-b border-zinc-700 flex-shrink-0">
            <Input
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddCategory();
                if (e.key === 'Escape') setShowNewCategory(false);
              }}
              placeholder="Category name…"
              className="h-6 text-xs bg-zinc-800 border-zinc-600 text-white"
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-emerald-400 hover:text-emerald-300"
              onClick={handleAddCategory}
            >
              <Check className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-300"
              onClick={() => setShowNewCategory(false)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1">
          {exampleCategories.map(cat => {
            const catExamples = customExamples.filter(e => e.category === cat);
            const isCollapsed = collapsed.has(cat);
            const isDragOver = dragOverCategory === cat;

            return (
              <div key={cat}>
                {/* Category header */}
                <div
                  className={`flex items-center gap-1 px-2 py-1.5 border-b border-zinc-700/50 group sticky top-0 z-10 transition-colors ${
                    isDragOver
                      ? 'bg-blue-500/20 border-blue-500/30'
                      : 'bg-zinc-800/90'
                  }`}
                  onDragOver={e => handleDragOver(e, cat)}
                  onDragLeave={() => setDragOverCategory(null)}
                  onDrop={e => handleDrop(e, cat)}
                >
                  <button
                    className="text-zinc-500 hover:text-zinc-300 flex-shrink-0 p-0.5"
                    onClick={() => toggleCollapse(cat)}
                  >
                    {isCollapsed
                      ? <ChevronRight className="w-3 h-3" />
                      : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {editingCategoryKey === cat ? (
                    <Input
                      value={editingCategoryValue}
                      onChange={e => setEditingCategoryValue(e.target.value)}
                      onBlur={commitEditCat}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitEditCat();
                        if (e.key === 'Escape') setEditingCategoryKey(null);
                      }}
                      className="h-5 text-xs bg-zinc-700 border-zinc-500 text-white flex-1 px-1"
                      autoFocus
                    />
                  ) : (
                    <span
                      className="text-[11px] font-semibold text-zinc-300 flex-1 truncate cursor-default"
                      onDoubleClick={() => startEditCat(cat)}
                      title="Double-click to rename"
                    >
                      {customCategoryLabels[cat] || cat}
                    </span>
                  )}

                  <span className="text-[10px] text-zinc-600 flex-shrink-0 mr-1">
                    {catExamples.length}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-emerald-400 flex-shrink-0"
                    onClick={() => handleAdd(cat)}
                    title="Add example to this category"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>

                {/* Examples */}
                {!isCollapsed && catExamples.map(ex => (
                  <div
                    key={ex.id}
                    draggable
                    onDragStart={e => handleDragStart(e, ex.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedId(ex.id)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer border-b border-zinc-800/40 group/ex transition-colors ${
                      selectedId === ex.id
                        ? 'bg-zinc-700'
                        : 'hover:bg-zinc-800/70'
                    } ${draggedId === ex.id ? 'opacity-40' : ''}`}
                  >
                    <GripVertical className="w-3 h-3 text-zinc-600 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                    <Switch
                      checked={ex.visible}
                      onCheckedChange={v => updateCustomExample(ex.id, { visible: v })}
                      className="scale-[0.65] flex-shrink-0 origin-left"
                      onClick={e => e.stopPropagation()}
                    />
                    <span
                      className={`text-xs flex-1 truncate ${
                        ex.visible ? 'text-zinc-200' : 'text-zinc-500 line-through'
                      }`}
                    >
                      {ex.title}
                    </span>
                    <button
                      className="opacity-0 group-hover/ex:opacity-100 text-zinc-600 hover:text-red-400 flex-shrink-0 p-0.5 transition-colors"
                      onClick={e => { e.stopPropagation(); handleDelete(ex.id); }}
                      title="Delete example"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </ScrollArea>
      </div>

      {/* ── Right: edit form ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedExample ? (
          <div className="flex flex-col h-full p-4 gap-3 overflow-auto">
            {/* Toolbar */}
            <div className="flex items-center justify-between flex-shrink-0">
              <h3 className="text-sm font-semibold text-white truncate mr-2">
                {form.title || 'Untitled'}
              </h3>
              <div className="flex gap-2 flex-shrink-0">
                {isDirty && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
                    onClick={handleDiscard}
                  >
                    Discard
                  </Button>
                )}
                <Button
                  size="sm"
                  className={`h-7 text-xs ${
                    isDirty
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-zinc-700 text-zinc-500'
                  }`}
                  onClick={handleSave}
                  disabled={!isDirty}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Save
                </Button>
              </div>
            </div>

            {/* Title + Category row */}
            <div className="grid grid-cols-2 gap-3 flex-shrink-0">
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-400">Title</Label>
                <Input
                  value={form.title}
                  onChange={e => setField('title', e.target.value)}
                  className="h-7 text-xs bg-zinc-800 border-zinc-600 text-white focus:border-zinc-400"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-400">Category</Label>
                <Select value={form.category} onValueChange={v => setField('category', v)}>
                  <SelectTrigger className="h-7 text-xs bg-zinc-800 border-zinc-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 max-h-48 overflow-y-auto">
                    {allCategories.map(c => (
                      <SelectItem key={c} value={c} className="text-xs text-zinc-200">
                        {customCategoryLabels[c] || c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1 flex-shrink-0">
              <Label className="text-[11px] text-zinc-400">Description</Label>
              <Input
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                className="h-7 text-xs bg-zinc-800 border-zinc-600 text-white focus:border-zinc-400"
              />
            </div>

            {/* Code */}
            <div className="flex flex-col flex-1 space-y-1 min-h-0">
              <Label className="text-[11px] text-zinc-400 flex-shrink-0">Code</Label>
              <Textarea
                value={form.code}
                onChange={e => setField('code', e.target.value)}
                className="flex-1 font-mono text-xs bg-zinc-800 border-zinc-600 text-zinc-100 resize-none focus:border-zinc-400 leading-relaxed"
                spellCheck={false}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-3">
            <Edit2 className="w-10 h-10 text-zinc-700" />
            <p className="text-sm text-zinc-400">Select an example to edit</p>
            <p className="text-xs text-zinc-600">Double-click a category name to rename it</p>
            <p className="text-xs text-zinc-600">
              Drag examples between categories using the grip handle
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
