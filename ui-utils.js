/**
 * UI Utilities for the Expense Report Application
 * Provides custom Toast notifications, Modal Confirmations, Modal Prompts, Loading States, and Auth Helpers.
 */

// --- AUTH UTILITIES ---
function initAuth(supabaseClient, onAuthChangeCallback) {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        const user = session?.user || null;
        onAuthChangeCallback(user);
    });

    supabaseClient.auth.onAuthStateChange((_event, session) => {
        const user = session?.user || null;
        onAuthChangeCallback(user);
    });
}

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // Basic styling (more in style.css)
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = 'var(--radius-md, 6px)';
    toast.style.color = 'white';
    toast.style.fontSize = '0.9rem';
    toast.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'opacity 0.3s, transform 0.3s';

    if (type === 'error') {
        toast.style.backgroundColor = 'var(--danger-color, #ef4444)';
    } else if (type === 'success') {
        toast.style.backgroundColor = 'var(--success-color, #10b981)';
    } else {
        toast.style.backgroundColor = 'var(--primary-color, #1e293b)';
    }

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// --- CUSTOM CONFIRM MODAL ---
function showConfirm(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay no-print';
        overlay.style.zIndex = '2000';

        const modal = document.createElement('div');
        modal.className = 'custom-modal-content card';
        modal.style.maxWidth = '400px';
        modal.style.width = '90%';
        modal.style.textAlign = 'center';

        const text = document.createElement('p');
        text.textContent = message;
        text.style.marginBottom = '20px';

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.justifyContent = 'center';
        btnContainer.style.gap = '15px';

        const btnYes = document.createElement('button');
        btnYes.className = 'btn btn-primary';
        btnYes.textContent = 'Ja';

        const btnNo = document.createElement('button');
        btnNo.className = 'btn btn-outline';
        btnNo.textContent = 'Avbryt';

        btnYes.onclick = () => {
            document.body.removeChild(overlay);
            resolve(true);
        };

        btnNo.onclick = () => {
            document.body.removeChild(overlay);
            resolve(false);
        };

        btnContainer.appendChild(btnNo);
        btnContainer.appendChild(btnYes);

        modal.appendChild(text);
        modal.appendChild(btnContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    });
}

// --- CUSTOM PROMPT MODAL ---
function showPrompt(message, defaultValue = '') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay no-print';
        overlay.style.zIndex = '2000';

        const modal = document.createElement('div');
        modal.className = 'custom-modal-content card';
        modal.style.maxWidth = '400px';
        modal.style.width = '90%';

        const text = document.createElement('p');
        text.textContent = message;
        text.style.marginBottom = '10px';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = defaultValue;
        input.style.width = '100%';
        input.style.marginBottom = '20px';

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.justifyContent = 'flex-end';
        btnContainer.style.gap = '10px';

        const btnOk = document.createElement('button');
        btnOk.className = 'btn btn-primary';
        btnOk.textContent = 'OK';

        const btnCancel = document.createElement('button');
        btnCancel.className = 'btn btn-outline';
        btnCancel.textContent = 'Avbryt';

        const cleanup = () => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        };

        btnOk.onclick = () => {
            cleanup();
            resolve(input.value);
        };

        btnCancel.onclick = () => {
            cleanup();
            resolve(null);
        };

        input.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                cleanup();
                resolve(input.value);
            }
        });

        btnContainer.appendChild(btnCancel);
        btnContainer.appendChild(btnOk);

        modal.appendChild(text);
        modal.appendChild(input);
        modal.appendChild(btnContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        input.focus();
    });
}

// --- LOADING STATE MANAGER ---
function setLoadingState(buttonElement, isLoading) {
    if (!buttonElement) return;

    if (isLoading) {
        // Store original text if not already stored
        if (!buttonElement.hasAttribute('data-original-text')) {
            buttonElement.setAttribute('data-original-text', buttonElement.innerHTML);
        }
        buttonElement.disabled = true;
        buttonElement.style.opacity = '0.7';
        buttonElement.style.cursor = 'not-allowed';
        buttonElement.innerHTML = 'Laster...';
    } else {
        buttonElement.disabled = false;
        buttonElement.style.opacity = '1';
        buttonElement.style.cursor = 'pointer';
        if (buttonElement.hasAttribute('data-original-text')) {
            buttonElement.innerHTML = buttonElement.getAttribute('data-original-text');
        }
    }
}
