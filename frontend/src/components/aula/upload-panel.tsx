'use client';

import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { FileUp, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const ACCEPT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];
const ACCEPT_STRING = ACCEPT_EXTENSIONS.join(',');
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

type Mode = 'archivo' | 'texto';

export type UploadSelection = {
  file: File | null;
  text: string;
  mode: Mode;
};

export function UploadPanel({
  onSelectionChange,
}: {
  onSelectionChange?: (selection: UploadSelection) => void;
} = {}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0); // Previene el parpadeo en dragLeave al pasar por elementos hijos

  const [mode, setMode] = useState<Mode>('archivo');
  const [dragging, setDragging] = useState(false);
  const [pastedText, setPastedText] = useState('');

  // Guardamos el objeto File completo
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  function notify(
    next: Partial<UploadSelection> & {
      file?: File | null;
      text?: string;
      mode?: Mode;
    }
  ) {
    onSelectionChange?.({
      file: next.file !== undefined ? next.file : selectedFile,
      text: next.text !== undefined ? next.text : pastedText,
      mode: next.mode !== undefined ? next.mode : mode,
    });
  }

  function validateAndSetFile(file: File | undefined) {
    if (!file) return;

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidExtension = ACCEPT_EXTENSIONS.includes(fileExtension);

    if (!isValidExtension) {
      setFileError(
        'El formato del archivo no es compatible (PDF, Word o PowerPoint).'
      );
      setSelectedFile(null);
      notify({ file: null });
      return;
    }

    if (file.size > MAX_BYTES) {
      setFileError('El archivo supera el tamaño máximo permitido de 50 MB.');
      setSelectedFile(null);
      notify({ file: null });
      return;
    }

    setFileError(null);
    setSelectedFile(file);
    notify({ file });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    validateAndSetFile(file);
  }

  // --- Drag & Drop Handlers optimizados con contador ---
  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current += 1;
    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
      setDragging(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setDragging(false);
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    dragCounter.current = 0;

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      validateAndSetFile(event.dataTransfer.files[0]);
      event.dataTransfer.clearData();
    }
  }

  function resetFileSelection() {
    setSelectedFile(null);
    setFileError(null);
    notify({ file: null });
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  function changeMode(next: Mode) {
    setMode(next);
    notify({ mode: next });
  }

  return (
    <div className="space-y-4">
      {/* Selector de modo */}
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Forma de carga"
      >
        <Button
          type="button"
          role="tab"
          aria-selected={mode === 'archivo'}
          variant="ghost"
          className={cn(
            'h-8 rounded-full px-3',
            mode === 'archivo' ? 'bg-info text-info-foreground' : 'bg-secondary'
          )}
          onClick={() => changeMode('archivo')}
        >
          Subir archivo
        </Button>
        <Button
          type="button"
          role="tab"
          aria-selected={mode === 'texto'}
          variant="ghost"
          className={cn(
            'h-8 rounded-full px-3',
            mode === 'texto' ? 'bg-info text-info-foreground' : 'bg-secondary'
          )}
          onClick={() => changeMode('texto')}
        >
          Pegar texto
        </Button>
      </div>

      {mode === 'archivo' ? (
        <div className="space-y-3">
          <Card
            className={cn(
              'relative flex flex-col items-center justify-center border border-dashed bg-white py-12 text-center transition-colors ring-0',
              dragging ? 'border-primary bg-primary/5' : 'border-[#ddd4c6]',
              fileError && 'border-destructive/50'
            )}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <CardContent className="flex flex-col items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-secondary text-muted-foreground">
                <FileUp className="size-5" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <p className="font-medium">
                  {selectedFile
                    ? selectedFile.name
                    : 'Arrastra tu archivo aquí'}
                </p>
                <p className="text-sm text-muted-foreground">
                  PDF, Word, PowerPoint — máx. 50 MB
                </p>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT_STRING}
                aria-label="Seleccionar archivo"
                className="sr-only"
                onChange={handleFileChange}
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 px-4"
                  onClick={() => inputRef.current?.click()}
                >
                  {selectedFile ? 'Cambiar archivo' : 'Seleccionar archivo'}
                </Button>

                {selectedFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-10 text-muted-foreground hover:text-foreground"
                    onClick={resetFileSelection}
                    title="Quitar archivo"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Banner de error condicional */}
          {fileError && (
            <Card className="bg-destructive/10 text-destructive border-destructive/20">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0 p-4">
                <AlertCircle className="size-5 shrink-0 text-destructive" />
                <div className="space-y-1">
                  <CardTitle className="text-sm font-semibold">
                    No se pudo cargar el archivo
                  </CardTitle>
                  <p className="text-xs leading-5 text-destructive/90">
                    {fileError}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 px-2 text-xs"
                  onClick={() => setFileError(null)}
                >
                  Descartar
                </Button>
              </CardHeader>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Texto del material</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-1.5 text-sm font-medium">
              Nombre del material
              <Input placeholder="Unidad 3 — Biología" name="titulo" />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              Contenido
              <textarea
                name="contenido"
                rows={8}
                value={pastedText}
                onChange={(event) => {
                  const value = event.target.value;
                  setPastedText(value);
                  notify({ text: value });
                }}
                placeholder="Pegá aquí el texto del material educativo."
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </label>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
