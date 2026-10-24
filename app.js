
const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const $ = (id) => document.getElementById(id);

const authSection = $("auth-section");
const signedInSection = $("signed-in-section");
const authForm = $("auth-form");
const emailInput = $("email");
const passwordInput = $("password");
const signinTab = $("signin-tab");
const signupTab = $("signup-tab");
const submitButton = $("submit-button");
const passwordHelp = $("password-help");
const authMessage = $("auth-message");
const welcomeMessage = $("welcome-message");
const signoutButton = $("signout-button");
const sessionMessage = $("session-message");

let isSigningUp = false;
let currentUser = null;
let profileRequestNumber = 0;
let profilePanel = null;
let editingRecipeId = null;
let currentRecipes = [];

const BUCKET = "recipe-photos";

function showMessage(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.style.color = isError ? "#b42318" : "#356b43";
}

function switchMode(signingUp) {
  isSigningUp = signingUp;
  signinTab.classList.toggle("active", !signingUp);
  signupTab.classList.toggle("active", signingUp);
  passwordHelp.classList.toggle("hidden", !signingUp);
  passwordInput.autocomplete = signingUp ? "new-password" : "current-password";
  passwordInput.minLength = signingUp ? 8 : 1;
  submitButton.textContent = signingUp ? "Create account" : "Sign in";
  authMessage.textContent = "";
}

function showSignedOut() {
  currentUser = null;
  currentRecipes = [];
  editingRecipeId = null;
  profileRequestNumber++;

  signedInSection.classList.add("hidden");
  authSection.classList.remove("hidden");
  passwordInput.value = "";
  if (sessionMessage) sessionMessage.textContent = "";

  if (profilePanel) {
    profilePanel.remove();
    profilePanel = null;
  }
}

function showSignedIn(user) {
  currentUser = user;
  const requestNumber = ++profileRequestNumber;

  authSection.classList.add("hidden");
  signedInSection.classList.remove("hidden");
  welcomeMessage.textContent = "Welcome to your kitchen!";
  if (sessionMessage) sessionMessage.textContent = "";

  loadProfile(user, requestNumber);
  loadMyRecipes();
  loadExploreRecipes();
}

function makeProfilePanel() {
  const panel = document.createElement("section");
  panel.style.margin = "20px 0";
  panel.style.padding = "16px";
  panel.style.borderRadius = "12px";
  panel.style.background = "#fff8f1";

  const heading = document.createElement("h2");
  heading.textContent = "Choose your username";

  const description = document.createElement("p");
  description.textContent = "Choose a unique username for BakeBook.";

  const form = document.createElement("form");
  const label = document.createElement("label");
  label.htmlFor = "bakebook-username";
  label.textContent = "Username";

  const input = document.createElement("input");
  input.id = "bakebook-username";
  input.type = "text";
  input.minLength = 3;
  input.maxLength = 20;
  input.required = true;
  input.pattern = "[A-Za-z0-9_]{3,20}";
  input.placeholder = "e.g. sweetbaker";
  input.autocomplete = "username";

  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = "Save username";

  const message = document.createElement("p");
  message.setAttribute("role", "status");

  form.append(label, input, button, message);
  panel.append(heading, description, form);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser) return;

    const username = input.value.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      showMessage(message, "Use 3–20 letters, numbers, or underscores.", true);
      return;
    }

    button.disabled = true;
    showMessage(message, "Saving username...");

    try {
      const { error } = await supabaseClient
        .from("profiles")
        .insert({ id: currentUser.id, username });

      if (error) {
        if (error.code === "23505") {
          throw new Error("That username is taken. Try another.");
        }
        throw error;
      }

      welcomeMessage.textContent = "Welcome to BakeBook, @" + username + "!";
      panel.replaceChildren();
      const success = document.createElement("p");
      success.textContent = "Your username has been saved!";
      panel.appendChild(success);
    } catch (error) {
      showMessage(message, error.message || "Couldn't save username.", true);
      button.disabled = false;
    }
  });

  return panel;
}

async function loadProfile(user, requestNumber) {
  if (!profilePanel) {
    profilePanel = document.createElement("div");
    signedInSection.prepend(profilePanel);
  }

  profilePanel.replaceChildren();
  const loading = document.createElement("p");
  loading.textContent = "Loading your profile...";
  profilePanel.appendChild(loading);

  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    if (requestNumber !== profileRequestNumber) return;
    if (!currentUser || currentUser.id !== user.id) return;
    if (error) throw error;

    if (data) {
      welcomeMessage.textContent = "Welcome to BakeBook, @" + data.username + "!";
      profilePanel.replaceChildren();
      const greeting = document.createElement("p");
      greeting.textContent = "Your profile is ready.";
      profilePanel.appendChild(greeting);
    } else {
      profilePanel.replaceChildren(makeProfilePanel());
    }
  } catch (error) {
    if (requestNumber !== profileRequestNumber) return;
    profilePanel.replaceChildren();
    const errorText = document.createElement("p");
    errorText.textContent = "Couldn't load your profile. Please refresh and try again.";
    profilePanel.appendChild(errorText);
    console.error("Profile loading error:", error);
  }
}

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value;
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeRecipeCard(recipe, showOwnerActions = false) {
  const card = makeElement("article", "recipe-card");
  card.style.cssText =
    "background:#fffaf5;border:1px solid #eadbce;border-radius:14px;padding:16px;margin:12px 0;";

  const title = makeElement("h3", "", recipe.title);
  card.appendChild(title);

  const details = makeElement(
    "p",
    "",
    `Prep: ${recipe.prep_time ?? "—"} min · Bake: ${recipe.bake_time ?? "—"} min`
  );
  card.appendChild(details);

  const visibility = makeElement(
    "p",
    "",
    recipe.visibility === "public" ? "✿ Public recipe" : "♡ Private recipe"
  );
  card.appendChild(visibility);

  if (recipe.photo_url) {
    const image = document.createElement("img");
    image.alt = recipe.title;
    image.loading = "lazy";
    image.style.cssText =
      "width:100%;max-height:280px;object-fit:cover;border-radius:10px;";

    getPhotoUrl(recipe.photo_url).then((url) => {
      if (url) image.src = url;
    });
    card.appendChild(image);
  }

  card.appendChild(makeElement("h4", "", "Ingredients"));
  card.appendChild(makeElement("p", "", recipe.ingredients || "No ingredients added."));

  card.appendChild(makeElement("h4", "", "Instructions"));
  card.appendChild(makeElement("p", "", recipe.instructions || "No instructions added."));

  if (showOwnerActions) {
    const actions = makeElement("div", "recipe-actions");
    actions.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;";

    const editButton = makeElement("button", "", "Edit recipe");
    editButton.type = "button";
    editButton.addEventListener("click", () => startEditing(recipe));

    const deleteButton = makeElement("button", "", "Delete recipe");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", () => deleteRecipe(recipe));

    actions.append(editButton, deleteButton);
    card.appendChild(actions);
  }

  return card;
}

async function getPhotoUrl(path) {
  if (!path) return null;

  if (/^https?:\/\//i.test(path)) return path;

  const { data, error } = await supabaseClient.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);

  if (error) {
    console.error("Photo URL error:", error);
    return null;
  }

  return data.signedUrl;
}

function showEmpty(container, message) {
  if (container) container.appendChild(makeElement("p", "", message));
}

async function loadMyRecipes() {
  if (!currentUser) return;

  const list = $("recipe-list");
  const homeList = $("home-recipe-list");

  if (list) list.replaceChildren(makeElement("p", "", "Loading your recipes..."));
  if (homeList) homeList.replaceChildren();

  try {
    const { data, error } = await supabaseClient
      .from("recipes")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!currentUser) return;

    currentRecipes = data || [];
    renderMyRecipes();
    renderHomeRecipes();
  } catch (error) {
    console.error("Loading recipes failed:", error);
    if (list) {
      list.replaceChildren();
      showEmpty(list, "Couldn't load recipes: " + error.message);
    }
    if (homeList) {
      homeList.replaceChildren();
      showEmpty(homeList, "Your recipes couldn't be loaded.");
    }
  }
}

function renderMyRecipes() {
  const list = $("recipe-list");
  if (!list) return;
  list.replaceChildren();

  const search = ($("recipe-search")?.value || "").trim().toLowerCase();
  const visibility = $("visibility-filter")?.value || "all";
  const sort = $("recipe-sort")?.value || "newest";
  const prepFilter = $("prep-filter")?.value || "all";

  let recipes = currentRecipes.filter((recipe) => {
    const matchesSearch =
      (recipe.title || "").toLowerCase().includes(search) ||
      (recipe.ingredients || "").toLowerCase().includes(search);

    const matchesVisibility =
      visibility === "all" || recipe.visibility === visibility;

    const prep = Number(recipe.prep_time) || 0;
    const matchesPrep =
      prepFilter === "all" ||
      (prepFilter === "quick" && prep <= 20) ||
      (prepFilter === "long" && prep > 20);

    return matchesSearch && matchesVisibility && matchesPrep;
  });

  if (sort === "oldest") {
    recipes.reverse();
  } else if (sort === "title") {
    recipes.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (!recipes.length) {
    showEmpty(list, currentRecipes.length
      ? "No recipes match those filters."
      : "Your recipe book is empty. Add your first recipe! ♡");
    return;
  }

  recipes.forEach((recipe) => list.appendChild(makeRecipeCard(recipe, true)));
}

function renderHomeRecipes() {
  const list = $("home-recipe-list");
  if (!list) return;
  list.replaceChildren();

  const recent = currentRecipes.slice(0, 3);
  if (!recent.length) {
    showEmpty(list, "♡ Your recipe pages will appear here once you save your first recipe.");
    return;
  }

  recent.forEach((recipe) => list.appendChild(makeRecipeCard(recipe, true)));
}

async function loadExploreRecipes() {
  if (!currentUser) return;

  const list = $("public-recipe-list");
  if (list) list.replaceChildren(makeElement("p", "", "Finding shared recipes..."));

  try {
    const { data, error } = await supabaseClient
      .from("recipes")
      .select("*")
      .eq("visibility", "public")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!currentUser || !list) return;

    renderExploreRecipes(data || []);
  } catch (error) {
    console.error("Explore loading failed:", error);
    if (list) {
      list.replaceChildren();
      showEmpty(list, "Couldn't load shared recipes: " + error.message);
    }
  }
}

let publicRecipes = [];

function renderExploreRecipes(recipes) {
  publicRecipes = recipes;
  const list = $("public-recipe-list");
  if (!list) return;
  list.replaceChildren();

  const search = ($("public-recipe-search")?.value || "").trim().toLowerCase();
  const sort = $("public-recipe-sort")?.value || "newest";

  let results = publicRecipes.filter((recipe) =>
    (recipe.title || "").toLowerCase().includes(search) ||
    (recipe.ingredients || "").toLowerCase().includes(search)
  );

  if (sort === "oldest") {
    results.reverse();
  } else if (sort === "title") {
    results.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (!results.length) {
    showEmpty(list, "No shared recipes found yet. Be the first to share one! ♡");
    return;
  }

  results.forEach((recipe) => list.appendChild(makeRecipeCard(recipe, false)));
}

function startEditing(recipe) {
  editingRecipeId = recipe.id;

  $("recipe-title").value = recipe.title || "";
  $("prep-time").value = recipe.prep_time ?? "";
  $("bake-time").value = recipe.bake_time ?? "";
  $("ingredients").value = recipe.ingredients || "";
  $("instructions").value = recipe.instructions || "";
  $("recipe-visibility").value = recipe.visibility || "private";

  if ($("recipe-photo")) $("recipe-photo").value = "";

  setText("save-recipe-button", "Update recipe ♡");
  showMessage($("recipe-message"), "Editing your recipe. Save to keep your changes.");

  const addViewButton = document.querySelector('[data-view="add-recipe-view"]');
  if (addViewButton) addViewButton.click();
  else $("add-recipe-view")?.scrollIntoView({ behavior: "smooth" });
}

function resetRecipeForm() {
  editingRecipeId = null;
  $("recipe-form")?.reset();
  setText("save-recipe-button", "Save to my book ♡");
}

async function deleteRecipe(recipe) {
  if (!currentUser || !window.confirm(`Delete "${recipe.title}"? This cannot be undone.`)) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("recipes")
      .delete()
      .eq("id", recipe.id)
      .eq("user_id", currentUser.id);

    if (error) throw error;

    if (recipe.photo_url && !/^https?:\/\//i.test(recipe.photo_url)) {
      const { error: photoError } = await supabaseClient.storage
        .from(BUCKET)
        .remove([recipe.photo_url]);

      if (photoError) console.warn("Photo cleanup failed:", photoError);
    }

    showMessage($("recipe-message"), "Recipe deleted.");
    await loadMyRecipes();
  } catch (error) {
    console.error("Deleting recipe failed:", error);
    alert("Couldn't delete this recipe: " + error.message);
  }
}

const recipeForm = $("recipe-form");

if (recipeForm) {
  recipeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      showMessage($("recipe-message"), "Please sign in first.", true);
      return;
    }

    const title = $("recipe-title").value.trim();
    const ingredients = $("ingredients").value.trim();
    const instructions = $("instructions").value.trim();
    const prepTime = Number($("prep-time").value);
    const bakeTime = Number($("bake-time").value);
    const visibility = $("recipe-visibility").value;

    if (!title || !ingredients || !instructions) {
      showMessage($("recipe-message"), "Fill in the title, ingredients, and instructions.", true);
      return;
    }

    if (
      !Number.isFinite(prepTime) || prepTime < 0 ||
      !Number.isFinite(bakeTime) || bakeTime < 0
    ) {
      showMessage($("recipe-message"), "Enter valid prep and bake times.", true);
      return;
    }

    if (!["private", "public"].includes(visibility)) {
      showMessage($("recipe-message"), "Choose private or public visibility.", true);
      return;
    }

    const button = $("save-recipe-button");
    button.disabled = true;
    showMessage($("recipe-message"), "Saving your recipe...");

    let uploadedPath = null;

    try {
      let photoPath = null;
      const existingRecipe = editingRecipeId
        ? currentRecipes.find((recipe) => recipe.id === editingRecipeId)
        : null;

      photoPath = existingRecipe?.photo_url || null;

      const file = $("recipe-photo")?.files?.[0];

      if (file) {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
          throw new Error("Use a JPG, PNG, or WEBP image.");
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error("Your photo must be 5 MB or smaller.");
        }

        const extension = file.type === "image/jpeg" ? "jpg" :
          file.type === "image/png" ? "png" : "webp";
        const path = `${currentUser.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabaseClient.storage
          .from(BUCKET)
          .upload(path, file, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) throw uploadError;
        uploadedPath = path;
        photoPath = path;
      }

      const recipeData = {
        user_id: currentUser.id,
        title,
        ingredients,
        instructions,
        prep_time: prepTime,
        bake_time: bakeTime,
        photo_url: photoPath,
        visibility
      };

      let result;

      if (editingRecipeId) {
        result = await supabaseClient
          .from("recipes")
          .update(recipeData)
          .eq("id", editingRecipeId)
          .eq("user_id", currentUser.id)
          .select()
          .single();
      } else {
        result = await supabaseClient
          .from("recipes")
          .insert(recipeData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      const previousPhoto = existingRecipe?.photo_url;
      if (
        file && previousPhoto &&
        previousPhoto !== photoPath &&
        !/^https?:\/\//i.test(previousPhoto)
      ) {
        const { error: removeError } = await supabaseClient.storage
          .from(BUCKET)
          .remove([previousPhoto]);
        if (removeError) console.warn("Old photo cleanup failed:", removeError);
      }

      resetRecipeForm();
      showMessage($("recipe-message"), "Saved to your recipe book! ♡");
      await loadMyRecipes();
      await loadExploreRecipes();

      const myRecipesButton = document.querySelector('[data-view="my-recipes-view"]');
      if (myRecipesButton) myRecipesButton.click();
    } catch (error) {
      console.error("Saving recipe failed:", error);

      if (uploadedPath) {
        const { error: cleanupError } = await supabaseClient.storage
          .from(BUCKET)
          .remove([uploadedPath]);
        if (cleanupError) console.warn("Upload cleanup failed:", cleanupError);
      }

      showMessage(
        $("recipe-message"),
        "Couldn't save recipe: " + (error.message || "Please try again."),
        true
      );
    } finally {
      button.disabled = false;
    }
  });
}

$("recipe-search")?.addEventListener("input", renderMyRecipes);
$("visibility-filter")?.addEventListener("change", renderMyRecipes);
$("recipe-sort")?.addEventListener("change", renderMyRecipes);
$("prep-filter")?.addEventListener("change", renderMyRecipes);
$("public-recipe-search")?.addEventListener("input", () => renderExploreRecipes(publicRecipes));
$("public-recipe-sort")?.addEventListener("change", () => renderExploreRecipes(publicRecipes));

$("recipe-form")?.addEventListener("reset", () => {
  editingRecipeId = null;
  setText("save-recipe-button", "Save to my book ♡");
});

signinTab.addEventListener("click", () => switchMode(false));
signupTab.addEventListener("click", () => switchMode(true));

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage(authMessage, "Enter your email and password.", true);
    return;
  }

  if (isSigningUp) {
    const valid =
      password.length >= 8 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password);

    if (!valid) {
      showMessage(
        authMessage,
        "Use at least 8 characters, including uppercase, lowercase, and a number.",
        true
      );
      return;
    }
  }

  submitButton.disabled = true;
  signinTab.disabled = true;
  signupTab.disabled = true;
  submitButton.textContent = "Please wait...";
  authMessage.textContent = "";

  try {
    const result = isSigningUp
      ? await supabaseClient.auth.signUp({ email, password })
      : await supabaseClient.auth.signInWithPassword({ email, password });

    if (result.error) throw result.error;

    if (result.data.session && result.data.user) {
      showSignedIn(result.data.user);
    } else if (isSigningUp) {
      showMessage(authMessage, "Account created. Check your email if confirmation is required.");
    } else {
      showMessage(authMessage, "Couldn't start your session. Try again.", true);
    }
  } catch (error) {
    showMessage(authMessage, error.message || "Something went wrong. Please try again.", true);
  } finally {
    submitButton.disabled = false;
    signinTab.disabled = false;
    signupTab.disabled = false;
    submitButton.textContent = isSigningUp ? "Create account" : "Sign in";
  }
});

signoutButton.addEventListener("click", async () => {
  signoutButton.disabled = true;

  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;

    showSignedOut();
    switchMode(false);
    showMessage(authMessage, "You've signed out successfully.");
  } catch (error) {
    showMessage(sessionMessage, error.message || "Couldn't sign out.", true);
  } finally {
    signoutButton.disabled = false;
  }
});

async function restoreSession() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    showMessage(authMessage, "Couldn't restore your session. Refresh the page.", true);
    return;
  }

  if (data.session?.user) {
    showSignedIn(data.session.user);
  } else {
    showSignedOut();
  }
}

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    showSignedOut();
  } else if (session?.user) {
    setTimeout(() => {
      if (currentUser?.id !== session.user.id) showSignedIn(session.user);
    }, 0);
  }
});

restoreSession();
