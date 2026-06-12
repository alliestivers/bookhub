const API_URL = import.meta.env.VITE_API_URL || '';

export async function formatManuscript(formData) {
  const response = await fetch(`${API_URL}/format`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Formatting failed');
  }

  return response.json();
}
