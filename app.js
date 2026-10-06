// BASE DE DATOS LOCAL DE RESGUARDO (Por si la API falla o está bloqueada)
const LOCAL_FOOD_DATABASE = [
  { name: "Pechuga de pollo (cocida)", kcals: 165, pro: 31, fat: 3.6, carb: 0 },
  { name: "Arroz blanco (cocido)", kcals: 130, pro: 2.7, fat: 0.3, carb: 28 },
  { name: "Huevo entero", kcals: 155, pro: 13, fat: 11, carb: 1.1 },
  { name: "Avena en hojuelas", kcals: 389, pro: 16.9, fat: 6.9, carb: 66 },
  { name: "Carne de res magra", kcals: 250, pro: 26, fat: 15, carb: 0 },
  { name: "Queso Guayanés / Paisa", kcals: 290, pro: 18, fat: 22, carb: 2 },
  { name: "Arepa de maíz (asada)", kcals: 215, pro: 4.5, fat: 1.5, carb: 45 },
  { name: "Plátano maduro (hervido/asado)", kcals: 116, pro: 1.2, fat: 0.3, carb: 28 },
  { name: "Papa cocida", kcals: 87, pro: 1.9, fat: 0.1, carb: 20 },
  { name: "Atún en lata (en agua)", kcals: 116, pro: 26, fat: 1, carb: 0 },
  { name: "Pasta cocida", kcals: 158, pro: 5.8, fat: 0.9, carb: 31 },
  { name: "Pan de molde integral", kcals: 247, pro: 9, fat: 3.5, carb: 41 },
  { name: "Mantequilla de maní", kcals: 588, pro: 25, fat: 50, carb: 20 },
  { name: "Leche descremada", kcals: 35, pro: 3.4, fat: 0.2, carb: 5 },
  { name: "Yogurt griego natural", kcals: 97, pro: 10, fat: 4, carb: 4 },
  { name: "Frijoles / Caraotas negras (cocidas)", kcals: 132, pro: 8.9, fat: 0.5, carb: 23 }
];

// BUSCADOR HÍBRIDO (API + LOCAL)
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

    // 1. Intentar buscar primero en la API online
    try {
      const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8`, {
        signal: AbortSignal.timeout(4000) // Timeout de 4 segundos para no quedarse colgado
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
      console.warn("API no disponible, usando base de datos local...");
    }

    // 2. Si la API falló o no dio resultados, buscar en la base de datos local
    if (foundProducts.length === 0) {
      const filteredLocal = LOCAL_FOOD_DATABASE.filter(item => item.name.toLowerCase().includes(query));
      filteredLocal.forEach(item => {
        foundProducts.push({ ...item, source: 'local' });
      });
    }

    resultsList.innerHTML = '';

    if (foundProducts.length === 0) {
      resultsList.innerHTML = '<li>No se encontró el alimento. Prueba con otro término.</li>';
      return;
    }

    // Renderizar resultados
    foundProducts.forEach(product => {
      const li = document.createElement('li');
      const badge = product.source === 'local' ? ' 🏠' : ' 🌐';
      li.innerHTML = `<strong>${product.name}</strong>${badge}<br><small style="color:#94a3b8">${product.kcals} kcal | P: ${product.pro}g | G: ${product.fat}g | C: ${product.carb}g (por 100g)</small>`;
      
      li.onclick = () => {
        const grams = prompt(`¿Cuántos gramos de "${product.name}" consumiste?`, "100");
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
