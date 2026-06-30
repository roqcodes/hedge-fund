/** Client-side Cloudinary unsigned upload config (NEXT_PUBLIC_*). */
export function getCloudinaryUploadConfig() {
  const rawCloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const rawPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

  // Preset name only — ignore accidental trailing tokens (e.g. pasted filenames).
  const uploadPreset = (rawPreset?.split(/\s+/)[0] || 'meal_payments').trim();
  const cloudName = (rawCloud || 'finite-x-reality').trim();

  return { cloudName, uploadPreset };
}

export async function uploadImageToCloudinary(file: File): Promise<{
  secureUrl: string;
  deleteToken?: string;
}> {
  const { cloudName, uploadPreset } = getCloudinaryUploadConfig();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.error?.message === 'string'
        ? data.error.message
        : 'Upload failed';
    throw new Error(message);
  }

  if (!data.secure_url) {
    throw new Error('Upload succeeded but no image URL was returned');
  }

  return {
    secureUrl: data.secure_url as string,
    deleteToken: data.delete_token as string | undefined,
  };
}

export async function deleteCloudinaryImageByToken(deleteToken: string): Promise<void> {
  const { cloudName } = getCloudinaryUploadConfig();
  const formData = new FormData();
  formData.append('token', deleteToken);
  await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/delete_by_token`, {
    method: 'POST',
    body: formData,
  });
}
