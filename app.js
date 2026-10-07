let tdee = { cal: 0, pro: 0, fat: 0, car: 0, water: 0 };
let today = { cal: 0, pro: 0, fat: 0, car: 0, water: 0 };
let history = [];
let activeFood = null;

const LOCAL_DB = [
  { name: "Arepa de Maíz (Asada)", macros: { cal: 2.15, pro: 0.05, fat: 0.01, car: 0.46 }, measures: [{l: "1 Gramo", w: 1}, {l: "Arepa Mediana (120g)", w: 120}, {l: "Arepa Grande (180g)", w: 180}] },
  { name: "Pan Canilla", macros: { cal: 2.75, pro: 0.09, fat: 0.02, car: 0.53 }, measures: [{l: "1 Gramo", w: 1}, {l: "Media Canilla (100g)", w: 100}, {l: "Canilla Entera (200g)", w: 200}] },
  { name: "Queso Blanco Llanero Rallado", macros: { cal: 3.50, pro: 0.22, fat: 0.28, car: 0.02 }, measures: [{l: "1 Gramo", w: 1}, {l: "Cucharada (15g)", w: 15}, {l: "Taza (100g)", w: 100}] },
  { name: "Pechuga de Pollo Cocida", macros: { cal: 1.65, pro: 0.31, fat: 0.03, car: 0.00 }, measures: [{l: "1 Gramo", w: 1}, {l: "Filete (150g)", w: 150}, {l: "Taza (125g)", w: 125}] },
  { name: "Arroz Blanco Cocido", macros: { cal: 1.30, pro: 0.02, fat: 0.00, car: 0.28 }, measures: [{l: "1 Gramo", w: 1}, {l: "Media Taza (75g)", w: 75}, {l: "Taza (150g)", w: 150}] },
  { name: "Huevo Entero", macros: { cal: 1.43, pro: 0.13, fat: 0.10, car: 0.01 }, measures: [{l: "1 Gramo", w: 1}, {l: "1 Huevo Grande (50g)", w: 50}] }
];

document.addEventListener('DOMContentLoaded', loadData);

window.setWorkout = function(kcal) {
  document.getElementById('workout-kcal').value = kcal;
};

document.getElementById('tdee-form').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const gender = document.querySelector('input[name="gender"]:checked').value;
  const age = parseFloat(document.getElementById('age').value);
  const weight = parseFloat(document.getElementById('weight').value);
  const height = parseFloat(document.getElementById('height').value);
  const steps = parseFloat(document.getElementById('steps').value);
  const workout = parseFloat(document.getElementById('workout-kcal').value);
  const deficit = parseFloat(document.getElementById('deficit').value) / 100;

  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  bmr += (gender === 'M') ? 5 : -161;

  const maintenance = bmr + (steps * 0.04) + workout;
  const targetCals = maintenance - (maintenance * deficit);

  tdee.cal = Math.round(targetCals);
  tdee.pro = Math.round(weight * 2.2); 
  tdee.fat = Math.round(weight * 0.9);
  tdee.car = Math.round((tdee.cal - (tdee.pro * 4) - (tdee.fat * 9)) / 4);
  tdee.water = Math.round(weight * 35);

  document.getElementById('app-content').classList.remove('hidden');
  updateUI();
  saveData();
});

window.addWater = function(amount) {
  today.water += amount;
  if(today.water < 0) today.water = 0;
  updateUI();
  saveData();
};

const searchInput = document.getElementById('search-input');
const resultsList = document.getElementById('search-results');
const portionBox = document.getElementById('portion-calculator');
const measureSelect = document.getElementById('preview-measure');
const qtyInput = document.getElementById('preview-qty');
let debounceTimer;

searchInput.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  portionBox.classList.add('hidden');
  const query = e.target.value.toLowerCase().trim();
  
  if (query.length < 2) { resultsList.classList.add('hidden'); return; }

  debounceTimer = setTimeout(async () => {
    resultsList.innerHTML = '<li style="text-align:center; color:#94a3b8;">Buscando...</li>';
    resultsList.classList.remove('hidden');
    let results = [];

    LOCAL_DB.forEach(item => {
      if (item.name.toLowerCase().includes(query)) results.push({...item, source: '🏠 Local'});
    });

    try {
      const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=5`);
      const data = await res.json();
      data.products.forEach(p => {
        const name = p.product_name_es || p.product_name;
        const cal = (p.nutriments['energy-kcal_100g'] || 0) / 100;
        if (name && cal > 0) {
          let measures = [{l: "1 Gramo", w: 1}];
          if(p.serving_quantity) measures.push({l: `Porción (${p.serving_quantity}g)`, w: parseFloat(p.serving_quantity)});
          measures.push({l: "Porción (50g)", w: 50}, {l: "Taza/Plato (150g)", w: 150});
          
          results.push({
            name: name,
            macros: { cal, pro: (p.nutriments.proteins_100g||0)/100, fat: (p.nutriments.fat_100g||0)/100, car: (p.nutriments.carbohydrates_100g||0)/100 },
            measures: measures, source: '🌐 API'
          });
        }
      });
    } catch(e) {}

    resultsList.innerHTML = '';
    if(results.length === 0) { resultsList.innerHTML = '<li>No encontrado</li>'; return; }

    results.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${item.name}</span> <span style="font-size:10px; color:#94a3b8;">${item.source}</span>`;
      li.onclick = () => selectFood(item);
      resultsList.appendChild(li);
    });
  }, 400);
});

function selectFood(food) {
  activeFood = food;
  searchInput.value = '';
  resultsList.classList.add('hidden');
  document.getElementById('preview-name').innerText = food.name;
  
  measureSelect.innerHTML = '';
  food.measures.forEach(m => {
    measureSelect.innerHTML += `<option value="${m.w}">${m.l}</option>`;
  });
  qtyInput.value = 1;
  
  if(food.measures.length > 1) measureSelect.selectedIndex = 1;
  
  portionBox.classList.remove('hidden');
  calcPreview();
}

measureSelect.addEventListener('change', calcPreview);
qtyInput.addEventListener('input', calcPreview);

function calcPreview() {
  if(!activeFood) return;
  const totalGrams = parseFloat(measureSelect.value) * parseFloat(qtyInput.value);
  document.getElementById('pm-weight').innerText = totalGrams.toFixed(1);
  document.getElementById('pm-cal').innerText = Math.round(activeFood.macros.cal * totalGrams);
  document.getElementById('pm-pro').innerText = Math.round(activeFood.macros.pro * totalGrams) + 'g';
  document.getElementById('pm-fat').innerText = Math.round(activeFood.macros.fat * totalGrams) + 'g';
  document.getElementById('pm-car').innerText = Math.round(activeFood.macros.car * totalGrams) + 'g';
}

document.getElementById('btn-add-food').addEventListener('click', () => {
  if(!activeFood) return;
  const totalGrams = parseFloat(measureSelect.value) * parseFloat(qtyInput.value);
  if(totalGrams <= 0) return;

  const entry = {
    id: Date.now(),
    name: `${activeFood.name} (${totalGrams.toFixed(0)}g)`,
    cal: Math.round(activeFood.macros.cal * totalGrams),
    pro: Math.round(activeFood.macros.pro * totalGrams),
    fat: Math.round(activeFood.macros.fat * totalGrams),
    car: Math.round(activeFood.macros.car * totalGrams)
  };

  history.push(entry);
  today.cal += entry.cal; today.pro += entry.pro; today.fat += entry.fat; today.car += entry.car;
  
  portionBox.classList.add('hidden');
  updateUI();
  saveData();
});

window.deleteEntry = function(id) {
  const idx = history.findIndex(x => x.id === id);
  if(idx > -1) {
    today.cal -= history[idx].cal; today.pro -= history[idx].pro; 
    today.fat -= history[idx].fat; today.car -= history[idx].car;
    history.splice(idx, 1);
    updateUI();
    saveData();
  }
};

window.resetDay = function() {
  if(confirm("¿Vaciar todo lo consumido hoy?")) {
    today = { cal: 0, pro: 0, fat: 0, car: 0, water: 0 };
    history = [];
    updateUI();
    saveData();
  }
};

function updateUI() {
  const setProg = (idTxt, idBar, current, max) => {
    document.getElementById(idTxt).innerText = `${Math.round(current)}/${max}`;
    const percent = max > 0 ? (current / max) * 100 : 0;
    const bar = document.getElementById(idBar);
    bar.style.width = `${Math.min(percent, 100)}%`;
    percent > 100 ? bar.classList.add('danger') : bar.classList.remove('danger');
  };

  setProg('txt-cal', 'bar-cal', today.cal, tdee.cal);
  setProg('txt-pro', 'bar-pro', today.pro, tdee.pro);
  setProg('txt-fat', 'bar-fat', today.fat, tdee.fat);
  setProg('txt-car', 'bar-car', today.car, tdee.car);

  document.getElementById('water-current').innerText = today.water;
  document.getElementById('water-max').innerText = tdee.water;
  let wPercent = tdee.water > 0 ? (today.water / tdee.water) * 100 : 0;
  document.getElementById('bar-water').style.width = `${Math.min(wPercent, 100)}%`;

  const list = document.getElementById('food-list');
  list.innerHTML = '';
  history.forEach(item => {
    list.innerHTML += `
      <li>
        <div>
          <span class="food-name">${item.name}</span>
          <span class="food-macs">${item.cal} kcal | P:${item.pro}g | G:${item.fat}g | C:${item.car}g</span>
        </div>
        <button class="btn-del" onclick="deleteEntry(${item.id})">✕</button>
      </li>`;
  });
}

function saveData() {
  localStorage.setItem('macro_data_v4', JSON.stringify({ date: new Date().toDateString(), tdee, today, history }));
}

function loadData() {
  const saved = localStorage.getItem('macro_data_v4');
  if(!saved) return;
  const data = JSON.parse(saved);
  
  if(data.tdee && data.tdee.cal > 0) {
    tdee = data.tdee;
    document.getElementById('app-content').classList.remove('hidden');
  }
  
  if(data.date === new Date().toDateString()) {
    if(data.today) today = data.today;
    if(data.history) history = data.history;
  } else {
    saveData(); 
  }
  updateUI();
}
