// Variables globales para guardar las metas y lo consumido en el día
let dailyTargets = { cal: 0, pro: 0, fat: 0, carb: 0 };
let consumed = { cal: 0, pro: 0, fat: 0, carb: 0 };

// --- 1. LÓGICA DE LA CALCULADORA TDEE ---
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

  // Guardar metas en la variable global
  dailyTargets.cal = Math.round(targetCalories);
  dailyTargets.pro = Math.round(proteinGrams);
  dailyTargets.fat = Math.round(fatGrams);
  dailyTargets.carb = Math.round(carbGrams);

  // Actualizar UI del Módulo 1
  document.getElementById('bmr-val').innerText = `${Math.round(bmr)} kcal`;
  document.getElementById('tdee-val').innerText = `${Math.round(totalTDEE)} kcal`;
  document.getElementById('target-val').innerText = `${dailyTargets.cal} kcal`;
  
  document.getElementById('protein-val').innerText = `${dailyTargets.pro}g`;
  document.getElementById('protein-kcal').innerText = `${Math.round(proteinGrams * 4)} kcal`;
  document.getElementById('fat-val').innerText = `${dailyTargets.fat}g`;
  document.getElementById('fat-kcal').innerText = `${Math.round(fatGrams * 9)} kcal`;
  document.getElementById('carb-val').innerText = `${dailyTargets.carb}g`;
  document.getElementById('carb-kcal').innerText = `${Math.round(carbKcal)} kcal`;

  // Mostrar tarjetas
  document.getElementById('results-card').classList.remove('hidden');
  document.getElementById('tracking-card').classList.remove('hidden');

  // Actualizar barras por si el usuario cambia el peso/meta a mitad de día
  updateProgressUI();
});

// --- 2. LÓGICA DEL REGISTRO DE COMIDAS ---
document.getElementById('food-form').addEventListener('submit', function(e) {
  e.preventDefault();

  // Capturar datos del alimento
  const name = document.getElementById('food-name').value;
  const cal = parseFloat(document.getElementById('food-cal').value);
  const pro = parseFloat(document.getElementById('food-pro').value);
  const fat = parseFloat(document.getElementById('food-fat').value);
  const carb = parseFloat(document.getElementById('food-carb').value);

  // Sumar a lo consumido
  consumed.cal += cal;
  consumed.pro += pro;
  consumed.fat += fat;
  consumed.carb += carb;

  // Crear elemento en la lista
  const li = document.createElement('li');
  li.innerHTML = `
    <span class="food-title">${name}</span>
    <span class="food-details">${cal} kcal | P: ${pro}g | G: ${fat}g | C: ${carb}g</span>
  `;
  document.getElementById('food-list').appendChild(li);

  // Limpiar formulario
  e.target.reset();

  // Actualizar barras visuales
  updateProgressUI();
});

// --- 3. FUNCIÓN PARA ACTUALIZAR BARRAS DE PROGRESO ---
function updateProgressUI() {
  // Función auxiliar para calcular porcentaje y actualizar ancho de barra
  const updateBar = (idBar, idText, current, target) => {
    const textEl = document.getElementById(idText);
    const barEl = document.getElementById(idBar);
    
    textEl.innerText = `${Math.round(current)} / ${target}`;
    
    let percent = target > 0 ? (current / target) * 100 : 0;
    
    // Si se pasa del 100%, poner la barra roja
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