// Variables Globales de Estado
let dailyTargets = { cal: 0, pro: 0, fat: 0, carb: 0, water: 0 };
let consumed = { cal: 0, pro: 0, fat: 0, carb: 0, water: 0 };
let foodEntries = [];
let selectedFood = null;

document.addEventListener('DOMContentLoaded', () => {
  loadSavedData();
  registerServiceWorker();
});

// 1. CALCULADORA DE METAS Y RUTINA
document.getElementById('tdee-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const gender = document.querySelector('input[name="gender"]:checked').value;
  const age = parseFloat(document.getElementById('age').value);
  const weight = parseFloat(document.getElementById('weight').value);
  const height = parseFloat(document.getElementById('height').value);
  const steps = parseFloat(document.getElementById('steps').value) || 0;
  const workoutKcal = parseFloat(document.getElementById('workout-day').value) || 0;
  const deficitPercent = parseFloat(document.getElementById('deficit-percent').value);

  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  bmr = gender === 'male' ? bmr + 5 : bmr - 161;

  const totalTDEE = (bmr * 1.2) + (steps * 0.04) + workoutKcal;
  const targetCalories = totalTDEE * (1 - (deficitPercent / 100));

  dailyTargets.cal = Math.round(targetCalories);
  dailyTargets.pro = Math.round(weight * 2.0);
  dailyTargets.fat = Math.round(weight * 0.9);
  
  let carbKcal = dailyTargets.cal - ((dailyTargets.pro * 4) + (dailyTargets.fat * 9));
  dailyTargets.carb = Math.round(Math.max(carbKcal / 4, 0));
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

// 2. BASE DE DATOS LOCAL CON PORCIONES Y MACROS POR GRAMO
const LOCAL_FOOD_DATABASE = [
  // Panes y Arepas
  { name: "Pan Andino (Sweet Andean Bread)", macrosPerGram: { cal: 3.2, prot: 0.08, fat: 0.07, carb: 0.55 }, portions: [ { label: "Gramos (g)", weightInGrams: 1 }, { label: "1 Unidad estándar (80g)", weightInGrams: 80 }, { label: "1 Unidad grande (120g)", weightInGrams: 120 } ] },
  { name: "Pan Piñita (Sweet Bread Roll)", macrosPerGram: { cal: 3.5, prot: 0.07, fat: 0.09, carb: 0.60 }, portions: [ { label: "Gramos (g)", weightInGrams: 1 }, { label: "1 Piñita pequeña (40g)", weightInGrams: 40 }, { label: "1 Piñita grande (80g)", weightInGrams: 80 } ] },
  { name: "Pan Canilla (Baguette venezolana)", macrosPerGram: { cal: 2.75, prot: 0.09, fat: 0.02, carb: 0.53 }, portions: [ { label: "Gramos (g)", weightInGrams: 1 }, { label: "1/2 Canilla (100g)", weightInGrams: 100 }, { label: "1 Canilla entera (200g)", weightInGrams: 200 } ] },
  { name: "Pan de Molde / Rebanada Bimbo", macrosPerGram: { cal: 2.6, prot: 0.09, fat: 0.03, carb: 0.50 }, portions: [ { label: "Gramos (g)", weightInGrams: 1 }, { label: "1 Rebanada (28g)", weightInGrams: 28 }, { label: "2 Rebanadas (56g)", weightInGrams: 56 } ] },
  { name: "Arepa Asada (Harina P.A.N.)", macrosPerGram: { cal: 2.15, prot: 0.04, fat: 0.01, carb: 0.45 }, portions: [ { label: "Gramos (g)", weightInGrams: 1 }, { label: "1 Arepa mediana (100g)", weightInGrams: 100 }, { label: "1 Arepa grande (150g)", weightInGrams: 150 } ] },
  
  // Huevos y Proteínas
  { name: "Huevo Entero / Whole Egg", macrosPerGram: { cal: 1.43, prot: 0.13, fat: 0.10, carb: 0.01 }, portions: [ { label: "Gramos (g)", weightInGrams: 1 }, { label: "1 Unidad Mediana (44g)", weightInGrams: 44 }, { label: "1 Unidad Grande (50g)", weightInGrams: 50 } ] },
  { name: "Revoltillo de Huevos / Scrambled Eggs", macrosPerGram: { cal: 1.49, prot: 0.10, fat: 0.11, carb: 0.01 }, portions: [ { label: "Gramos (g)", weightInGrams: 1 }, { label: "1 Taza (110g)", weightInGrams: 110 }, { label: "1 Cucharada grande (30g)", weightInGrams: 30 } ] },
  { name: "Pechuga de Pollo / Chicken Breast (Cocida)", macrosPerGram: { cal: 1.65, prot: 0.31, fat: 0.03, carb: 0.0 }, portions: [ { label: "Gramos (g)", weightInGrams: 1 }, { label: "1 Filete mediano (150g)", weightInGrams: 150 }, { label: "1 Taza desmenuzado (125g)", weightInGrams: 125 } ] },
  { name: "Carne de Res Molida/Esmechada (Magra)", macrosPerGram: { cal: 2.50, prot: 0.26, fat: 0.15, carb: 0.0 }, portions: [ { label: "Gramos (g)", weightInGrams: 1 }, { label: "1 Taza (150g)", weightInGrams: 150 }, { label: "1 Cucharada sopera (20g)", weightInGrams: 20 } ] },
  
  // Acompañantes y Lácteos
  { name: "Arroz Blanco / White Rice (Cocido)", macrosPerGram: { cal: 1.30, prot: 0.02, fat: 0.0, carb: 0.28 }, portions: [ { label: "Gramos (g)", weightInGrams: 1 }, { label: "1 Taza (150g)", weightInGrams: 150 }, { label: "1/2 Taza (75g)", weightInGrams: 75 } ] },
  { name: "Queso Blanco Rallado (Llanero/Duro)", macrosPerGram: { cal: 3.50, prot: 0.22, fat: 0.28, carb: 0.02 }, portions: [ { label: "Gramos (g)", weightInGrams: 1 }, { label: "1 Cucharada colmada (15g)", weightInGrams: 15 }, { label: "1 Taza (100g)", weightInGrams: 100 } ] }
];

// 3. BUSCADOR Y SISTEMA DE PORCIONES DINÁMICO
const searchInput = document.getElementById('api-search');
const resultsList = document.getElementById('api-results');
const portionContainer = document.getElementById('portionContainer');
const portionSelect = document.getElementById('portionSelect');
const quantityInput = document.getElementById('quantityInput');
let searchDebounce;

searchInput.addEventListener('input', (e) => {
  clearTimeout(searchDebounce);
  const query = e.target.value.trim().toLowerCase();
  
  portionContainer.classList.add('hidden'); // Ocultar panel si el usuario vuelve a buscar
  selectedFood = null;

  if (query.length < 2) {
    resultsList.innerHTML = '';
    resultsList.classList.add('hidden');
    return;
  }

  searchDebounce = setTimeout(async () => {
    resultsList.innerHTML = '<li style="text-align:center;">🔍 Buscando alimento...</li>';
    resultsList.classList.remove('hidden');

    let foundProducts = [];

    // Búsqueda en API OpenFoodFacts
    try {
      const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=6`, {
        signal: AbortSignal.timeout(4000)
      });
      const data = await response.json();
      
      if (data.products && data.products.length > 0) {
        data.products.forEach(product => {
          const name = product.product_name_es || product.product_name || 'Alimento API';
          // Convertimos la base de 100g de la API a macros por gramo
          const kcals = (product.nutriments['energy-kcal_100g'] || 0) / 100;
          const pro = (product.nutriments['proteins_100g'] || 0) / 100;
          const fat = (product.nutriments['fat_100g'] || 0) / 100;
          const carb = (product.nutriments['carbohydrates_100g'] || 0) / 100;

          if (kcals > 0) {
            let dynamicPortions = [ { label: "Gramos (g)", weightInGrams: 1 } ];

            // Extraer empaques de la API para la calle
            if (product.serving_quantity) {
              dynamicPortions.push({ label: `Porción sugerida (${parseFloat(product.serving_quantity)}g/ml)`, weightInGrams: parseFloat(product.serving_quantity) });
            }
            if (product.product_quantity) {
              dynamicPortions.push({ label: `Empaque completo (${parseFloat(product.product_quantity)}g/ml)`, weightInGrams: parseFloat(product.product_quantity) });
            }
            // Salvavidas si la API no dice el peso
            if (!product.serving_quantity && !product.product_quantity) {
              dynamicPortions.push({ label: "Snack pequeño (30g)", weightInGrams: 30 });
              dynamicPortions.push({ label: "Porción estándar (50g)", weightInGrams: 50 });
              dynamicPortions.push({ label: "Empaque grande / Bebida (350g/ml)", weightInGrams: 350 });
            }

            foundProducts.push({ 
              name, 
              macrosPerGram: { cal: kcals, prot: pro, fat: fat, carb: carb }, 
              portions: dynamicPortions, 
              source: 'api' 
            });
          }
        });
      }
    } catch (err) {
      console.warn("API no disponible, usando base local...");
    }

    // Búsqueda Local
    const filteredLocal = LOCAL_FOOD_DATABASE.filter(item => item.name.toLowerCase().includes(query));
    filteredLocal.forEach(item => {
      foundProducts.push({ ...item, source: 'local' });
    });

    resultsList.innerHTML = '';
    if (foundProducts.length === 0) {
      resultsList.innerHTML = '<li>No se encontró el alimento. Escribe otro nombre.</li>';
      return;
    }

    foundProducts.forEach(product => {
      const li = document.createElement('li');
      const badge = product.source === 'local' ? ' 🏠' : ' 🌐';
      li.innerHTML = `<strong>${product.name}</strong>${badge}`;
      
      li.onclick = () => {
        selectFood(product);
      };
      resultsList.appendChild(li);
    });

  }, 400);
});

function selectFood(food) {
  selectedFood = food;
  searchInput.value = food.name;
  resultsList.classList.add('hidden');
  
  portionSelect.innerHTML = '';
  food.portions.forEach(portion => {
    const option = document.createElement('option');
    option.value = portion.weightInGrams;
    option.textContent = portion.label;
    portionSelect.appendChild(option);
  });

  document.getElementById('selectedFoodName').textContent = food.name;
  quantityInput.value = 1;
  portionContainer.classList.remove('hidden');
  
  calculateMacros();
}

portionSelect.addEventListener('change', calculateMacros);
quantityInput.addEventListener('input', calculateMacros);

function calculateMacros() {
  if (!selectedFood) return;

  const weightPerUnit = parseFloat(portionSelect.value);
  const quantity = parseFloat(quantityInput.value) || 0;
  const totalGrams = weightPerUnit * quantity;
  
  const cals = Math.round(selectedFood.macrosPerGram.cal * totalGrams);
  const prot = Math.round(selectedFood.macrosPerGram.prot * totalGrams);
  const fat = Math.round(selectedFood.macrosPerGram.fat * totalGrams);
  const carb = Math.round(selectedFood.macrosPerGram.carb * totalGrams);

  document.getElementById('calVal').textContent = cals;
  document.getElementById('protVal').textContent = prot + 'g';
  document.getElementById('fatVal').textContent = fat + 'g';
  document.getElementById('carbVal').textContent = carb + 'g';
  document.getElementById('totalWeightVal').textContent = totalGrams.toFixed(1) + 'g';
}

document.getElementById('btn-add-food').addEventListener('click', () => {
  if (!selectedFood) return;
  
  const totalGrams = parseFloat(portionSelect.value) * (parseFloat(quantityInput.value) || 0);
  if (totalGrams <= 0) return;

  const cal = Math.round(selectedFood.macrosPerGram.cal * totalGrams);
  const pro = Math.round(selectedFood.macrosPerGram.prot * totalGrams);
  const fat = Math.round(selectedFood.macrosPerGram.fat * totalGrams);
  const carb = Math.round(selectedFood.macrosPerGram.carb * totalGrams);

  addFoodEntry(`${selectedFood.name} (${totalGrams.toFixed(0)}g)`, cal, pro, fat, carb);
  
  // Resetear UI
  portionContainer.classList.add('hidden');
  searchInput.value = '';
  selectedFood = null;
});

// 4. REGISTRO ALIMENTOS, AGUA Y BARRAS
function addFoodEntry(name, cal, pro, fat, carb) {
  const item = { id: Date.now(), name, cal, pro, fat, carb };
  foodEntries.push(item);
  consumed.cal += cal; consumed.pro += pro; consumed.fat += fat; consumed.carb += carb;
  
  renderFoodList();
  updateProgressBars();
  saveData();
}

function removeFoodEntry(id) {
  const index = foodEntries.findIndex(item => item.id === id);
  if (index > -1) {
    consumed.cal -= foodEntries[index].cal; consumed.pro -= foodEntries[index].pro;
    consumed.fat -= foodEntries[index].fat; consumed.carb -= foodEntries[index].carb;
    foodEntries.splice(index, 1);
    
    renderFoodList();
    updateProgressBars();
    saveData();
  }
}

document.getElementById('btn-add-water').addEventListener('click', () => {
  consumed.water += 250;
  document.getElementById('water-consumed-text').innerText = consumed.water;
  saveData();
});

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

// 5. PERSISTENCIA EN MEMORIA
document.getElementById('btn-reset-day').addEventListener('click', () => {
  if (confirm("¿Seguro que deseas vaciar tu registro de hoy?")) {
    consumed = { cal: 0, pro: 0, fat: 0, carb: 0, water: 0 };
    foodEntries = [];
    document.getElementById('water-consumed-text').innerText = "0";
    renderFoodList();
    updateProgressBars();
    saveData();
  }
});

function saveData() {
  const data = { date: new Date().toDateString(), dailyTargets, consumed, foodEntries };
  localStorage.setItem('macro_pwa_data', JSON.stringify(data));
}

function loadSavedData() {
  const saved = localStorage.getItem('macro_pwa_data');
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
    saveData();
  }
}

// 6. SERVICE WORKER
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.error(err));
  }
}

