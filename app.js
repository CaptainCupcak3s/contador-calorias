// Variables Globales de Estado
let dailyTargets = { cal: 0, pro: 0, fat: 0, carb: 0 };
let consumed = { cal: 0, pro: 0, fat: 0, carb: 0 };
let foodEntries = [];

document.addEventListener('DOMContentLoaded', () => {
  loadSavedData();
  registerServiceWorker();
});

// 1. CALCULADORA DE METAS
document.getElementById('tdee-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const gender = document.querySelector('input[name="gender"]:checked').value;
  const age = parseFloat(document.getElementById('age').value);
  const weight = parseFloat(document.getElementById('weight').value);
  const height = parseFloat(document.getElementById('height').value);
  const steps = parseFloat(document.getElementById('steps').value) || 0;
  const workoutKcal = parseFloat(document.getElementById('workout').value) || 0;
  const deficitPercent = parseFloat(document.getElementById('deficit-percent').value);

  // Fórmula Mifflin-St Jeor
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  bmr = gender === 'male' ? bmr + 5 : bmr - 161;

  const totalTDEE = (bmr * 1.2) + (steps * 0.04) + workoutKcal;
  const targetCalories = totalTDEE * (1 - (deficitPercent / 100));

  dailyTargets.cal = Math.round(targetCalories);
  dailyTargets.pro = Math.round(weight * 2.0); // 2g x kg
  dailyTargets.fat = Math.round(weight * 0.9); // 0.9g x kg
  
  let carbKcal = dailyTargets.cal - ((dailyTargets.pro * 4) + (dailyTargets.fat * 9));
  dailyTargets.carb = Math.round(Math.max(carbKcal / 4, 0));

  updateTargetUI();
  showAppCards();
  saveData();
});

function updateTargetUI() {
  document.getElementById('target-val').innerText = `${dailyTargets.cal} kcal`;
  document.getElementById('protein-val').innerText = `${dailyTargets.pro}g`;
  document.getElementById('fat-val').innerText = `${dailyTargets.fat}g`;
  document.getElementById('carb-val').innerText = `${dailyTargets.carb}g`;
  updateProgressBars();
}

function showAppCards() {
  document.getElementById('results-card').classList.remove('hidden');
  document.getElementById('database-card').classList.remove('hidden');
  document.getElementById('tracking-card').classList.remove('hidden');
  document.getElementById('controls-card').classList.remove('hidden');
}

// 2. BUSCADOR API (OPENFOODFACTS)
const searchInput = document.getElementById('api-search');
const resultsList = document.getElementById('api-results');
let searchDebounce;

searchInput.addEventListener('input', (e) => {
  clearTimeout(searchDebounce);
  const query = e.target.value.trim();

  if (query.length < 3) {
    resultsList.innerHTML = '';
    resultsList.classList.add('hidden');
    return;
  }

  searchDebounce = setTimeout(async () => {
    resultsList.innerHTML = '<li>🔍 Buscando...</li>';
    resultsList.classList.remove('hidden');

    try {
      const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`);
      const data = await response.json();
      resultsList.innerHTML = '';

      if (!data.products || data.products.length === 0) {
        resultsList.innerHTML = '<li>No se encontraron resultados.</li>';
        return;
      }

      data.products.forEach(product => {
        const name = product.product_name_es || product.product_name || 'Alimento';
        const kcals = Math.round(product.nutriments['energy-kcal_100g'] || 0);
        const pro = Math.round(product.nutriments['proteins_100g'] || 0);
        const fat = Math.round(product.nutriments['fat_100g'] || 0);
        const carb = Math.round(product.nutriments['carbohydrates_100g'] || 0);

        if (kcals > 0) {
          const li = document.createElement('li');
          li.innerHTML = `<strong>${name}</strong><br><small style="color:#94a3b8">${kcals} kcal | P: ${pro}g | G: ${fat}g | C: ${carb}g (por 100g)</small>`;
          li.onclick = () => {
            const grams = prompt(`¿Cuántos gramos de "${name}" consumiste?`, "100");
            if (grams && !isNaN(grams) && grams > 0) {
              const factor = parseFloat(grams) / 100;
              addFoodEntry(
                `${name} (${grams}g)`,
                Math.round(kcals * factor),
                Math.round(pro * factor),
                Math.round(fat * factor),
                Math.round(carb * factor)
              );
              searchInput.value = '';
              resultsList.classList.add('hidden');
            }
          };
          resultsList.appendChild(li);
        }
      });
    } catch (error) {
      resultsList.innerHTML = '<li>❌ Error de conexión.</li>';
    }
  }, 500);
});

// 3. REGISTRO DIARIO Y UI
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

// 4. PERSISTENCIA Y REINICIO (PWA LOCALSTORAGE)
document.getElementById('btn-reset-day').addEventListener('click', () => {
  if (confirm("¿Seguro que deseas vaciar tu registro de hoy?")) {
    consumed = { cal: 0, pro: 0, fat: 0, carb: 0 };
    foodEntries = [];
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
    updateTargetUI();
    showAppCards();
  }

  // Reseteo automático si es un nuevo día
  if (data.date === new Date().toDateString()) {
    if (data.consumed) consumed = data.consumed;
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
