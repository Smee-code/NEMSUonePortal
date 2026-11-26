import api from '../api/axios';

/*
  Open a PDF that sits behind the authenticated API in a new browser tab.

  The file cannot be linked to directly (the request needs the access token in a
  header), so it is fetched as a blob and shown from a temporary blob: URL.
  Returns nothing; throws if the file could not be loaded.
*/
export async function openPdf(apiPath) {
  // Open the tab first, inside the click, so popup blockers allow it.
  const tab = window.open('', '_blank');
  try {
    const res = await api.get(apiPath, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    if (tab) tab.location.href = url; else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    if (tab) tab.close();
    throw err;
  }
}
