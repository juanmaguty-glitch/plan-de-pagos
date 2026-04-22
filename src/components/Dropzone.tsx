import React, { useCallback, useRef, useState } from 'react';

interface DropzoneProps {
  onFileDrop: (files: File[]) => void;
  onError?: (message: string) => void;
  loading: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFileDrop, onError, loading }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const processPdfFiles = useCallback((fileList: FileList) => {
    const files = Array.from(fileList).filter(f => f.type === 'application/pdf');
    if (files.length > 0) {
      onFileDrop(files);
    } else {
      onError?.('Por favor, subí solo archivos PDF.');
    }
  }, [onFileDrop, onError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processPdfFiles(e.dataTransfer.files);
    }
  }, [processPdfFiles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processPdfFiles(e.target.files);
    }
    // Fix #9: Resetear el input para permitir resubir el mismo archivo
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div 
      className={`dropzone ${isDragActive ? 'active' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input 
        type="file" 
        id="fileUpload"
        ref={inputRef}
        multiple 
        accept="application/pdf" 
        style={{ display: 'none' }} 
        onChange={handleChange}
      />
      <div className="dropzone-icon">📄</div>
      {loading ? (
        <p>Procesando PDF(s)...</p>
      ) : (
        <>
          <p className="font-bold">Arrastra y suelta tus PDF de AFIP aquí</p>
          <p className="text-muted text-sm mt-4">o haz clic para seleccionar archivos</p>
        </>
      )}
    </div>
  );
};
