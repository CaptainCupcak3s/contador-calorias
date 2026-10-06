// Variables globales
let dailyTargets = { cal: 0, pro: 0, fat: 0, carb: 0 };
let consumed = { cal: 0, pro: 0, fat: 0, carb: 0 };
let foodEntries = [];

// Base de Datos de Alimentos
const foodDatabase = [
  { name: "Arepa de Maíz Blanco (cocida)", cal: 180, pro: 4, fat: 1, carb: 38 },
  { name: "Pechuga de Pollo a la plancha", cal: 165, pro: 31, fat: 3.6, carb: 0 },
  { name: "Carne Molida Magra (cocida)", cal: 215, pro: 26, fat: 11, carb: 0 },
  { name: "Queso Blanco Duro (Venezolano)", cal: 310, pro: 22, fat: 24, carb: 2 },
  { name: "Queso Guayanés / Telita", cal: 260, pro: 18, fat: 20, carb: 2 },
  { name: "Arroz Blanco Cocido", cal: 130, pro: 2.7, fat: 0.3, carb: 28 },
  { name: "Plátano Maduro al Horno", cal: 135, pro: 1.3, fat: 0.3, carb: 35 },
  { name: "Huevos Enteros (Sancochados/Plancha)", cal: 155, pro: 13, fat: 11, carb: 1.1 },
  { name: "Avena en Hojuelas", cal: 375, pro: 13.5, fat: 6.8, carb: 67 },
  { name: "Atún en Agua (escurrido)", cal: 116, pro: 26, fat: 1, carb: 0 },
  { name: "Caraotas Negras Cocidas", cal: 120, pro: 8, fat: 0.5, carb: 21 },
  { name: "Aguacate", cal: 160, pro: 2, fat: 15, carb: 8 },
  { name: "Aceite de Oliva (1 cda = 10g)", cal: 884, pro: 0, fat: 100, carb: 0 }
];

// Recetario
const recipeDatabase = [
  { name: "Arepa Reina Pepiada Fit", type: "Desayuno / Cena", cal: 420, pro: 32, fat: 12, carb: 45, ingredients: "150g masa de arepa, 100g pechuga desmechada, 30g aguacate, 1 cda yogurt griego." },
  { name: "Arepa con Queso Duro y Huevo", type: "Desayuno", cal: 380, pro: 22, fat: 15, carb: 39, ingredients: "120g masa de arepa, 40g queso duro, 1 huevo sancochado o a la plancha." },
  { name: "Bowl de Pabellón Fitness", type: "Almuerzo", cal: 550, pro: 42, fat: 10, carb: 68, ingredients: "150g carne desmechada magra, 120g arroz blanco, 100g caraotas negras, 80g plátano al horno." },
  { name: "Pollo Gratinado con Plátano", type: "Almuerzo / Cena", cal: 460, pro: 45, fat: 14, carb: 38, ingredients: "180g pechuga de pollo, 100g plátano maduro al horno, 30g queso guayanés." },
  { name: "Avena Proteica con Huevos", type: "Desayuno", cal: 410, pro: 28, fat: 13, carb: 46, ingredients: "50g avena cocida en agua, 2 huevos sancochados a un lado." },
  { name: "Atún con Arroz y Aguacate", type: "Almuerzo Rápido", cal: 430, pro: 38, fat: 11, carb: 44, ingredients: "1 lata atún en agua, 130g arroz blanco, 80g caraotas negras, 30g aguacate." }
];

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
  populateFoodDropdown();
  setupFoodSearch();
  loadSavedData();
  registerServiceWorker();
});

function populateFoodDropdown() {
  const select = document.getElementById('db-select');
  foodDatabase.forEach((food, index) => {
    const opt = document.createElement('option');
    opt.value = index;
    opt.innerText = food.name;
    select.appendChild(opt);
  });
}

// 1. CALCULADORA TDEE
document.getElementById('tdee-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const gender = document.querySelector('input[name="gender"]:checked').value;
  const age = parseFloat(document.getElementById('age').value);
  const weight = parseFloat(document.getElementById('weight').value);
  const height = parseFloat(document.getElementById('height').value);
  const steps = parseFloat(document.getElementById('steps').value) || 0;
  const workoutKcal = parseFloat(document.getElementById('workout').value) || 0;
  const deficitPercent = parseFloat(document.getElementById('deficit-percent').value);

  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  bmr = gender === 'male' ? bmr + 5 : bmr - 161;

  const sedentaryBase = bmr * 1.2;
  const stepsKcal = steps * 0.04;
  const totalTDEE = sedentaryBase + stepsKcal + workoutKcal;
  
  const targetCalories = totalTDEE * (1 - (deficitPercent / 100));

  const proteinGrams = weight * 2.0;
  const fatGrams = weight * 0.9;
  let carbKcal = targetCalories - ((proteinGrams * 4) + (fatGrams * 9));
  if (carbKcal < 0) carbKcal = 0;
  const carbGrams = carbKcal / 4;

  dailyTargets.cal = Math.round(targetCalories);
  dailyTargets.pro = Math.round(proteinGrams);
  dailyTargets.fat = Math.round(fatGrams);
  dailyTargets.carb = Math.round(carbGrams);

  renderTargetUI(bmr, totalTDEE);
  showAllCards();
  saveData();
});

function renderTargetUI(bmr, totalTDEE) {
  document.getElementById('bmr-val').innerText = `${Math.round(bmr)} kcal`;
  document.getElementById('tdee-val').innerText = `${Math.round(totalTDEE)} kcal`;
  document.getElementById('target-val').innerText = `${dailyTargets.cal} kcal`;
  
  document.getElementById('protein-val').innerText = `${dailyTargets.pro}g`;
  document.getElementById('protein-kcal').innerText = `${Math.round(dailyTargets.pro * 4)} kcal`;
  document.getElementById('fat-val').innerText = `${dailyTargets.fat}g`;
  document.getElementById('fat-kcal').innerText = `${Math.round(dailyTargets.fat * 9)} kcal`;
  document.getElementById('carb-val').innerText = `${dailyTargets.carb}g`;
  document.getElementById('carb-kcal').innerText = `${Math.round(dailyTargets.carb * 4)} kcal`;

  updateProgressUI();
}

function showAllCards() {
  document.getElementById('results-card').classList.remove('hidden');
  document.getElementById('tracking-card').classList.remove('hidden');
  document.getElementById('database-card').classList.remove('hidden');
  document.getElementById('controls-card').classList.remove('hidden');
}

// 2. BÚSQUEDA DE ALIMENTOS EN OPENFOODFACTS
let foodSearchTimer;
let foodSearchController;
let selectedApiFood = null;

function setupFoodSearch() {
  const searchInput = document.getElementById('food-search-input');
  const resultsList = document.getElementById('food-search-results');
  const selectedFoodForm = document.getElementById('selected-food-form');
  const exactGramsInput = document.getElementById('exact-grams');

  searchInput.addEventListener('input', () => {
    clearTimeout(foodSearchTimer);
    if (foodSearchController) foodSearchController.abort();
    selectedApiFood = null;
    selectedFoodForm.classList.add('hidden');

    const query = searchInput.value.trim();
    if (query.length < 2) {
      resultsList.replaceChildren();
      resultsList.classList.add('hidden');
      setFoodSearchStatus(query ? 'Escribe al menos 2 caracteres.' : '');
      return;
    }

    setFoodSearchStatus('Buscando alimentos…');
    foodSearchTimer = setTimeout(() => searchOpenFoodFacts(query), 300);
  });

  resultsList.addEventListener('click', (event) => {
    const resultButton = event.target.closest('[data-food-index]');
    if (!resultButton) return;

    selectedApiFood = currentFoodSearchResults[Number(resultButton.dataset.foodIndex)];
    if (!selectedApiFood) return;

    document.getElementById('selected-food-name').textContent = selectedApiFood.name;
    document.getElementById('selected-food-nutrition').textContent =
      `Por 100 g: ${formatMacro(selectedApiFood.cal)} kcal · P ${formatMacro(selectedApiFood.pro)} g · G ${formatMacro(selectedApiFood.fat)} g · C ${formatMacro(selectedApiFood.carb)} g`;
    document.getElementById('standard-portion-label').textContent =
      `Porción estándar (${selectedApiFood.servingGrams} g${selectedApiFood.hasApiServing ? '' : ', referencia'})`;
    exactGramsInput.value = selectedApiFood.servingGrams;
    document.querySelector('input[name="portion-mode"][value="standard"]').checked = true;
    exactGramsInput.disabled = true;
    selectedFoodForm.classList.remove('hidden');
    resultsList.classList.add('hidden');
    resultsList.replaceChildren();
    setFoodSearchStatus('');
  });

  document.querySelectorAll('input[name="portion-mode"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      exactGramsInput.disabled = document.querySelector('input[name="portion-mode"]:checked').value !== 'grams';
      if (!exactGramsInput.disabled) exactGramsInput.focus();
    });
  });

  selectedFoodForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!selectedApiFood) return;

    const mode = document.querySelector('input[name="portion-mode"]:checked').value;
    const grams = mode === 'standard' ? selectedApiFood.servingGrams : Number(exactGramsInput.value);
    if (!Number.isFinite(grams) || grams <= 0) {
      exactGramsInput.setCustomValidity('Ingresa una cantidad mayor que 0 g.');
      exactGramsInput.reportValidity();
      return;
    }
    exactGramsInput.setCustomValidity('');

    const factor = grams / 100;
    addFoodEntry(
      `${selectedApiFood.name} (${formatMacro(grams)} g)`,
      Math.round(selectedApiFood.cal * factor),
      roundMacro(selectedApiFood.pro * factor),
      roundMacro(selectedApiFood.fat * factor),
      roundMacro(selectedApiFood.carb * factor)
    );

    selectedFoodForm.classList.add('hidden');
    document.getElementById('food-search-input').value = '';
    setFoodSearchStatus('Alimento añadido a tu registro.');
    selectedApiFood = null;
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.food-search-wrap')) resultsList.classList.add('hidden');
  });

  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') resultsList.classList.add('hidden');
  });
}

let currentFoodSearchResults = [];

async function searchOpenFoodFacts(query) {
  const resultsList = document.getElementById('food-search-results');
  foodSearchController = new AbortController();
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '12',
    fields: 'product_name,brands,nutriments,serving_size,serving_quantity',
    lc: 'es'
  });

  try {
    const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, {
      signal: foodSearchController.signal,
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error('No se pudo consultar OpenFoodFacts.');

    const data = await response.json();
    currentFoodSearchResults = (data.products || []).map(normalizeOpenFoodFactsProduct).filter(Boolean);
    renderFoodSearchResults(currentFoodSearchResults);
  } catch (error) {
    if (error.name === 'AbortError') return;
    resultsList.replaceChildren();
    resultsList.classList.add('hidden');
    setFoodSearchStatus('No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.');
  }
}

function normalizeOpenFoodFactsProduct(product) {
  const nutriments = product.nutriments || {};
  const cal = Number(nutriments['energy-kcal_100g']);
  const energyKj = Number(nutriments['energy_100g']);
  const macros = {
    cal: Number.isFinite(cal) && cal > 0 ? cal : (Number.isFinite(energyKj) ? energyKj / 4.184 : NaN),
    pro: Number(nutriments['proteins_100g']),
    fat: Number(nutriments['fat_100g']),
    carb: Number(nutriments['carbohydrates_100g'])
  };
  const name = (product.product_name || '').trim();

  if (!name || Object.values(macros).some(value => !Number.isFinite(value) || value < 0)) return null;

  const servingGrams = parseServingGrams(product.serving_quantity, product.serving_size);
  return {
    name: product.brands ? `${name} · ${product.brands}` : name,
    ...macros,
    servingGrams: servingGrams || 100,
    hasApiServing: Boolean(servingGrams)
  };
}

function parseServingGrams(servingQuantity, servingSize) {
  const quantity = Number(servingQuantity);
  if (Number.isFinite(quantity) && quantity > 0) return Math.round(quantity);
  const match = String(servingSize || '').match(/([\d.,]+)\s*g\b/i);
  if (!match) return null;
  const grams = Number(match[1].replace(',', '.'));
  return Number.isFinite(grams) && grams > 0 ? Math.round(grams) : null;
}

function renderFoodSearchResults(products) {
  const resultsList = document.getElementById('food-search-results');
  resultsList.replaceChildren();

  if (products.length === 0) {
    resultsList.classList.add('hidden');
    setFoodSearchStatus('No encontramos resultados con información nutricional completa. Prueba otra búsqueda.');
    return;
  }

  products.forEach((product, index) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'food-search-result';
    button.dataset.foodIndex = index;

    const name = document.createElement('span');
    name.className = 'food-search-result-name';
    name.textContent = product.name;
    const nutrition = document.createElement('span');
    nutrition.className = 'food-search-result-macros';
    nutrition.textContent = `${formatMacro(product.cal)} kcal · P ${formatMacro(product.pro)} g · G ${formatMacro(product.fat)} g · C ${formatMacro(product.carb)} g / 100 g`;
    button.append(name, nutrition);
    item.appendChild(button);
    resultsList.appendChild(item);
  });

  resultsList.classList.remove('hidden');
  setFoodSearchStatus(`${products.length} resultado${products.length === 1 ? '' : 's'} disponible${products.length === 1 ? '' : 's'}.`);
}

function setFoodSearchStatus(message) {
  document.getElementById('food-search-status').textContent = message;
}

function roundMacro(value) {
  return Math.round(value * 10) / 10;
}

function formatMacro(value) {
  return Number(value).toLocaleString('es-ES', { maximumFractionDigits: 1 });
}

// 3. REGISTRO DESDE DESPLEGABLE
document.getElementById('btn-add-db').addEventListener('click', () => {
  const select = document.getElementById('db-select');
  const index = select.value;
  const grams = parseFloat(document.getElementById('db-grams').value) || 100;

  if (index === "") return alert("Selecciona un alimento de la lista.");

  const food = foodDatabase[index];
  const factor = grams / 100;

  const cal = Math.round(food.cal * factor);
  const pro = Math.round(food.pro * factor);
  const fat = Math.round(food.fat * factor);
  const carb = Math.round(food.carb * factor);

  addFoodEntry(`${food.name} (${grams}g)`, cal, pro, fat, carb);
});

// LÓGICA DE AÑADIR/ELIMINAR ALIMENTOS
function addFoodEntry(name, cal, pro, fat, carb) {
  const item = { id: Date.now(), name, cal, pro, fat, carb };
  foodEntries.push(item);

  consumed.cal += cal;
  consumed.pro += pro;
  consumed.fat += fat;
  consumed.carb += carb;

  renderFoodItem(item);
  updateProgressUI();
  saveData();
}

function renderFoodItem(item) {
  const li = document.createElement('li');
  li.dataset.id = item.id;
  const header = document.createElement('div');
  header.className = 'food-item-header';
  const title = document.createElement('span');
  title.className = 'food-title';
  title.textContent = item.name;
  const deleteButton = document.createElement('button');
  deleteButton.className = 'btn-delete';
  deleteButton.type = 'button';
  deleteButton.setAttribute('aria-label', `Eliminar ${item.name}`);
  deleteButton.textContent = '✕';
  deleteButton.addEventListener('click', () => removeFoodEntry(item.id));
  header.append(title, deleteButton);

  const details = document.createElement('span');
  details.className = 'food-details';
  details.textContent = `${item.cal} kcal | P: ${item.pro}g | G: ${item.fat}g | C: ${item.carb}g`;
  li.append(header, details);
  document.getElementById('food-list').appendChild(li);
}

function removeFoodEntry(id) {
  const index = foodEntries.findIndex(item => item.id === id);
  if (index > -1) {
    const item = foodEntries[index];
    consumed.cal -= item.cal;
    consumed.pro -= item.pro;
    consumed.fat -= item.fat;
    consumed.carb -= item.carb;

    foodEntries.splice(index, 1);

    const li = document.querySelector(`li[data-id="${id}"]`);
    if (li) li.remove();

    updateProgressUI();
    saveData();
  }
}

// 4. RECOMENDADOR ALEATORIO
document.getElementById('btn-recommend').addEventListener('click', () => {
  const remainingCal = dailyTargets.cal - consumed.cal;
  const resultBox = document.getElementById('recommendation-result');

  if (remainingCal <= 100) {
    resultBox.innerHTML = `<h4>¡Atención!</h4><p>Estás muy cerca de tu límite calórico (${remainingCal} kcal restantes).</p>`;
    resultBox.classList.remove('hidden');
    return;
  }

  const matchingRecipes = recipeDatabase.filter(r => r.cal <= (remainingCal + 50));

  if (matchingRecipes.length === 0) {
    resultBox.innerHTML = `
      <h4>Opción Ligera Recomendada</h4>
      <p>Te quedan <strong>${remainingCal} kcal</strong>. Te sugerimos un batido de proteína o 2 huevos sancochados con aguacate.</p>
    `;
  } else {
    const recipe = matchingRecipes[Math.floor(Math.random() * matchingRecipes.length)];
    resultBox.innerHTML = `
      <h4>💡 Te sugerimos: ${recipe.name}</h4>
      <p><strong>Clasificación:</strong> ${recipe.type}</p>
      <p class="recommendation-details"><strong>Aporte:</strong> ${recipe.cal} kcal | P: ${recipe.pro}g | G: ${recipe.fat}g | C: ${recipe.carb}g</p>
      <ul class="recipe-ingredients"><li><strong>Ingredientes:</strong> ${recipe.ingredients}</li></ul>
    `;
  }
  resultBox.classList.remove('hidden');
});

// 5. REINICIAR DÍA
document.getElementById('btn-reset-day').addEventListener('click', () => {
  if (confirm("¿Seguro que deseas reiniciar todas las comidas del día?")) {
    consumed = { cal: 0, pro: 0, fat: 0, carb: 0 };
    foodEntries = [];
    document.getElementById('food-list').innerHTML = '';
    updateProgressUI();
    saveData();
  }
});

// BARRAS DE PROGRESO UI
function updateProgressUI() {
  const updateBar = (idBar, idText, current, target) => {
    const textEl = document.getElementById(idText);
    const barEl = document.getElementById(idBar);
    textEl.innerText = `${Math.round(current)} / ${target}`;
    
    let percent = target > 0 ? (current / target) * 100 : 0;
    if (percent > 100) {
      barEl.style.width = '100%';
      barEl.classList.add('danger-fill');
    } else {
      barEl.style.width = `${percent}%`;
      barEl.classList.remove('danger-fill');
    }
  };

  updateBar('cal-bar', 'cal-progress-text', consumed.cal, dailyTargets.cal);
  updateBar('pro-bar', 'pro-progress-text', consumed.pro, dailyTargets.pro);
  updateBar('fat-bar', 'fat-progress-text', consumed.fat, dailyTargets.fat);
  updateBar('carb-bar', 'carb-progress-text', consumed.carb, dailyTargets.carb);
}

// PERSISTENCIA LOCALSTORAGE
function saveData() {
  const appData = {
    date: new Date().toDateString(),
    dailyTargets,
    consumed,
    foodEntries
  };
  localStorage.setItem('fit_app_data', JSON.stringify(appData));
}

function loadSavedData() {
  const saved = localStorage.getItem('fit_app_data');
  if (!saved) return;

  const data = JSON.parse(saved);
  const today = new Date().toDateString();

  if (data.dailyTargets && data.dailyTargets.cal > 0) {
    dailyTargets = data.dailyTargets;
    document.getElementById('target-val').innerText = `${dailyTargets.cal} kcal`;
    document.getElementById('protein-val').innerText = `${dailyTargets.pro}g`;
    document.getElementById('fat-val').innerText = `${dailyTargets.fat}g`;
    document.getElementById('carb-val').innerText = `${dailyTargets.carb}g`;
    showAllCards();
  }

  // Si los datos guardados corresponden a hoy, restaurar la lista de comidas
  if (data.date === today) {
    if (data.consumed) consumed = data.consumed;
    if (data.foodEntries) {
      foodEntries = data.foodEntries;
      foodEntries.forEach(item => renderFoodItem(item));
    }
  } else {
    // Es un nuevo día: mantener las metas pero limpiar las comidas
    saveData();
  }

  updateProgressUI();
}

// SERVICE WORKER PARA PWA
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('Service Worker registrado correctamente'))
      .catch(err => console.error('Error al registrar Service Worker:', err));
  }
}
