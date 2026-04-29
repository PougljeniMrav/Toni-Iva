const guests = [];
let activeSuggestionIndex = -1;

const input = document.getElementById('name-input');
const suggestionsEl = document.getElementById('suggestions');
const form = document.getElementById('search-form');
const resultEl = document.getElementById('result');

function normalize(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd')
        .trim();
}

function parseCSVLine(line) {
    const cells = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            cells.push(cur);
            cur = '';
        } else {
            cur += ch;
        }
    }
    cells.push(cur);
    return cells.map(c => c.trim());
}

async function loadGuests() {
    const response = await fetch('assets/PopisGostiju.csv');
    const text = await response.text();
    const lines = text.split(/\r?\n/);

    if (lines.length === 0) return;

    const tables = parseCSVLine(lines[0]);

    for (let r = 1; r < lines.length; r++) {
        if (!lines[r].includes(',') && lines[r].trim().length === 0) continue;
        const cells = parseCSVLine(lines[r]);
        for (let c = 0; c < cells.length; c++) {
            const name = cells[c].trim();
            if (name.length > 0 && tables[c]) {
                guests.push({ name, table: tables[c].trim() });
            }
        }
    }
}

function findMatches(query) {
    const q = normalize(query);
    if (q.length < 3) return [];
    return guests
        .filter(g => normalize(g.name).includes(q))
        .slice(0, 8);
}

function renderSuggestions(matches) {
    suggestionsEl.innerHTML = '';
    activeSuggestionIndex = -1;
    if (matches.length === 0) {
        suggestionsEl.hidden = true;
        return;
    }
    matches.forEach((g, idx) => {
        const li = document.createElement('li');
        li.textContent = g.name;
        li.dataset.index = idx;
        li.addEventListener('mousedown', (e) => {
            e.preventDefault();
            input.value = g.name;
            suggestionsEl.hidden = true;
            showResult(g);
        });
        suggestionsEl.appendChild(li);
    });
    suggestionsEl.hidden = false;
}

function showResult(guest) {
    if (!guest) {
        resultEl.className = 'result not-found';
        resultEl.textContent = 'Ime nije pronađeno, molimo obratite se osoblju';
        resultEl.hidden = false;
        return;
    }
    resultEl.className = 'result found';
    resultEl.innerHTML = `Sjedite za stolom <strong>${guest.table}</strong>`;
    resultEl.hidden = false;
}

function findExact(query) {
    const q = normalize(query);
    if (q.length === 0) return null;
    let match = guests.find(g => normalize(g.name) === q);
    if (match) return match;
    const partials = guests.filter(g => normalize(g.name).includes(q));
    if (partials.length === 1) return partials[0];
    return null;
}

input.addEventListener('input', () => {
    resultEl.hidden = true;
    const matches = findMatches(input.value);
    renderSuggestions(matches);
});

input.addEventListener('keydown', (e) => {
    const items = suggestionsEl.querySelectorAll('li');
    if (suggestionsEl.hidden || items.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
        updateActive(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
        updateActive(items);
    } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
        e.preventDefault();
        items[activeSuggestionIndex].dispatchEvent(new MouseEvent('mousedown'));
    } else if (e.key === 'Escape') {
        suggestionsEl.hidden = true;
    }
});

function updateActive(items) {
    items.forEach((it, i) => {
        it.classList.toggle('active', i === activeSuggestionIndex);
    });
    if (activeSuggestionIndex >= 0) {
        items[activeSuggestionIndex].scrollIntoView({ block: 'nearest' });
    }
}

document.addEventListener('click', (e) => {
    if (!suggestionsEl.contains(e.target) && e.target !== input) {
        suggestionsEl.hidden = true;
    }
});

form.addEventListener('submit', (e) => {
    e.preventDefault();
    suggestionsEl.hidden = true;
    const query = input.value.trim();
    if (query.length === 0) {
        showResult(null);
        return;
    }
    const guest = findExact(query);
    showResult(guest);
});

loadGuests().catch(err => {
    console.error('Greška pri učitavanju popisa gostiju:', err);
    resultEl.className = 'result not-found';
    resultEl.textContent = 'Greška pri učitavanju popisa. Pokušajte ponovno.';
    resultEl.hidden = false;
});
