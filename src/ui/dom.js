export const $ = (sel, root = document) => root.querySelector(sel);

export function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), type === 'error' ? 7000 : 3000);
}

export function errorMessage(err) {
  if (err?.code === 'permission-denied') return 'No tenés permiso para hacer eso.';
  if (err?.code === 'unavailable') return 'Sin conexión con la base. Revisá internet y probá de nuevo.';
  if (err?.code === 'auth/popup-closed-by-user') return 'Se cerró la ventana de login.';
  if (err?.code === 'auth/popup-blocked') return 'El navegador bloqueó la ventana de login. Permitila y probá de nuevo.';
  return err?.message || 'Ocurrió un error inesperado.';
}

export function openDialog(html, { wide = false } = {}) {
  const dlg = $('#dialog');
  dlg.className = wide ? 'wide' : '';
  dlg.innerHTML = html;
  dlg.querySelectorAll('[data-close]').forEach((b) => (b.onclick = closeDialog));
  if (!dlg.open) dlg.showModal();
  return dlg;
}

export function closeDialog() {
  const dlg = $('#dialog');
  if (dlg.open) dlg.close();
  dlg.innerHTML = '';
}
