const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Uploads a file straight from the browser to Cloudinary using a
 * short-lived signature from our backend (see backend/src/routes/upload.routes.js).
 * The binary never touches our own server.
 *
 * @param {File|Blob} file
 * @param {'image'|'video'} resourceType  'video' also covers audio-only blobs
 * @param {(percent: number) => void} [onProgress]
 * @returns {Promise<{ url: string, durationSeconds: number }>}
 */
export async function uploadMedia(file, resourceType, onProgress) {
  const sigRes = await fetch(`${API_URL}/api/upload/signature`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resourceType }),
  });
  if (!sigRes.ok) {
    const body = await sigRes.json().catch(() => ({}));
    throw new Error(body.error || 'Could not start the upload.');
  }
  const sig = await sigRes.json();

  // Client-side size/limit guard — the soft limits from the server,
  // checked before we spend any upload bandwidth.
  if (resourceType === 'image') {
    const maxBytes = sig.maxImageMB * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new Error(`Image is larger than the ${sig.maxImageMB}MB limit.`);
    }
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', sig.apiKey);
  formData.append('timestamp', sig.timestamp);
  formData.append('signature', sig.signature);
  formData.append('folder', sig.folder);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`;

  const result = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          reject(new Error(data.error?.message || 'Upload to Cloudinary failed.'));
        }
      } catch {
        reject(new Error('Unexpected response from Cloudinary.'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.send(formData);
  });

  return {
    url: result.secure_url,
    durationSeconds: result.duration || 0,
  };
}
