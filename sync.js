// sync.js - Uniwersalna obsługa synchronizacji postępu znajdziek z KV

async function pobierzPostep(discordId) {
    try {
        const res = await fetch(`/members/event/${EVENT_NAME}/read?discordId=${discordId}`);
        const data = await res.json();
        return data.exists ? data.items : null;
    } catch (e) {
        console.error("Błąd pobierania postępu:", e);
        return null;
    }
}

async function migrujPostep(discordId, items) {
    try {
        await fetch(`/members/event/${EVENT_NAME}/migrate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ discordId, items })
        });
    } catch (e) {
        console.error("Błąd migracji:", e);
    }
}

async function zapiszPostep(discordId, itemId, actionType) {
    try {
        await fetch(`/members/event/${EVENT_NAME}/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ discordId, itemId, actionType })
        });
    } catch (e) {
        console.error("Błąd zapisu postępu:", e);
    }
}

async function zresetujWszystko(discordId) {
    try {
        await fetch(`/members/event/${EVENT_NAME}/reset`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ discordId })
        });
    } catch (e) {
        console.error("Błąd resetu:", e);
    }
}
