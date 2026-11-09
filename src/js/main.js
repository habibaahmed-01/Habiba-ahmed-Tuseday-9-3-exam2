const API_URL = "https://nutriplan-api.vercel.app/api";

const recipesContainer = document.getElementById("recipes-container");
const recipesCount = document.getElementById("recipes-count");
const categoriesContainer = document.getElementById("meal-categories");
const gridViewBtn = document.getElementById("grid-view");
const listViewBtn = document.getElementById("list-view");
const searchRecipesInput = document.getElementById("search-recipes");
const searchInput = document.getElementById("search-input");
const viewAllRecipesBtn = document.getElementById("view-all-recipes");
const viewAllCategoriesBtn = document.getElementById("view-all-categories");

let currentMeals = [];
let allMeals = [];
let isListView = false;
let showAllRecipes = false;
let selectedCategory = "all";
let selectedArea = "all";
let mealServings = 1;

const FOOD_LOG_KEY = "foodLog";

const FOOD_GOALS = {
  calories: 2000,
  protein: 50,
  carbs: 250,
  fat: 65
};

const DEFAULT_NUTRITION = {
  calories: 732,
  protein: 30,
  carbs: 78,
  fat: 48
};


let cuisinesContainer = document.getElementById("meal-cuisines");

if (!cuisinesContainer) {
  cuisinesContainer = document.createElement("div");
  cuisinesContainer.id = "meal-cuisines";
  cuisinesContainer.className = "meal-cuisines";

  searchRecipesInput?.parentElement?.after(cuisinesContainer);
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function getFoodLog() {
  try {
    const data = JSON.parse(localStorage.getItem(FOOD_LOG_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveFoodLog(data) {
  localStorage.setItem(FOOD_LOG_KEY, JSON.stringify(data));
}

function getTodayDate() {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getTodayItems() {
  return getFoodLog().filter(item => item.date === getTodayDate());
}

function calculateTotals(items) {
  return items.reduce((total, item) => {
    total.calories += Number(item.calories) || 0;
    total.protein += Number(item.protein) || 0;
    total.carbs += Number(item.carbs) || 0;
    total.fat += Number(item.fat) || 0;

    return total;
  }, {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });
}

async function getMealCategories() {
  try {
    const response = await fetch(`${API_URL}/meals/categories`);

    if (!response.ok) {
      throw new Error("Failed to fetch categories");
    }

    const data = await response.json();

    displayMealCategories(data.results || []);

  } catch (error) {
    console.error("Categories Error:", error);
  }
}


function displayMealCategories(categories) {
  if (!categoriesContainer) return;

  const categoryStyles = {
    Beef: ["#fff1f2", "#ff375f", "fa-drumstick-bite"],
    Chicken: ["#fff7ed", "#ff9500", "fa-utensils"],
    Dessert: ["#fdf2f8", "#ff2d75", "fa-cake-candles"],
    Lamb: ["#fff7ed", "#ff9500", "fa-bacon"],
    Miscellaneous: ["#f8fafc", "#8494ad", "fa-bowl-food"],
    Pasta: ["#fffbeb", "#ffb000", "fa-bowl-spoon"],
    Pork: ["#fff1f2", "#ff375f", "fa-bacon"],
    Seafood: ["#eff6ff", "#00bfff", "fa-fish"],
    Side: ["#ecfdf5", "#00c985", "fa-leaf"],
    Starter: ["#ecfeff", "#00c5c7", "fa-seedling"],
    Vegan: ["#ecfdf5", "#00c985", "fa-carrot"],
    Vegetarian: ["#f0fdf4", "#65d900", "fa-leaf"]
  };

  categoriesContainer.innerHTML = categories
    .filter(category => categoryStyles[category.name])
    .map(category => {
      const [background, color, icon] = categoryStyles[category.name];

      return `
        <button
          type="button"
          data-category="${escapeHTML(category.name)}"
          class="category-btn"
          style="background:${background};border-color:${color}">

          <span class="category-icon" style="background:${color}">
            <i class="fa-solid ${icon}"></i>
          </span>

          <span>${escapeHTML(category.name)}</span>
        </button>
      `;
    })
    .join("");
}


async function getCuisines() {
  try {
    const response = await fetch(`${API_URL}/meals/areas`);

    if (!response.ok) {
      throw new Error("Failed to fetch cuisines");
    }

    const data = await response.json();

    displayCuisines(data.results || []);

  } catch (error) {
    console.error("Cuisines Error:", error);
  }
}


function displayCuisines(cuisines) {
  if (!cuisinesContainer) return;

  const allButton = `
    <button type="button" data-area="all" class="cuisine-btn active">
      All Cuisines
    </button>
  `;

  const cuisinesButtons = cuisines.slice(0, 10).map(cuisine => {
    const name = cuisine.name || cuisine;

    return `
      <button
        type="button"
        data-area="${escapeHTML(name)}"
        class="cuisine-btn">
        ${escapeHTML(name)}
      </button>
    `;
  }).join("");

  cuisinesContainer.innerHTML = allButton + cuisinesButtons;
}


async function fetchCategoryMeals(category, limit = 12) {
  const response = await fetch(
    `${API_URL}/meals/filter?category=${encodeURIComponent(category)}&limit=${limit}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch ${category}`);
  }

  return response.json();
}

async function getAllRecipes() {
  if (!recipesContainer) return;

  recipesContainer.innerHTML = `
    <p class="loading-recipes">Loading recipes...</p>
  `;

  try {
    const responses = await Promise.all([
      fetchCategoryMeals("Beef", 12),
      fetchCategoryMeals("Chicken", 12),
      fetchCategoryMeals("Seafood", 12),
      fetchCategoryMeals("Vegetarian", 12)
    ]);

    allMeals = [
      ...new Map(
        responses.flatMap(data => data.results || [])
          .map(meal => [meal.id, meal])
      ).values()
    ];

    selectedCategory = "all";
    selectedArea = "all";

    displayMeals([...allMeals]);

  } catch (error) {
    console.error("Recipes Error:", error);

    recipesContainer.innerHTML = `
      <p class="loading-recipes">Failed to load recipes</p>
    `;
  }
}

function displayMeals(meals) {
  if (!recipesContainer) return;

  currentMeals = meals;

  if (recipesCount) {
    recipesCount.textContent = `Showing ${meals.length} recipes`;
  }

  recipesContainer.className = isListView
    ? "recipes-list"
    : "recipes-grid";

  if (meals.length === 0) {
    recipesContainer.innerHTML = `
      <div class="empty-recipes">
        <i class="fa-solid fa-utensils"></i>
        <p>No recipes found</p>
      </div>
    `;
    return;
  }

  recipesContainer.innerHTML = meals.map(meal => `
    <div
      class="recipe-card ${isListView ? "list-card" : ""}"
      data-meal-id="${escapeHTML(meal.id)}">

      <div class="recipe-image">
        <img
          src="${escapeHTML(meal.thumbnail || "")}"
          alt="${escapeHTML(meal.name || "Recipe")}"
          loading="lazy">

        <div class="recipe-badges">
          <span>
            <i class="fa-solid fa-tag"></i>
            ${escapeHTML(meal.category || "Meal")}
          </span>

          <span>
            <i class="fa-solid fa-globe"></i>
            ${escapeHTML(meal.area || "International")}
          </span>
        </div>
      </div>

      <div class="recipe-content">
        <h3>${escapeHTML(meal.name || "Untitled recipe")}</h3>

        <div class="recipe-info">
          <span>
            <i class="fa-solid fa-tag"></i>
            ${escapeHTML(meal.category || "Meal")}
          </span>

          <span>
            <i class="fa-solid fa-globe"></i>
            ${escapeHTML(meal.area || "International")}
          </span>
        </div>
      </div>
    </div>
  `).join("");

  recipesContainer.querySelectorAll(".recipe-card").forEach(card => {
    card.addEventListener("click", () => {
      showMealDetails(card.dataset.mealId);
    });
  });
}

async function getMealsByCategory(category) {
  try {
    selectedCategory = category;
    selectedArea = "all";

    recipesContainer.innerHTML = `
      <p class="loading-recipes">
        Loading ${escapeHTML(category)} recipes...
      </p>
    `;

    const data = await fetchCategoryMeals(category, 48);

    allMeals = data.results || [];

    displayMeals(allMeals);

  } catch (error) {
    console.error("Category Meals Error:", error);
  }
}


async function getMealsByArea(area) {
  try {
    selectedArea = area;
    selectedCategory = "all";

    if (area === "all") {
      await getAllRecipes();
      return;
    }

    recipesContainer.innerHTML = `
      <p class="loading-recipes">
        Loading ${escapeHTML(area)} recipes...
      </p>
    `;

    const response = await fetch(
      `${API_URL}/meals/filter?area=${encodeURIComponent(area)}&limit=100`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch area meals");
    }

    const data = await response.json();

    let meals = data.results || data.meals || [];

    if (meals.length === 0) {
      const fallback = await fetch(
        `${API_URL}/meals/search?s=${encodeURIComponent(area)}`
      );

      const fallbackData = await fallback.json();

      meals = fallbackData.results || fallbackData.meals || [];
    }

    allMeals = meals;

    displayMeals(meals);

  } catch (error) {
    console.error("Area Meals Error:", error);

    recipesContainer.innerHTML = `
      <p class="loading-recipes">
        Couldn't load recipes for ${escapeHTML(area)}
      </p>
    `;
  }
}


categoriesContainer?.addEventListener("click", event => {
  const button = event.target.closest(".category-btn");

  if (button) {
    getMealsByCategory(button.dataset.category);
  }
});


cuisinesContainer?.addEventListener("click", event => {
  const button = event.target.closest(".cuisine-btn");

  if (!button) return;

  cuisinesContainer.querySelectorAll(".cuisine-btn")
    .forEach(btn => btn.classList.remove("active"));

  button.classList.add("active");

  getMealsByArea(button.dataset.area);
});


gridViewBtn?.addEventListener("click", () => {
  isListView = false;

  displayMeals(currentMeals);

  gridViewBtn.classList.add("active");
  listViewBtn?.classList.remove("active");
});


listViewBtn?.addEventListener("click", () => {
  isListView = true;

  displayMeals(currentMeals);

  listViewBtn.classList.add("active");
  gridViewBtn?.classList.remove("active");
});


function searchMeals(value) {
  const searchValue = value.toLowerCase().trim();

  const filteredMeals = allMeals.filter(meal =>
    (meal.name || "").toLowerCase().includes(searchValue)
  );

  displayMeals(filteredMeals);
}

searchRecipesInput?.addEventListener("input", function () {
  searchMeals(this.value);
});

searchInput?.addEventListener("input", function () {
  if (searchRecipesInput) {
    searchRecipesInput.value = this.value;
  }

  searchMeals(this.value);
});

viewAllRecipesBtn?.addEventListener("click", async function () {
  if (!showAllRecipes) {
    showAllRecipes = true;

    try {
      const categories = [
        "Beef",
        "Chicken",
        "Seafood",
        "Vegetarian",
        "Dessert",
        "Pasta",
        "Miscellaneous"
      ];

      const responses = await Promise.all(
        categories.map(category => fetchCategoryMeals(category, 12))
      );

      allMeals = [
        ...new Map(
          responses.flatMap(data => data.results || [])
            .map(meal => [meal.id, meal])
        ).values()
      ];

      displayMeals(allMeals);

      this.innerHTML = `
        Show Less
        <i class="fa-solid fa-chevron-up ml-2"></i>
      `;

    } catch (error) {
      console.error("View All Error:", error);
    }

  } else {
    showAllRecipes = false;

    await getAllRecipes();

    this.innerHTML = `
      View All Recipes
      <i class="fa-solid fa-chevron-right ml-2"></i>
    `;
  }
});


viewAllCategoriesBtn?.addEventListener("click", () => {
  categoriesContainer?.classList.toggle("show-all-categories");
});

getMealCategories();
getCuisines();
getAllRecipes();


const loadingOverlay = document.getElementById("app-loading-overlay");

if (loadingOverlay) {
  loadingOverlay.style.display = "flex";
  loadingOverlay.classList.remove("opacity-0");

  window.addEventListener("load", () => {
    setTimeout(() => {
      loadingOverlay.classList.add("opacity-0");

      setTimeout(() => {
        loadingOverlay.style.display = "none";
      }, 500);

    }, 800);
  });
}

async function showMealDetails(mealId) {
  try {
    [
      "search-filters-section",
      "meal-categories-section",
      "all-recipes-section"
    ].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.style.display = "none";
    });

    const detailsSection = document.getElementById("meal-details");

    if (detailsSection) {
      detailsSection.style.display = "block";
    }

    window.scrollTo({ top: 0, behavior: "smooth" });

    const nameElement = document.getElementById("meal-detail-name");

    if (nameElement) {
      nameElement.textContent = "Loading...";
    }

    const response = await fetch(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(mealId)}`
    );

    if (!response.ok) {
      throw new Error("Failed to load meal details");
    }

    const data = await response.json();

    if (!data.meals?.length) {
      throw new Error("Meal not found");
    }

    const meal = data.meals[0];

    document.getElementById("meal-detail-image").src = meal.strMealThumb;
    document.getElementById("meal-detail-name").textContent = meal.strMeal;

    document.getElementById("meal-detail-badges").innerHTML = `
      <span class="bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
        ${escapeHTML(meal.strCategory || "Meal")}
      </span>

      <span class="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
        ${escapeHTML(meal.strArea || "International")}
      </span>
    `;

    document.getElementById("hero-servings").textContent = "30 min";
    document.getElementById("hero-calories").textContent = "Recipe";


    let ingredientsHTML = "";
    let ingredientsCount = 0;

    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];

      if (ingredient?.trim()) {
        ingredientsCount++;

        ingredientsHTML += `
          <label class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors">
            <input
              type="checkbox"
              class="ingredient-checkbox w-5 h-5 text-emerald-600 rounded border-gray-300">

            <span class="text-gray-700">
              <span class="font-medium text-gray-900">
                ${escapeHTML(measure || "")}
              </span>
              ${escapeHTML(ingredient)}
            </span>
          </label>
        `;
      }
    }

    document.getElementById("meal-detail-ingredients").innerHTML =
      ingredientsHTML;

    document.getElementById("ingredients-count").textContent =
      `${ingredientsCount} items`;

    const instructions = (meal.strInstructions || "")
      .split(/\r?\n/)
      .filter(step => step.trim());

    document.getElementById("meal-detail-instructions").innerHTML =
      instructions.map((step, index) => `
        <div class="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
          <div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
            ${index + 1}
          </div>

          <p class="text-gray-700 leading-relaxed pt-2">
            ${escapeHTML(step)}
          </p>
        </div>
      `).join("");

    const videoSection = document.getElementById("meal-video-section");
    const video = document.getElementById("meal-detail-video");

    if (meal.strYoutube && video && videoSection) {
      const videoId = meal.strYoutube.split("v=")[1]?.split("&")[0];

      video.src = videoId
        ? `https://www.youtube.com/embed/${videoId}`
        : "";

      videoSection.style.display = videoId ? "block" : "none";

    } else if (video && videoSection) {
      video.src = "";
      videoSection.style.display = "none";
    }

    displayNutritionFacts({
      calories: 2152,
      protein: 111,
      carbs: 201,
      fat: 132,
      fiber: 75,
      sugar: 19,
      saturatedFat: 42,
      cholesterol: 370,
      sodium: 1066
    });

    const logButton = document.getElementById("log-meal-btn");

    if (logButton) {
      logButton.dataset.mealId = meal.idMeal;
      logButton.dataset.mealName = meal.strMeal;
      logButton.dataset.mealImage = meal.strMealThumb;
    }

  } catch (error) {
    console.error("Recipe details error:", error);
    alert("Unable to load recipe details.");
  }
}

function openLogMealModal() {
  const button = document.getElementById("log-meal-btn");

  if (!button?.dataset.mealId) {
    if (window.Swal) {
      Swal.fire(
        "Choose a recipe first",
        "Open a recipe before logging it.",
        "info"
      );
    } else {
      alert("Open a recipe before logging it.");
    }

    return;
  }

  mealServings = 1;

  const servingsInput = document.getElementById("meal-servings");

  if (servingsInput) {
    servingsInput.value = 1;
  }

  const nameElement = document.getElementById("log-meal-name");
  const imageElement = document.getElementById("log-meal-image");

  if (nameElement) {
    nameElement.textContent = button.dataset.mealName || "Recipe";
  }

  if (imageElement) {
    imageElement.src = button.dataset.mealImage || "";
  }

  updateMealNutrition();

  const modal = document.getElementById("log-meal-modal");

  if (modal) {
    modal.style.display = "flex";
  }
}

function closeLogMealModal() {
  const modal = document.getElementById("log-meal-modal");

  if (modal) {
    modal.style.display = "none";
  }
}

function updateMealNutrition() {
  const input = document.getElementById("meal-servings");

  if (!input) return;

  mealServings = Math.max(1, Math.min(99, Number(input.value) || 1));

  input.value = mealServings;

  const values = {
    "log-calories": DEFAULT_NUTRITION.calories * mealServings,
    "log-protein": `${DEFAULT_NUTRITION.protein * mealServings}g`,
    "log-carbs": `${DEFAULT_NUTRITION.carbs * mealServings}g`,
    "log-fat": `${DEFAULT_NUTRITION.fat * mealServings}g`
  };

  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  });
}

function logMeal() {
  const button = document.getElementById("log-meal-btn");

  const servings = Math.max(
    1,
    Math.min(
      99,
      Number(document.getElementById("meal-servings")?.value) || 1
    )
  );

  if (!button?.dataset.mealId) {
    Swal.fire({
      icon: "warning",
      title: "Oops!",
      text: "Please select a recipe first."
    });
    return;
  }

  const meal = {
    id: Date.now(),
    mealId: button.dataset.mealId,
    name: button.dataset.mealName || "Recipe",
    image: button.dataset.mealImage || "",
    servings: servings,
    calories: DEFAULT_NUTRITION.calories * servings,
    protein: DEFAULT_NUTRITION.protein * servings,
    carbs: DEFAULT_NUTRITION.carbs * servings,
    fat: DEFAULT_NUTRITION.fat * servings,
    date: getTodayDate(),
    type: "meal"
  };

  try {
    const foodLog = getFoodLog();

    foodLog.push(meal);

    saveFoodLog(foodLog);

    closeLogMealModal();

    renderFoodLog();

    Swal.fire({
      icon: "success",
      width: "350px",
      html: `
    <div ">
      <strong>${escapeHTML(meal.name)}</strong>
      (${servings} serving${servings > 1 ? "s" : ""})
      has been added to your daily log.
    </div>

    <div style="font-size:18px; font-weight:bold; color:#059669;">
      +${meal.calories} calories
    </div>
  `,
      showConfirmButton: false,
      timer: 2500
    });

  } catch (error) {
    console.error("Log Meal Error:", error);

    Swal.fire({
      icon: "error",
      title: "Oops!",
      text: "Something went wrong while logging your meal."
    });
  }
}

document.getElementById("log-meal-btn")
  ?.addEventListener("click", openLogMealModal);

document.getElementById("cancel-log-meal")
  ?.addEventListener("click", closeLogMealModal);

document.getElementById("confirm-log-meal")
  ?.addEventListener("click", logMeal);

document.getElementById("decrease-servings")
  ?.addEventListener("click", () => {
    const input = document.getElementById("meal-servings");

    if (input) {
      input.value = Math.max(1, Number(input.value) - 1);
      updateMealNutrition();
    }
  });

document.getElementById("increase-servings")
  ?.addEventListener("click", () => {
    const input = document.getElementById("meal-servings");

    if (input) {
      input.value = Math.min(99, Number(input.value) + 1);
      updateMealNutrition();
    }
  });

document.getElementById("meal-servings")
  ?.addEventListener("input", updateMealNutrition);

function renderFoodLog() {
  const section = document.getElementById("foodlog-section");

  if (!section) return;

  const items = getTodayItems();
  const totals = calculateTotals(items);

  const dateElement = document.getElementById("foodlog-date");

  if (dateElement) {
    dateElement.textContent = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  const cards = section.querySelectorAll(
    "#foodlog-today-section .grid > div"
  );

  const progressData = [
    [totals.calories, FOOD_GOALS.calories, "kcal", "bg-emerald-500"],
    [totals.protein, FOOD_GOALS.protein, "g", "bg-blue-500"],
    [totals.carbs, FOOD_GOALS.carbs, "g", "bg-amber-500"],
    [totals.fat, FOOD_GOALS.fat, "g", "bg-purple-500"]
  ];

  cards.forEach((card, index) => {
    if (!progressData[index]) return;

    const [value, goal, unit, color] = progressData[index];

    const valueElement = card.querySelector("span:last-child");
    const bar = card.querySelector(".h-2\\.5 > div");

    if (valueElement) {
      valueElement.textContent = `${Math.round(value)} / ${goal} ${unit}`;
    }

    if (bar) {
      const percentage = Math.min(100, (value / goal) * 100);

      bar.style.width = `${percentage}%`;
      bar.className = `${color} h-2.5 rounded-full transition-all`;
    }
  });


  const title = section.querySelector("#foodlog-today-section h4");

  if (title) {
    title.textContent = `Logged Items (${items.length})`;
  }

  const clearButton = document.getElementById("clear-foodlog");

  if (clearButton) {
    clearButton.style.display = items.length ? "inline-flex" : "none";
  }

  const list = document.getElementById("logged-items-list");

  if (!list) return;

  if (!items.length) {
    list.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fa-solid fa-utensils text-4xl mb-3 text-gray-300"></i>
        <p class="font-medium">No meals logged today</p>
        <p class="text-sm">Add meals from the Meals page or scan products</p>
      </div>
    `;
  } else {
    list.innerHTML = items.slice().reverse().map(item => `
      <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border">
        <img
          src="${escapeHTML(item.image || "")}"
          class="w-14 h-14 rounded-lg object-cover bg-gray-200"
          onerror="this.style.display='none'"
          alt="">

        <div class="flex-1 min-w-0">
          <p class="font-semibold text-gray-900 truncate">
            ${escapeHTML(item.name)}
          </p>

          <p class="text-xs text-gray-500">
            ${item.servings || 1} serving${item.servings > 1 ? "s" : ""}
          </p>

          <p class="text-sm text-emerald-600 font-semibold">
            ${Math.round(item.calories)} kcal
          </p>
        </div>

        <button
          class="remove-food-item text-red-500 p-2"
          data-id="${item.id}"
          title="Remove">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `).join("");
  }

  renderWeeklyChart();
}

document.getElementById("logged-items-list")
  ?.addEventListener("click", event => {
    const button = event.target.closest(".remove-food-item");

    if (!button) return;

    const id = Number(button.dataset.id);

    saveFoodLog(getFoodLog().filter(item => item.id !== id));

    renderFoodLog();
  });

document.getElementById("clear-foodlog")
  ?.addEventListener("click", () => {
    const clear = () => {
      saveFoodLog(getFoodLog().filter(item => item.date !== getTodayDate()));
      renderFoodLog();
    };

    if (!window.Swal) {
      if (confirm("Clear today's food log?")) clear();
      return;
    }

    Swal.fire({
      icon: "warning",
      title: "Clear today's food log?",
      showCancelButton: true,
      confirmButtonText: "Clear All",
      confirmButtonColor: "#dc2626"
    }).then(result => {
      if (result.isConfirmed) {
        clear();
        Swal.fire("Cleared!", "Today's log has been cleared.", "success");
      }
    });
  });

function renderWeeklyChart() {

  const container = document.getElementById("weekly-overview-days");

  if (!container) return;

  const foodLog = getFoodLog();

  const days = [];

  for (let i = 6; i >= 0; i--) {

    const date = new Date();

    date.setDate(date.getDate() - i);

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    const dayItems = foodLog.filter(item => item.date === key);

    const totals = calculateTotals(dayItems);

    days.push({
      date: date,
      key: key,
      name: date.toLocaleDateString("en-US", {
        weekday: "short"
      }),
      dayNumber: date.getDate(),
      calories: Math.round(totals.calories),
      items: dayItems.length
    });
  }

  const today = getTodayDate();

  container.innerHTML = days.map(day => {

    const isToday = day.key === today;

    return `
      <div class="
        rounded-xl p-3 text-center transition-all
        ${isToday ? "bg-indigo-100" : "bg-white hover:bg-gray-50"}
      ">

        <p class="text-xs text-gray-500 mb-1">
          ${day.name}
        </p>

        <p class="text-sm font-semibold text-gray-900 mb-3">
          ${day.dayNumber}
        </p>

        <p class="
          text-lg font-bold
          ${day.calories > 0 ? "text-emerald-600" : "text-gray-300"}
        ">
          ${day.calories}
        </p>

        <p class="text-xs text-gray-400">
          kcal
        </p>

        <p class="text-xs text-gray-400 mt-1">
          ${day.items} ${day.items === 1 ? "item" : "items"}
        </p>

      </div>
    `;

  }).join("");

  const totalCalories = days.reduce(
    (sum, day) => sum + day.calories,
    0
  );

  const weeklyAverage = Math.round(totalCalories / 7);

  document.getElementById("weekly-average").textContent =
    `${weeklyAverage} kcal`;

  const totalItems = days.reduce(
    (sum, day) => sum + day.items,
    0
  );

  document.getElementById("weekly-total-items").textContent =
    `${totalItems} items`;


  const daysOnGoal = days.filter(
    day => day.calories >= FOOD_GOALS.calories
  ).length;

  document.getElementById("weekly-days-goal").textContent =
    `${daysOnGoal} / 7`;

}


function showPage(page) {
  const recipesSections = [
    document.getElementById("search-filters-section"),
    document.getElementById("meal-categories-section"),
    document.getElementById("all-recipes-section")
  ];

  recipesSections.forEach(section => {
    if (section) {
      section.style.display = page === "recipes" ? "" : "none";
    }
  });

  const details = document.getElementById("meal-details");
  if (details) details.style.display = "none";

  const products = document.getElementById("products-section");
  if (products) products.style.display = page === "products" ? "block" : "none";

  const foodlog = document.getElementById("foodlog-section");
  if (foodlog) foodlog.style.display = page === "foodlog" ? "block" : "none";

  const title = document.querySelector("#header h1");
  const description = document.querySelector("#header p");

  if (title && description) {
    if (page === "recipes") {
      title.textContent = "Meals & Recipes";
      description.textContent =
        "Discover delicious and nutritious recipes tailored for you";
    } else if (page === "products") {
      title.textContent = "Product Scanner";
      description.textContent =
        "Search food products and explore nutrition information";
    } else {
      title.textContent = "Food Log";
      description.textContent =
        "Track and monitor your daily nutrition intake";

      renderFoodLog();
    }
  }

  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.remove("bg-emerald-50", "text-emerald-700");
    link.classList.add("text-gray-600");
  });

  const activeLink = [...document.querySelectorAll(".nav-link")].find(link => {
    const label = link.querySelector("span")?.textContent.trim();

    return (
      (page === "recipes" && label === "Meals & Recipes") ||
      (page === "products" && label === "Product Scanner") ||
      (page === "foodlog" && label === "Food Log")
    );
  });

  if (activeLink) {
    activeLink.classList.add("bg-emerald-50", "text-emerald-700");
    activeLink.classList.remove("text-gray-600");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", function (event) {
    event.preventDefault();

    const page = this.dataset.page;

    if (page) {
      showPage(page);
    }

    sidebar?.classList.remove("sidebar-open");
    sidebarOverlay?.classList.remove("active");
  });
});


document.querySelectorAll(".quick-log-btn").forEach((button, index) => {
  button.addEventListener("click", () => {
    if (index === 0) showPage("recipes");
    if (index === 1) showPage("products");
    if (index === 2) openCustomFoodForm();
  });
});


function openCustomFoodForm() {
  if (!window.Swal) {
    alert("SweetAlert is not loaded.");
    return;
  }

  Swal.fire({
    title: "Custom Food",
    html: `
      <input id="custom-name" class="swal2-input" placeholder="Food name">
      <input id="custom-calories" type="number" class="swal2-input" placeholder="Calories">
      <input id="custom-protein" type="number" class="swal2-input" placeholder="Protein (g)">
      <input id="custom-carbs" type="number" class="swal2-input" placeholder="Carbs (g)">
      <input id="custom-fat" type="number" class="swal2-input" placeholder="Fat (g)">
    `,
    showCancelButton: true,
    confirmButtonText: "Add Food",
    confirmButtonColor: "#059669",
    preConfirm: () => {
      const name = document.getElementById("custom-name").value.trim();
      const calories = Number(document.getElementById("custom-calories").value);

      if (!name || !Number.isFinite(calories) || calories < 0) {
        Swal.showValidationMessage("Enter food name and calories");
        return false;
      }

      return {
        name,
        calories,
        protein: Number(document.getElementById("custom-protein").value) || 0,
        carbs: Number(document.getElementById("custom-carbs").value) || 0,
        fat: Number(document.getElementById("custom-fat").value) || 0
      };
    }
  }).then(result => {
    if (!result.isConfirmed) return;

    const item = {
      id: Date.now(),
      ...result.value,
      image: "",
      servings: 1,
      date: getTodayDate(),
      type: "custom"
    };

    const foodLog = getFoodLog();

    foodLog.push(item);
    saveFoodLog(foodLog);
    renderFoodLog();

    Swal.fire("Added!", "Food added to your daily log.", "success");
  });
}

document.getElementById("back-to-meals-btn")
  ?.addEventListener("click", () => showPage("recipes"));

const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");

function openSidebar() {
  sidebar?.classList.add("sidebar-open");
  sidebarOverlay?.classList.add("active");
}

function closeSidebar() {
  sidebar?.classList.remove("sidebar-open");
  sidebarOverlay?.classList.remove("active");
}

document.getElementById("header-menu-btn")
  ?.addEventListener("click", openSidebar);

document.getElementById("sidebar-close-btn")
  ?.addEventListener("click", closeSidebar);

sidebarOverlay?.addEventListener("click", closeSidebar);

renderFoodLog();

const productCategories = document.getElementById("product-categories");
const productsGrid = document.getElementById("products-grid");
const categoryMessage = document.getElementById("category-message");

productCategories?.addEventListener("click", function (event) {

  const button = event.target.closest(".product-category-btn");

  if (!button) return;

  productCategories
    .querySelectorAll(".product-category-btn")
    .forEach(btn => btn.classList.remove("active"));

  button.classList.add("active");

  const category = button.dataset.category;

  if (categoryMessage) {
    categoryMessage.textContent =
      `No products found in ${category}`;
  }


  if (productsGrid) {
    productsGrid.innerHTML = `
      <div class="product-empty-state">

        <div class="product-empty-icon">
          <i class="fa-solid fa-box-open"></i>
        </div>

        <h3>No products to display</h3>

        <p>
          Search for a product or browse by category
        </p>

      </div>
    `;
  }

  console.log("Selected Category:", category);
});


function displayNutritionFacts(nutrition, servings = 1) {

  const calories = Number(nutrition.calories) || 0;

  document.getElementById("nutrition-calories").textContent =
    calories || "--";

  document.getElementById("nutrition-total-calories").textContent =
    `Total: ${Math.round(calories * servings)} cal`;

  const nutrients = [
    {
      name: "Protein",
      value: nutrition.protein,
      unit: "g",
      color: "#10b981",
      max: 50
    },
    {
      name: "Carbs",
      value: nutrition.carbs,
      unit: "g",
      color: "#3b82f6",
      max: 250
    },
    {
      name: "Fat",
      value: nutrition.fat,
      unit: "g",
      color: "#a855f7",
      max: 65
    },
    {
      name: "Fiber",
      value: nutrition.fiber,
      unit: "g",
      color: "#f97316",
      max: 30
    },
    {
      name: "Sugar",
      value: nutrition.sugar,
      unit: "g",
      color: "#ec4899",
      max: 50
    },
    {
      name: "Saturated Fat",
      value: nutrition.saturatedFat,
      unit: "g",
      color: "#ef4444",
      max: 20
    }
  ];

  document.getElementById("nutrition-bars").innerHTML =
    nutrients.map(item => {

      const value = Number(item.value) || 0;

      const percentage = Math.min(
        100,
        (value / item.max) * 100
      );

      return `
        <div class="nutrition-item">

          <div class="nutrition-item-header">

            <span class="nutrition-label">
              <span
                class="nutrition-dot"
                style="background:${item.color}">
              </span>

              ${item.name}
            </span>

            <strong class="nutrition-value">
              ${value}${item.unit}
            </strong>

          </div>

          <div class="nutrition-progress">

            <div
              class="nutrition-progress-fill"
              style="
                width:${percentage}%;
                background:${item.color};
              ">
            </div>

          </div>

        </div>
      `;
    }).join("");

  document.getElementById("nutrition-cholesterol").textContent =
    `${Number(nutrition.cholesterol) || 0}mg`;

  document.getElementById("nutrition-sodium").textContent =
    `${Number(nutrition.sodium) || 0}mg`;
}
