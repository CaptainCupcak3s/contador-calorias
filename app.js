// Variables Globales
let dailyTargets = { cal: 0, pro: 0, fat: 0, carb: 0, water: 0 };
let consumed = { cal: 0, pro: 0, fat: 0, carb: 0, water: 0 };
let foodEntries = [];
let selectedFood = null;

document.addEventListener('DOMContentLoaded', loadSavedData);

// 1. CONFIGURACIÓN Y TDEE (Incluye Entrenamientos)
document.getElementById('tdee-form').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const weight = parseFloat(document.getElementById('weight').value);
  const workoutKcal = parseFloat(document.getElementById('workout-day').value) || 0;
  const deficitPercent = parseFloat(document.getElementById('deficit-percent').value);

  // BMR estándar para un hombre joven (Mifflin-St Jeor simplificado para 21 años, 175cm)
  let bmr = (10 * weight) + (6.25 * 175) - (5 * 21) + 5;
  
  // Asumimos un NEAT base de ~400 kcal (caminar diario, trabajo, etc)
  const totalTDEE = bmr + 400 + workoutKcal;
  const targetCalories = totalTDEE * (1 - (deficitPercent / 100));

  dailyTargets.cal = Math.round(targetCalories);
  dailyTargets.pro = Math.round(weight * 2.0);
  dailyTargets.fat = Math.round(weight * 0.9);
  
  let carbKcal = dailyTargets.cal - ((dailyTargets.pro * 4) + (dailyTargets.fat * 9));
  dailyTargets.carb = Math.round(Math.max(carbKcal / 4, 0));
  
  // Meta de agua ajustada al peso
  dailyTargets.water = Math.round(weight * 35);

  updateTargetUI();
  showAppCards();
  saveData();
});

function updateTargetUI() {
  document.getElementById('target-val').innerText = `${dailyTargets.cal} kcal`;
  document.getElementById('protein-val').innerText = `${dailyTargets.pro}g`;
  document.getElementById('fat-val').innerText = `${dailyTargets.fat}g`;
  document.getElementById('carb-val').innerText = `${dailyTargets.carb}g`;
  document.getElementById('water-target-text').innerText = `${dailyTargets.water} ml`;
  document.getElementById('water-consumed-text').innerText = consumed.water;
  updateProgressBars();
}

function showAppCards() {
  document.getElementById('results-card').classList.remove('hidden');
  document.getElementById('water-card').classList.remove('hidden');
  document.getElementById('database-card').classList.remove('hidden');
  document.getElementById('tracking-card').classList.remove('hidden');
  document.getElementById('controls-card').classList.remove('hidden');
}

// 2. SISTEMA DE AGUA
document.getElementById('btn-add-water').addEventListener('click', () => {
  consumed.water += 250;
  document.getElementById('water-consumed-text').innerText = consumed.water;
  saveData();
});

document.getElementById('btn-remove-water').addEventListener('click', () => {
  if (consumed.water >= 250) {
    consumed.water -= 250;
    document.getElementById('water-consumed-text').innerText = consumed.water;
    saveData();
  }
});

// 3. BASE DE DATOS LOCAL MIXTA (Inglés/Español) Y PORCIONES EXACTAS
const LOCAL_DB = [
  { name: "Pan Andino (Sweet Andean Bread)", macros: { cal: 3.2, prot: 0.08, fat: 0.07, carb: 0.55 }, portions: [{l: "Gramos (g)", w: 1}, {l: "1 Unidad Estándar (80g)", w: 80}, {l: "1 Unidad Grande (120g)", w: 120}] },
  { name: "Pan Piñita (Sweet Bread Roll)", macros: { cal: 3.5, prot: 0.07, fat: 0.09, carb: 0.60 }, portions: [{l: "Gramos (g)", w: 1}, {l: "1 Piñita Pequeña (40g)", w: 40}, {l: "1 Piñita Grande (80g)", w: 80}] },
  { name: "Pan Canilla", macros: { cal: 2.75, prot: 0.09, fat: 0.02, carb: 0.53 }, portions: [{l: "Gramos (g)", w: 1}, {l: "Media Canilla (100g)", w: 100}, {l: "Canilla Entera (200g)", w: 200}] },
  { name: "Huevo Entero / Whole Egg", macros: { cal: 1.43, prot: 0.13, fat: 0.10, carb: 0.01 }, portions: [{l: "Gramos (g)", w: 1}, {l: "1 Huevo Mediano (44g)", w: 44}, {l: "1 Huevo Grande (50g)", w: 50}] },
  { name: "Revoltillo de Huevos / Scrambled Eggs", macros: { cal: 1.49, prot: 0.10, fat: 0.11, carb: 0.01 }, portions: [{l: "Gramos (g)", w: 1}, {l: "1 Taza (110g)", w: 110}, {l: "1 Cucharada Sopera (30g)", w: 30}] },
  { name: "Pechuga de Pollo / Chicken Breast (Cocida)", macros: { cal: 1.65, prot: 0.31, fat: 0.03, carb: 0.0 }, portions: [{l: "Gramos (g)", w: 1}, {l: "1 Filete Mediano (150g)", w: 150}, {l: "1 Taza Desmenuzado (125g)", w: 125}] },
  { name: "Queso Blanco Rallado (Llanero/Duro)", macros: { cal: 3.50, prot: 0.22, fat: 0.28, carb: 0.02 }, portions: [{l: "Gramos (g)", w: 1}, {l: "1 Cucharada Colmada (15g)", w: 15}, {l: "1 Taza (100g)", w: 100}] },
  { name: "Arroz Blanco / White Rice (Cocido)", macros: { cal: 1.30, prot: 0.02, fat: 0.0, carb: 0.28 }, portions: [{l: "Gramos (g)", w: 1}, {l: "1 Taza (150g)", w: 150}, {l: "Media Taza (75g)", w: 75}] }
];

// 4. MOTOR DE BÚSQUEDA Y SELECCIÓN DE PORCIONES
const searchInput = document.getElementById('api-search');
const resultsList = document.getElementById('api-results');
const portionContainer = document.getElementById('portionContainer');
const portionSelect = document.getElementById('portionSelect');
const quantityInput = document.getElementById('quantityInput');
let searchTimeout;

searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  const query = e.target.value.trim().toLowerCase();
  
  portionContainer.classList.add('hidden');
  selectedFood = null;

  if (query.length < 2) {
    resultsList.classList.add('hidden');
    return;
  }

  searchTimeout = setTimeout(async () => {
    resultsList.innerHTML = '<li class="text-center text-gray-400">Buscando...</li>';
    resultsList.classList.remove('hidden');

    let combinedResults = [];

    // 1. Buscar en Local
    const localMatches = LOCAL_DB.filter(item => item.name.toLowerCase().includes(query));
    localMatches.forEach(item => combinedResults.push({ ...item, source: '🏠 Local' }));

    // 2. Buscar en API externa
    try {
      const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=5`);
      const data = await res.json();
      
      if (data.products) {
        data.products.forEach(p => {
          const name = p.product_name_es || p.product_name;
          const kcals = (p.nutriments['energy-kcal_100g'] || 0) / 100;
          const pro = (p.nutriments['proteins_100g'] || 0) / 100;
          const fat = (p.nutriments['fat_100g'] || 0) / 100;
          const carb = (p.nutriments['carbohydrates_100g'] || 0) / 100;

          if (name && kcals > 0) {
            let apiPortions = [{ l: "Gramos exactos (g)", w: 1 }];
            if (p.serving_quantity) apiPortions.push({ l: `Porción sugerida (${parseFloat(p.serving_quantity)}g)`, w: parseFloat(p.serving_quantity) });
            if (p.product_quantity) apiPortions.push({ l: `Empaque completo (${parseFloat(p.product_quantity)}g)`, w: parseFloat(p.product_quantity) });
            if (!p.serving_quantity && !p.product_quantity) {
              apiPortions.push({ l: "Porción Snack (30g)", w: 30 });
              apiPortions.push({ l: "Porción Estándar (50g)", w: 50 });
            }
            
            combinedResults.push({ name, macros: { cal: kcals, prot: pro, fat: fat, carb: carb }, portions: apiPortions, source: '🌐 API' });
          }
        });
      }
    } catch (e) {
      console.warn("Error API OpenFoodFacts");
    }

    // Renderizar Resultados
    resultsList.innerHTML = '';
    if (combinedResults.length === 0) {
      resultsList.innerHTML = '<li>No se encontraron resultados.</li>';
      return;
    }

    combinedResults.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${item.name}</strong> <span style="font-size:11px; float:right; color:#94a3b8;">${item.source}</span>`;
      li.onclick = () => activateFoodSelection(item);
      resultsList.appendChild(li);
    });

  }, 500);
});

function activateFoodSelection(food) {
  selectedFood = food;
  searchInput.value = '';
  resultsList.classList.add('hidden');
  
  document.getElementById('selectedFoodName').textContent = food.name;
  
  portionSelect.innerHTML = '';
  food.portions.forEach(p => {
    const option = document.createElement('option');
    option.value = p.w;
    option.textContent = p.l;
    portionSelect.appendChild(option);
  });

  quantityInput.value = 1;
  portionContainer.classList.remove('hidden');
  recalcLiveMacros();
}

portionSelect.addEventListener('change', recalcLiveMacros);
quantityInput.addEventListener('input', recalcLiveMacros);

function recalcLiveMacros() {
  if (!selectedFood) return;
  const unitWeight = parseFloat(portionSelect.value) || 0;
  const qty = parseFloat(quantityInput.value) || 0;
  const totalG = unitWeight * qty;
  
  document.getElementById('calVal').textContent = Math.round(selectedFood.macros.cal * totalG);
  document.getElementById('protVal').textContent = Math.round(selectedFood.macros.prot * totalG) + 'g';
  document.getElementById('fatVal').textContent = Math.round(selectedFood.macros.fat * totalG) + 'g';
  document.getElementById('carbVal').textContent = Math.round(selectedFood.macros.carb * totalG) + 'g';
  document.getElementById('totalWeightVal').textContent = totalG.toFixed(1) + 'g';
}

document.getElementById('btn-add-food').addEventListener('click', () => {
  if (!selectedFood) return;
  const totalGrams = (parseFloat(portionSelect.value) || 0) * (parseFloat(quantityInput.value) || 0);
  if (totalGrams <= 0) return;

  const cal = Math.round(selectedFood.macros.cal * totalGrams);
  const pro = Math.round(selectedFood.macros.prot * totalGrams);
  const fat = Math.round(selectedFood.macros.fat * totalGrams);
  const carb = Math.round(selectedFood.macros.carb * totalGrams);

  const entryName = `${selectedFood.name} (${totalGrams.toFixed(0)}g)`;
  
  foodEntries.push({ id: Date.now(), name: entryName, cal, pro, fat, carb });
  consumed.cal += cal; consumed.pro += pro; consumed.fat += fat; consumed.carb += carb;
  
  portionContainer.classList.add('hidden');
  selectedFood = null;
  
  renderFoodList();
  updateProgressBars();
  saveData();
});

// 5. RENDERIZADO Y GUARDADO
function renderFoodList() {
  const list = document.getElementById('food-list');
  list.innerHTML = '';
  foodEntries.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="food-item-header">
        <span class="food-title">${item.name}</span>
        <button class="btn-delete" onclick="removeFoodEntry(${item.id})">✕</button>
      </div>
      <span class="food-details">${item.cal} kcal | P: ${item.pro}g | G: ${item.fat}g | C: ${item.carb}g</span>
    `;
    list.appendChild(li);
  });
}

window.removeFoodEntry = function(id) {
  const idx = foodEntries.findIndex(i => i.id === id);
  if (idx > -1) {
    consumed.cal -= foodEntries[idx].cal; consumed.pro -= foodEntries[idx].pro;
    consumed.fat -= foodEntries[idx].fat; consumed.carb -= foodEntries[idx].carb;
    foodEntries.splice(idx, 1);
    renderFoodList();
    updateProgressBars();
    saveData();
  }
}

function updateProgressBars() {
  const setBar = (idBar, idText, current, target) => {
    document.getElementById(idText).innerText = `${Math.round(current)} / ${target}`;
    const bar = document.getElementById(idBar);
    let percent = target > 0 ? (current / target) * 100 : 0;
    
    if (percent > 100) {
      bar.style.width = '100%';
      bar.classList.add('danger-fill');
    } else {
      bar.style.width = `${percent}%`;
      bar.classList.remove('danger-fill');
    }
  };
  setBar('cal-bar', 'cal-progress-text', consumed.cal, dailyTargets.cal);
  setBar('pro-bar', 'pro-progress-text', consumed.pro, dailyTargets.pro);
  setBar('fat-bar', 'fat-progress-text', consumed.fat, dailyTargets.fat);
  setBar('carb-bar', 'carb-progress-text', consumed.carb, dailyTargets.carb);
}

document.getElementById('btn-reset-day').addEventListener('click', () => {
  if (confirm("¿Vaciar todo el consumo de hoy (Agua y Comida)?")) {
    consumed = { cal: 0, pro: 0, fat: 0, carb: 0, water: 0 };
    foodEntries = [];
    document.getElementById('water-consumed-text').innerText = "0";
    renderFoodList();
    updateProgressBars();
    saveData();
  }
});

function saveData() {
  localStorage.setItem('macro_pwa_v2', JSON.stringify({ date: new Date().toDateString(), dailyTargets, consumed, foodEntries }));
}

function loadSavedData() {
  const saved = localStorage.getItem('macro_pwa_v2');
  if (!saved) return;
  const data = JSON.parse(saved);

  if (data.dailyTargets && data.dailyTargets.cal > 0) {
    dailyTargets = data.dailyTargets;
    if (!dailyTargets.water) dailyTargets.water = 2500;
    updateTargetUI();
    showAppCards();
  }

  if (data.date === new Date().toDateString()) {
    if (data.consumed) {
      consumed = data.consumed;
      if (!consumed.water) consumed.water = 0;
      document.getElementById('water-consumed-text').innerText = consumed.water;
    }
    if (data.foodEntries) {
      foodEntries = data.foodEntries;
      renderFoodList();
      updateProgressBars();
    }
  } else {
    saveData(); // Resetea si es un día nuevo
  }
}

