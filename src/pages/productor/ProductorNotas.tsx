import { useState } from "react";
import { FileText, Plus, Edit, Trash2, Calendar, Tag } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Local storage key for notes
const NOTES_STORAGE_KEY = 'productor_notes';

interface Note {
  id: string;
  title: string;
  content: string;
  category: 'produccion' | 'siniestros' | 'propuestas' | 'operativo';
  created_at: string;
  updated_at: string;
}

const categoryLabels: Record<string, { label: string; color: string }> = {
  produccion: { label: 'Producción', color: 'bg-blue-100 text-blue-700' },
  siniestros: { label: 'Siniestros', color: 'bg-yellow-100 text-yellow-700' },
  propuestas: { label: 'Propuestas', color: 'bg-purple-100 text-purple-700' },
  operativo: { label: 'Operativo', color: 'bg-green-100 text-green-700' },
};

const ProductorNotas = () => {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem(NOTES_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'produccion' as Note['category']
  });

  const saveNotes = (newNotes: Note[]) => {
    setNotes(newNotes);
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(newNotes));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error("El título es requerido");
      return;
    }

    const now = new Date().toISOString();

    if (editingNote) {
      // Update existing note
      const updated = notes.map(n => 
        n.id === editingNote.id 
          ? { ...n, ...formData, updated_at: now }
          : n
      );
      saveNotes(updated);
      toast.success("Nota actualizada");
    } else {
      // Create new note
      const newNote: Note = {
        id: crypto.randomUUID(),
        ...formData,
        created_at: now,
        updated_at: now
      };
      saveNotes([newNote, ...notes]);
      toast.success("Nota creada");
    }

    closeModal();
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta nota?')) {
      saveNotes(notes.filter(n => n.id !== id));
      toast.success("Nota eliminada");
    }
  };

  const openEditModal = (note: Note) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      content: note.content,
      category: note.category
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingNote(null);
    setFormData({ title: '', content: '', category: 'produccion' });
  };

  const filteredNotes = filter === 'all' 
    ? notes 
    : notes.filter(n => n.category === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notas de Gestión</h1>
          <p className="text-muted-foreground">Tus notas internas y recordatorios</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="flex items-center gap-2">
          <Plus size={18} /> Nueva Nota
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('all')}
        >
          Todas
        </Button>
        {Object.entries(categoryLabels).map(([key, { label }]) => (
          <Button 
            key={key}
            variant={filter === key ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="bg-card rounded-2xl shadow-soft p-12 text-center">
          <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">Sin notas</p>
          <p className="text-muted-foreground mb-4">Creá tu primera nota de gestión</p>
          <Button onClick={() => setShowModal(true)}>
            <Plus size={18} className="mr-2" /> Nueva Nota
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <div key={note.id} className="bg-card rounded-xl shadow-soft p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryLabels[note.category].color}`}>
                  {categoryLabels[note.category].label}
                </span>
                <div className="flex gap-1">
                  <button 
                    onClick={() => openEditModal(note)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                  >
                    <Edit size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(note.id)}
                    className="p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              
              <h3 className="font-semibold text-foreground mb-2">{note.title}</h3>
              <p className="text-sm text-muted-foreground flex-1 line-clamp-3">{note.content}</p>
              
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                <Calendar size={12} />
                {format(new Date(note.updated_at), "d 'de' MMM, yyyy", { locale: es })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={closeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Editar Nota' : 'Nueva Nota'}</DialogTitle>
            <DialogDescription>
              Las notas son privadas y solo vos podés verlas
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título de la nota"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value: Note['category']) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Contenido</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Escribí tu nota..."
                rows={5}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                {editingNote ? 'Guardar Cambios' : 'Crear Nota'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductorNotas;
