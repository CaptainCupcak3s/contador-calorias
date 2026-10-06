// Variables Globales de Estado
let dailyTargets = { cal: 0, pro: 0, fat: 0, carb: 0, water: 0 };
let consumed = { cal: 0, pro: 0, fat: 0, carb: 0, water: 0 };
let foodEntries = [];

document.addEventListener('DOMContentLoaded', () => {
  loadSavedData();
  registerServiceWorker();
});

// 1. CALCULADORA DE METAS Y RUTINA
document.getElementById('tdee-form').addEventListener('submit', (e) => {
  e.preventDefault(); // Evita que la página se reinicie

  const gender = document.querySelector('input[name="gender"]:checked').value;
  const age = parseFloat(document.getElementById('age').value);
  const weight = parseFloat(document.getElementById('weight').value);
  const height = parseFloat(document.getElementById('height').value);
  const steps = parseFloat(document.getElementById('steps').value) || 0;
  
  // Captura las calorías de la rutina seleccionada
  const workoutKcal = parseFloat(document.getElementById('workout-day').value) || 0;
  const deficitPercent = parseFloat(document.getElementById('deficit-percent').value);

  // Fórmula Mifflin-St Jeor
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  bmr = gender === 'male' ? bmr + 5 : bmr - 161;

  const totalTDEE = (bmr * 1.2) + (steps * 0.04) + workoutKcal;
  const targetCalories = totalTDEE * (1 - (deficitPercent / 100));

  dailyTargets.cal = Math.round(targetCalories);
  dailyTargets.pro = Math.round(weight * 2.0);
  dailyTargets.fat = Math.round(weight * 0.9);
  
  let carbKcal = dailyTargets.cal - ((dailyTargets.pro * 4) + (dailyTargets.fat * 9));
  dailyTargets.carb = Math.round(Math.max(carbKcal / 4, 0));

  // Meta de agua: 35ml por cada kg de peso corporal
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

// 2. BASE DE DATOS LOCAL AMPLIADA
const LOCAL_FOOD_DATABASE = [
  // Carnes y Proteínas
  { name: "Pechuga de pollo (cocida/plancha)", kcals: 165, pro: 31, fat: 3.6, carb: 0 },
  { name: "Carne de res magra (esmechada/molida)", kcals: 250, pro: 26, fat: 15, carb: 0 },
  { name: "Bistec de res (plancha)", kcals: 271, pro: 25, fat: 19, carb: 0 },
  { name: "Chuleta de cerdo (sin grasa)", kcals: 197, pro: 24, fat: 10, carb: 0 },
  { name: "Atún en lata (en agua)", kcals: 116, pro: 26, fat: 1, carb: 0 },
  { name: "Huevo entero (hervido/frito sin aceite)", kcals: 155, pro: 13, fat: 11, carb: 1.1 },
  { name: "Claras de huevo", kcals: 52, pro: 11, fat: 0.2, carb: 0.7 },
  
  // Carbohidratos base
  { name: "Arroz blanco (cocido)", kcals: 130, pro: 2.7, fat: 0.3, carb: 28 },
  { name: "Pasta (cocida)", kcals: 158, pro: 5.8, fat: 0.9, carb: 31 },
  { name: "Avena en hojuelas", kcals: 389, pro: 16.9, fat: 6.9, carb: 66 },
  { name: "Papa (hervida/horneada)", kcals: 87, pro: 1.9, fat: 0.1, carb: 20 },
  { name: "Plátano maduro (horneado/asado)", kcals: 116, pro: 1.2, fat: 0.3, carb: 28 },
  { name: "Plátano maduro (frito en tajadas)", kcals: 250, pro: 1.5, fat: 12, carb: 35 },
  { name: "Caraotas negras (cocidas)", kcals: 132, pro: 8.9, fat: 0.5, carb: 23 },
  { name: "Lentejas (cocidas)", kcals: 116, pro: 9, fat: 0.4, carb: 20 },
  
  // Panadería, Harinas y Frituras
  { name: "Arepa (Harina P.A.N. asada, 1 mediana)", kcals: 215, pro: 4.5, fat: 1.5, carb: 45 },
  { name: "Empanada de carne mechada (frita, 1 unidad)", kcals: 310, pro: 12, fat: 16, carb: 30 },
  { name: "Empanada de pollo (frita, 1 unidad)", kcals: 290, pro: 14, fat: 14, carb: 28 },
  { name: "Empanada de queso (frita, 1 unidad)", kcals: 320, pro: 10, fat: 18, carb: 29 },
  { name: "Pan canilla (1/2 canilla aprox 100g)", kcals: 275, pro: 9, fat: 2.5, carb: 53 },
  { name: "Pan campesino (1 rebanada grande 50g)", kcals: 140, pro: 4.5, fat: 1.5, carb: 26 },
  { name: "Pan de molde blanco (1 rebanada)", kcals: 75, pro: 2.5, fat: 1, carb: 14 },
  { name: "Cachito de jamón (1 unidad mediana)", kcals: 380, pro: 12, fat: 18, carb: 40 },
  { name: "Tequeño (frito, 1 unidad 30g)", kcals: 110, pro: 4, fat: 6, carb: 10 },
  
  // Lácteos y Grasas
  { name: "Queso blanco duro rallado (Llanero)", kcals: 350, pro: 22, fat: 28, carb: 2 },
  { name: "Queso Guayanés / Telita / Paisa", kcals: 290, pro: 18, fat: 22, carb: 2 },
  { name: "Queso amarillo (Gouda/Pecorino)", kcals: 356, pro: 25, fat: 27, carb: 2 },
  { name: "Jamón de pierna / espalda", kcals: 145, pro: 16, fat: 7, carb: 3 },
  { name: "Mantequilla (con sal)", kcals: 717, pro: 0.8, fat: 81, carb: 0.1 },
  { name: "Mantequilla de maní (sin azúcar)", kcals: 588, pro: 25, fat: 50, carb: 20 },
  { name: "Leche entera", kcals: 61, pro: 3.2, fat: 3.3, carb: 4.8 },
  { name: "Leche descremada", kcals: 35, pro: 3.4, fat: 0.2, carb: 5 },
  
  // Bebidas y Snacks
  { name: "Maltín (1 lata / 355ml)", kcals: 180, pro: 1, fat: 0, carb: 44 },
  { name: "Refresco / Coca-Cola (1 vaso 250ml)", kcals: 105, pro: 0, fat: 0, carb: 26 },
  { name: "Jugo de naranja natural (1 vaso)", kcals: 112, pro: 1.7, fat: 0.5, carb: 26 },
  { name: "Cambur (Banana)", kcals: 89, pro: 1.1, fat: 0.3, carb: 23 },
  { name: "Manzana", kcals: 52, pro: 0.3, fat: 0.2, carb: 14 }
];

const searchInput = document.getElementById('api-search');
const resultsList = document.getElementById('api-results');
let searchDebounce;

searchInput.addEventListener('input', (e) => {
  clearTimeout(searchDebounce);
  const query = e.target.value.trim().toLowerCase();

  if (query.length < 2) {
    resultsList.innerHTML = '';
    resultsList.classList.add('hidden');
    return;
  }

  searchDebounce = setTimeout(async () => {
    resultsList.innerHTML = '<li>🔍 Buscando alimento...</li>';
    resultsList.classList.remove('hidden');

    let foundProducts = [];

    try {
      const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8`, {
        signal: AbortSignal.timeout(4000)
      });
      const data = await response.json();
      
      if (data.products && data.products.length > 0) {
        data.products.forEach(product => {
          const name = product.product_name_es || product.product_name || 'Alimento';
          const kcals = Math.round(product.nutriments['energy-kcal_100g'] || 0);
          const pro = Math.round(product.nutriments['proteins_100g'] || 0);
          const fat = Math.round(product.nutriments['fat_100g'] || 0);
          const carb = Math.round(product.nutriments['carbohydrates_100g'] || 0);

          if (kcals > 0) {
            foundProducts.push({ name, kcals, pro, fat, carb, source: 'api' });
          }
        });
      }
    } catch (err) {
      console.warn("API no disponible, usando base local...");
    }

    if (foundProducts.length === 0) {
      const filteredLocal = LOCAL_FOOD_DATABASE.filter(item => item.name.toLowerCase().includes(query));
      filteredLocal.forEach(item => {
        foundProducts.push({ ...item, source: 'local' });
      });
    }

    resultsList.innerHTML = '';

    if (foundProducts.length === 0) {
      resultsList.innerHTML = '<li>No se encontró el alimento. Intenta escribirlo diferente.</li>';
      return;
    }

    foundProducts.forEach(product => {
      const li = document.createElement('li');
      const badge = product.source === 'local' ? ' 🏠' : ' 🌐';
      li.innerHTML = `<strong>${product.name}</strong>${badge}<br><small style="color:#94a3b8">${product.kcals} kcal | P: ${product.pro}g | G: ${product.fat}g | C: ${product.carb}g (por 100g)</small>`;
      
      li.onclick = () => {
        const grams = prompt(`¿Cuántos gramos de "${product.name}" consumiste? (1 empanada/cachito = 100g aprox)`, "100");
        if (grams && !isNaN(grams) && grams > 0) {
          const factor = parseFloat(grams) / 100;
          addFoodEntry(
            `${product.name} (${grams}g)`,
            Math.round(product.kcals * factor),
            Math.round(product.pro * factor),
            Math.round(product.fat * factor),
            Math.round(product.carb * factor)
          );
          searchInput.value = '';
          resultsList.classList.add('hidden');
        }
      };
      resultsList.appendChild(li);
    });

  }, 350);
});

// 3. REGISTRO DE ALIMENTOS Y AGUA
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

// 4. PERSISTENCIA Y REINICIO
document.getElementById('btn-reset-day').addEventListener('click', () => {
  if (confirm("¿Seguro que deseas vaciar tu registro de hoy (alimentos y agua)?")) {
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

// 5. SERVICE WORKER
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.error(err));
  }
}
