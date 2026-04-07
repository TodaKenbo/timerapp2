// ============================================
// Google Books API
// ============================================

const API_BASE = 'https://www.googleapis.com/books/v1/volumes';

export async function searchByISBN(isbn) {
  try {
    const cleanISBN = isbn.replace(/[^0-9X]/gi, '');
    const res = await fetch(`${API_BASE}?q=isbn:${cleanISBN}`);
    if (!res.ok) throw new Error('API request failed');

    const data = await res.json();
    if (!data.items || data.items.length === 0) return null;

    const vol = data.items[0].volumeInfo;
    return {
      title: vol.title || '',
      author: (vol.authors || []).join(', '),
      totalPages: vol.pageCount || 0,
      coverUrl: vol.imageLinks
        ? (vol.imageLinks.thumbnail || vol.imageLinks.smallThumbnail || '').replace('http://', 'https://')
        : '',
      isbn: cleanISBN,
      description: vol.description || '',
      publisher: vol.publisher || '',
      publishedDate: vol.publishedDate || '',
    };
  } catch (err) {
    console.error('Google Books API error:', err);
    return null;
  }
}
