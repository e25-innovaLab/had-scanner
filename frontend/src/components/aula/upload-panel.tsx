'use client';

import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { FileUp, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const DEMO_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];
const PDF_ONLY_EXTENSIONS = ['.pdf'];
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

type Mode = 'archivo' | 'texto';

export type UploadSelection = {
  file: File | null;
  text: string;
  mode: Mode;
};

export function UploadPanel({
  onSelectionChange,
  pdfOnly = false,
}: {
  onSelectionChange?: (selection: UploadSelection) => void;
  /** Camino API real: solo PDF, sin pestaña “Pegar texto”. */
  pdfOnly?: boolean;
} = {}) {
  const acceptExtensions = pdfOnly ? PDF_ONLY_EXTENSIONS : DEMO_EXTENSIONS;
  const acceptString = acceptExtensions.join(',');
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0); // Previene el parpadeo en dragLeave al pasar por elementos hijos

  const [mode, setMode] = useState<Mode>('archivo');
  const [dragging, setDragging] = useState(false);
  const [pastedText, setPastedText] = useState('');

  // Guardamos el objeto File completo
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [rejectedFile, setRejectedFile] = useState<{
    name: string;
    size: number;
  } | null>(null);

  const effectiveMode: Mode = pdfOnly ? 'archivo' : mode;

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
    const isValidExtension = acceptExtensions.includes(fileExtension);

    if (!isValidExtension) {
      setRejectedFile({ name: file.name, size: file.size });
      setFileError(
        pdfOnly
          ? `No se pudo cargar «${file.name}». En API real solo se acepta PDF.`
          : `No se pudo cargar «${file.name}». El formato no es compatible (PDF, Word o PowerPoint). Probá otro archivo o pegá el texto en la pestaña «Pegar texto».`
      );
      setSelectedFile(null);
      notify({ file: null });
      return;
    }

    if (file.size > MAX_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(0);
      setRejectedFile({ name: file.name, size: file.size });
      setFileError(
        pdfOnly
          ? `No se pudo cargar «${file.name}». El archivo pesa ${mb} MB y el máximo permitido es 50 MB. Probá comprimir o dividir el PDF.`
          : `No se pudo cargar «${file.name}». El archivo pesa ${mb} MB y el máximo permitido es 50 MB. Probá comprimir el PDF, dividirlo en partes o pegar el texto en la pestaña «Pegar texto».`
      );
      setSelectedFile(null);
      notify({ file: null });
      return;
    }

    setFileError(null);
    setRejectedFile(null);
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
    setRejectedFile(null);
    notify({ file: null });
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  }

  function changeMode(next: Mode) {
    if (pdfOnly && next === 'texto') return;
    setMode(next);
    notify({ mode: next });
  }

  return (
    <div className="space-y-4">
      {!pdfOnly ? (
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Forma de carga"
        >
          <Button
            type="button"
            role="tab"
            aria-selected={effectiveMode === 'archivo'}
            variant="ghost"
            className={cn(
              'h-9 rounded-xl px-4',
              effectiveMode === 'archivo'
                ? 'bg-ink text-sidebar-primary-foreground hover:bg-ink/90 hover:text-sidebar-primary-foreground'
                : 'bg-card text-muted-foreground ring-1 ring-border'
            )}
            onClick={() => changeMode('archivo')}
          >
            Subir archivo
          </Button>
          <Button
            type="button"
            role="tab"
            aria-selected={effectiveMode === 'texto'}
            variant="ghost"
            className={cn(
              'h-9 rounded-xl px-4',
              effectiveMode === 'texto'
                ? 'bg-ink text-sidebar-primary-foreground hover:bg-ink/90 hover:text-sidebar-primary-foreground'
                : 'bg-card text-muted-foreground ring-1 ring-border'
            )}
            onClick={() => changeMode('texto')}
          >
            Pegar texto
          </Button>
        </div>
      ) : null}

      {effectiveMode === 'archivo' ? (
        <div className="space-y-3">
          <Card
            className={cn(
              'relative flex flex-col items-center justify-center border border-dashed bg-white py-12 text-center transition-colors ring-0',
              dragging ? 'border-primary bg-primary/5' : 'border-border',
              fileError && 'border-destructive/50'
            )}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <CardContent className="flex flex-col items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-primary/25 text-foreground">
                <FileUp className="size-5" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <p className="font-medium">
                  {selectedFile
                    ? selectedFile.name
                    : pdfOnly
                      ? 'Arrastrá tu PDF aquí'
                      : 'Arrastra tu archivo aquí'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {pdfOnly
                    ? 'Solo PDF — máx. 50 MB'
                    : 'PDF, Word, PowerPoint — máx. 50 MB'}
                </p>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept={acceptString}
                aria-label={pdfOnly ? 'Seleccionar PDF' : 'Seleccionar archivo'}
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
                  {selectedFile
                    ? pdfOnly
                      ? 'Cambiar PDF'
                      : 'Cambiar archivo'
                    : pdfOnly
                      ? 'Seleccionar PDF'
                      : 'Seleccionar archivo'}
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

          {rejectedFile ? (
            <Card className="flex-row items-center justify-between gap-3 px-(--card-spacing) py-3 shadow-sm ring-1 ring-border/70">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="size-9 shrink-0 rounded-lg bg-secondary"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {rejectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {rejectedFile.name.split('.').pop()?.toUpperCase()} ·{' '}
                    {formatSize(rejectedFile.size)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-medium text-danger-foreground">
                  ✕ No se pudo cargar
                </span>
                <button
                  type="button"
                  className="rounded-md px-1 text-sm font-medium text-foreground underline-offset-2 transition-opacity hover:underline active:opacity-70"
                  onClick={resetFileSelection}
                >
                  Quitar
                </button>
              </div>
            </Card>
          ) : null}

          {fileError ? (
            <Card className="border-danger-foreground/20 bg-danger-soft text-danger-foreground shadow-none">
              <CardHeader className="gap-3 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 size-5 shrink-0" />
                  <div className="space-y-2">
                    <CardTitle className="text-sm font-semibold">
                      {rejectedFile
                        ? `No se pudo cargar «${rejectedFile.name}»`
                        : 'No se pudo cargar el archivo'}
                    </CardTitle>
                    <p className="text-sm leading-6 text-danger-foreground/90">
                      {fileError}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-xl bg-card px-3"
                      onClick={() => inputRef.current?.click()}
                    >
                      Elegir otro archivo
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ) : null}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Texto del material</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-1.5 text-sm font-medium">
              Nombre del material
              <Input
                placeholder="CARPINTERIA I — Tecnología de los materiales"
                name="titulo"
              />
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
