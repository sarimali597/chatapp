import { useRef, useState } from 'react';
import { Send, ImagePlus, X } from 'lucide-react';
import { useTyping } from '../../hooks/useTyping';
import { useNotifications } from '../../context/NotificationContext';
import { uploadImage } from '../../services/api';
import { validateImageFile, isValidMessageText } from '../../utils/validators';

export default function MessageInput({ scope, onSendText, onSendImage, disabled, disabledReason }) {
  const { notifyTyping, stopTyping } = useTyping(scope);
  const { notify } = useNotifications();
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null); // { file, url }
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  function handleChange(e) {
    setText(e.target.value);
    if (e.target.value.trim()) notifyTyping();
    else stopTyping();
  }

  function handleSend() {
    const trimmed = text.trim();
    if (!isValidMessageText(trimmed) || disabled) return;
    onSendText(trimmed);
    setText('');
    stopTyping();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      notify({ title: 'Image not supported', body: validationError, variant: 'error' });
      return;
    }

    setPreview({ file, url: URL.createObjectURL(file) });
  }

  async function handleConfirmUpload() {
    if (!preview) return;
    setUploading(true);
    try {
      const result = await uploadImage(preview.file);
      onSendImage(result.url);
    } catch (err) {
      notify({
        title: 'Upload failed',
        body: err?.response?.data?.error || 'Could not upload this image. Please try again.',
        variant: 'error',
      });
    } finally {
      setUploading(false);
      setPreview(null);
    }
  }

  return (
    <>
      {preview && (
        <div className="image-preview-bar">
          <img src={preview.url} alt="" className="image-preview-thumb" />
          <span className="image-preview-name">{preview.file.name}</span>
          <button className="btn btn-secondary btn-sm" onClick={handleConfirmUpload} disabled={uploading}>
            {uploading ? 'Sending…' : 'Send image'}
          </button>
          <button className="icon-btn" onClick={() => setPreview(null)} disabled={uploading} aria-label="Cancel image">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="composer">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/jpeg,image/jpg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        <button
          className="composer-icon-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-label="Attach image"
          title="Attach image"
        >
          <ImagePlus size={19} />
        </button>

        <div className="composer-input-wrap">
          <textarea
            className="composer-input"
            rows={1}
            placeholder={disabled ? disabledReason : 'Type a message…'}
            value={text}
            disabled={disabled}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={stopTyping}
          />
        </div>

        <button className="composer-send-btn" onClick={handleSend} disabled={disabled || !text.trim()} aria-label="Send message">
          <Send size={17} />
        </button>
      </div>
    </>
  );
}
