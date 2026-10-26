
const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const $ = (id) => document.getElementById(id);
const BUCKET = "recipe-photos";

let isSigningUp = false;
let currentUser = null;
let profileRequestNumber = 0;
let profilePanel = null;
let editingRecipeId = null;
let currentRecipes = [];
let publicRecipes = [];

function showMessage(element, message, isError = false) {
  if (!element) return;

  element.textContent = message;
  element.style.color = isError ? "#9b3d36" : "#765548";
  element.style.fontFamily = "Georgia, serif";
  element.style.fontSize = "15px";
  element.style.fontStyle = "italic";
  element.style.marginTop = "12px";
}

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value;
}

function makeElement(tag, className = "", text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function switchMode(signingUp) {
  isSigningUp = signingUp;

  $("signin-tab")?.classList.toggle("active", !signingUp);
  $("signup-tab")?.classList.toggle("active", signingUp);
  $("password-help")?.classList.toggle("hidden", !signingUp);

  const passwordInput = $("password");
  if (passwordInput) {
    passwordInput.autocomplete = signingUp
      ? "new-password"
      : "current-password";
    passwordInput.minLength = signingUp ? 8 : 1;
  }

  setText("submit-button", signingUp ? "Create account" : "Sign in");

  const message = $("auth-message");
  if (message) message.textContent = "";
}

function showSignedOut() {
  currentUser = null;
  currentRecipes = [];
  publicRecipes = [];
  editingRecipeId = null;
  profileRequestNumber++;

  $("signed-in-section")?.classList.add("hidden");
  $("auth-section")?.classList.remove("hidden");

  const passwordInput = $("password");
  if (passwordInput) passwordInput.value = "";

  const sessionMessage = $("session-message");
  if (sessionMessage) sessionMessage.textContent = "";

  if (profilePanel) {
    profilePanel.remove();
    profilePanel = null;
  }
}

function showSignedIn(user) {
  if (!user) return;

  currentUser = user;
  const requestNumber = ++profileRequestNumber;

  $("auth-section")?.classList.add("hidden");
  $("signed-in-section")?.classList.remove("hidden");

  setText("welcome-heading", "Welcome to your kitchen!");
  setText("welcome-message", "Welcome to your kitchen!");
  setText("session-message", "");

  loadProfile(user, requestNumber);
  loadMyRecipes();
  loadExploreRecipes();
}

function makeProfilePanel() {
  const panel = makeElement("section");
  panel.style.cssText =
    "margin:20px 0;padding:16px;border-radius:12px;background:#fff8f1;";

  const heading = makeElement("h2", "", "Choose your username");
  const description = makeElement(
    "p",
    "",
    "Choose a unique username for BakeBook."
  );

  const form = makeElement("form");
  const label = makeElement("label", "", "Username");
  label.htmlFor = "bakebook-username";

  const input = makeElement("input");
  input.id = "bakebook-username";
  input.type = "text";
  input.minLength = 3;
  input.maxLength = 20;
  input.required = true;
  input.pattern = "[A-Za-z0-9_]{3,20}";
  input.placeholder = "e.g. sweetbaker";
  input.autocomplete = "username";

  const button = makeElement("button", "", "Save username");
  button.type = "submit";

  const message = makeElement("p");
  message.setAttribute("role", "status");

  form.append(label, input, button, message);
  panel.append(heading, description, form);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      showMessage(message, "Please sign in again.", true);
      return;
    }

    const userAtSubmit = currentUser;
    const username = input.value.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      showMessage(
        message,
        "Use 3–20 letters, numbers, or underscores.",
        true
      );
      return;
    }

    button.disabled = true;
    showMessage(message, "Saving username...");

    try {
      const { error } = await supabaseClient
        .from("profiles")
        .insert({
          id: userAtSubmit.id,
          username
        });

      if (error) {
        if (error.code === "23505") {
          throw new Error("That username is taken. Try another.");
        }
        throw error;
      }

      if (currentUser?.id !== userAtSubmit.id) return;

      setText("welcome-heading", `Welcome to BakeBook, @${username}!`);
      setText("welcome-message", `Welcome to BakeBook, @${username}!`);

      panel.replaceChildren();
      panel.appendChild(
        makeElement("p", "", "Your username has been saved!")
      );
    } catch (error) {
      console.error("Saving profile failed:", error);
      showMessage(
        message,
        error.message || "Couldn't save your username.",
        true
      );
      button.disabled = false;
    }
  });

  return panel;
}

async function loadProfile(user, requestNumber) {
  if (!profilePanel) {
    profilePanel = makeElement("div");
    profilePanel.id = "profile-panel";
    $("signed-in-section")?.prepend(profilePanel);
  }

  profilePanel.replaceChildren(
    makeElement("p", "", "Loading your profile...")
  );

  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    if (requestNumber !== profileRequestNumber) return;
    if (currentUser?.id !== user.id) return;
    if (error) throw error;

    if (data) {
      setText("welcome-heading", `Welcome to BakeBook, @${data.username}!`);
      setText("welcome-message", `Welcome to BakeBook, @${data.username}!`);

      profilePanel.replaceChildren(
        makeElement("p", "", "Your profile is ready.")
      );
    } else {
      profilePanel.replaceChildren(makeProfilePanel());
    }
  } catch (error) {
    if (requestNumber !== profileRequestNumber) return;

    console.error("Profile loading error:", error);
    profilePanel.replaceChildren(
      makeElement(
        "p",
        "",
        "Couldn't load your profile. Please refresh and try again."
      )
    );
  }
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

  return data?.signedUrl || null;
}

function showEmpty(container, message) {
  if (container) {
    container.appendChild(makeElement("p", "", message));
  }
}

function makeRecipeCard(recipe, showOwnerActions = false) {
  const card = makeElement("article", "recipe-card");
  card.style.cssText =
    "background:#fffaf5;border:1px solid #eadbce;border-radius:14px;padding:16px;margin:12px 0;";

  const title = makeElement("h3", "", recipe.title || "Untitled recipe");
  title.style.cssText =
    "font-family:'Cormorant Garamond',Georgia,serif;font-size:clamp(28px,5vw,44px);font-weight:600;letter-spacing:0.5px;line-height:1.2;color:#543b32;margin:0 0 14px;padding-bottom:10px;border-bottom:1px solid #d8c2ad;";
  card.appendChild(title);

  const details = makeElement(
    "p",
    "",
    `Prep: ${recipe.prep_time ?? "—"} min · Bake: ${recipe.bake_time ?? "—"} min`
  );
  details.style.cssText =
    "font-family:'Crimson Text',Georgia,serif;font-size:17px;line-height:1.7;color:#79675d;";
  card.appendChild(details);

  card.appendChild(
    makeElement(
      "p",
      "",
      recipe.visibility === "public" ? "✿ Public recipe" : "♡ Private recipe"
    )
  );

  if (recipe.photo_url) {
    const image = makeElement("img");
    image.alt = recipe.title || "Recipe photo";
    image.loading = "lazy";
    image.style.cssText =
      "width:100%;max-height:280px;object-fit:cover;border-radius:10px;";

    card.appendChild(image);

    getPhotoUrl(recipe.photo_url).then((url) => {
      if (url && image.isConnected) image.src = url;
    });
  }

  const ingredientsHeading = makeElement("h4", "", "Ingredients");
  ingredientsHeading.style.cssText =
    "font-family:'Crimson Text',Georgia,serif;font-size:22px;font-weight:700;color:#543b32;margin:20px 0 8px;";
  card.appendChild(ingredientsHeading);

  const ingredientsText = makeElement(
    "p",
    "",
    recipe.ingredients || "No ingredients added."
  );
  ingredientsText.style.cssText =
    "font-family:'Crimson Text',Georgia,serif;font-size:17px;line-height:1.8;color:#594b43;white-space:pre-line;";
  card.appendChild(ingredientsText);

  const instructionsHeading = makeElement("h4", "", "Instructions");
  instructionsHeading.style.cssText =
    "font-family:'Crimson Text',Georgia,serif;font-size:22px;font-weight:700;color:#543b32;margin:20px 0 8px;";
  card.appendChild(instructionsHeading);

  const instructionsText = makeElement(
    "p",
    "",
    recipe.instructions || "No instructions added."
  );
  instructionsText.style.cssText =
    "font-family:'Crimson Text',Georgia,serif;font-size:17px;line-height:1.8;color:#594b43;white-space:pre-line;";
  card.appendChild(instructionsText);

  if (showOwnerActions && currentUser?.id === recipe.user_id) {
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

async function loadMyRecipes() {
  if (!currentUser) return;

  const userId = currentUser.id;
  const list = $("recipe-list");
  const homeList = $("home-recipe-list");

  if (list) {
    list.replaceChildren(makeElement("p", "", "Loading your recipes..."));
  }
  if (homeList) homeList.replaceChildren();

  try {
    const { data, error } = await supabaseClient
      .from("recipes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (currentUser?.id !== userId) return;

    currentRecipes = data || [];
    renderMyRecipes();
    renderHomeRecipes();
  } catch (error) {
    console.error("Loading recipes failed:", error);

    if (currentUser?.id !== userId) return;

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
  const prepFilter = String($("prep-filter")?.value || "all");

  let recipes = currentRecipes.filter((recipe) => {
    const matchesSearch =
      (recipe.title || "").toLowerCase().includes(search) ||
      (recipe.ingredients || "").toLowerCase().includes(search);

    const matchesVisibility =
      visibility === "all" || recipe.visibility === visibility;

    const prep = Number(recipe.prep_time) || 0;
    const matchesPrep =
      prepFilter === "all" ||
      (prepFilter === "15" && prep <= 15) ||
      (prepFilter === "30" && prep <= 30) ||
      (prepFilter === "60" && prep <= 60);

    return matchesSearch && matchesVisibility && matchesPrep;
  });

  if (sort === "oldest") {
    recipes.reverse();
  } else if (sort === "az") {
    recipes.sort((a, b) =>
      (a.title || "").localeCompare(b.title || "")
    );
  } else if (sort === "za") {
    recipes.sort((a, b) =>
      (b.title || "").localeCompare(a.title || "")
    );
  }

  if (!recipes.length) {
    showEmpty(
      list,
      currentRecipes.length
        ? "No recipes match those filters."
        : "Your recipe book is empty. Add your first recipe! ♡"
    );
    return;
  }

  recipes.forEach((recipe) => {
    list.appendChild(makeRecipeCard(recipe, true));
  });
}

function renderHomeRecipes() {
  const list = $("home-recipe-list");
  if (!list) return;

  list.replaceChildren();

  const recent = currentRecipes.slice(0, 3);

  if (!recent.length) {
    showEmpty(
      list,
      "♡ Your recipe pages will appear here once you save your first recipe."
    );
    return;
  }

  recent.forEach((recipe) => {
    list.appendChild(makeRecipeCard(recipe, true));
  });
}

async function loadExploreRecipes() {
  if (!currentUser) return;

  const userId = currentUser.id;
  const list = $("explore-list");

  if (list) {
    list.replaceChildren(
      makeElement("p", "", "Finding shared recipes...")
    );
  }

  try {
    const { data, error } = await supabaseClient
      .from("recipes")
      .select("*")
      .eq("visibility", "public")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (currentUser?.id !== userId) return;

    publicRecipes = data || [];
    renderExploreRecipes();
    showMessage($("explore-message"), "");
  } catch (error) {
    console.error("Explore loading failed:", error);

    if (currentUser?.id !== userId) return;

    if (list) {
      list.replaceChildren();
      showEmpty(list, "Couldn't load shared recipes: " + error.message);
    }
    showMessage(
      $("explore-message"),
      "Couldn't load shared recipes. Please try again.",
      true
    );
  }
}

function renderExploreRecipes() {
  const list = $("explore-list");
  if (!list) return;

  list.replaceChildren();

  const search = ($("explore-search")?.value || "").trim().toLowerCase();
  const sort = $("explore-sort")?.value || "newest";

  let results = publicRecipes.filter((recipe) =>
    (recipe.title || "").toLowerCase().includes(search) ||
    (recipe.ingredients || "").toLowerCase().includes(search)
  );

  if (sort === "oldest") {
    results.sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
  } else if (sort === "az") {
    results.sort((a, b) =>
      (a.title || "").localeCompare(b.title || "")
    );
  } else if (sort === "za") {
    results.sort((a, b) =>
      (b.title || "").localeCompare(a.title || "")
    );
  } else {
    results.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }

  if (!results.length) {
    showEmpty(
      list,
      search
        ? "No shared recipes match your search."
        : "No shared recipes found yet. Be the first to share one! ♡"
    );
    return;
  }

  results.forEach((recipe) => {
    list.appendChild(makeRecipeCard(recipe, false));
  });
}

function startEditing(recipe) {
  if (!currentUser || recipe.user_id !== currentUser.id) return;

  editingRecipeId = recipe.id;

  $("recipe-title").value = recipe.title || "";
  $("prep-time").value = recipe.prep_time ?? "";
  $("bake-time").value = recipe.bake_time ?? "";
  $("ingredients").value = recipe.ingredients || "";
  $("instructions").value = recipe.instructions || "";
  $("recipe-visibility").value = recipe.visibility || "private";

  if ($("recipe-photo")) $("recipe-photo").value = "";

  setText("save-recipe-button", "Update recipe ♡");
  showMessage(
    $("recipe-message"),
    "Editing your recipe. Save to keep your changes."
  );

  document.querySelector('[data-view="add-recipe-view"]')?.click();
}

function resetRecipeForm() {
  editingRecipeId = null;
  $("recipe-form")?.reset();
  setText("save-recipe-button", "Save to my book ♡");
}

async function deleteRecipe(recipe) {
  if (
    !currentUser ||
    recipe.user_id !== currentUser.id ||
    !window.confirm(`Delete "${recipe.title}"? This cannot be undone.`)
  ) {
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

      if (photoError) {
        console.warn("Photo cleanup failed:", photoError);
      }
    }

    showMessage($("recipe-message"), "Recipe deleted.");
    await loadMyRecipes();
    await loadExploreRecipes();
  } catch (error) {
    console.error("Deleting recipe failed:", error);
    showMessage(
      $("recipe-message"),
      "Couldn't delete this recipe: " + error.message,
      true
    );
  }
}

$("recipe-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    showMessage($("recipe-message"), "Please sign in first.", true);
    return;
  }

  const userAtSubmit = currentUser;
  const title = $("recipe-title")?.value.trim() || "";
  const ingredients = $("ingredients")?.value.trim() || "";
  const instructions = $("instructions")?.value.trim() || "";
  const prepValue = $("prep-time")?.value ?? "";
  const bakeValue = $("bake-time")?.value ?? "";
  const prepTime = Number(prepValue);
  const bakeTime = Number(bakeValue);
  const visibility = $("recipe-visibility")?.value || "";

  if (!title || !ingredients || !instructions) {
    showMessage(
      $("recipe-message"),
      "Fill in the title, ingredients, and instructions.",
      true
    );
    return;
  }

  if (
    prepValue === "" ||
    bakeValue === "" ||
    !Number.isFinite(prepTime) ||
    prepTime < 0 ||
    !Number.isFinite(bakeTime) ||
    bakeTime < 0
  ) {
    showMessage(
      $("recipe-message"),
      "Enter valid prep and bake times.",
      true
    );
    return;
  }

  if (!["private", "public"].includes(visibility)) {
    showMessage(
      $("recipe-message"),
      "Choose private or public visibility.",
      true
    );
    return;
  }

  const button = $("save-recipe-button");
  if (button) button.disabled = true;

  showMessage($("recipe-message"), "Saving your recipe...");

  let uploadedPath = null;

  try {
    const existingRecipe = editingRecipeId
      ? currentRecipes.find((recipe) => recipe.id === editingRecipeId)
      : null;

    if (editingRecipeId && !existingRecipe) {
      throw new Error("Couldn't find the recipe you're editing. Refresh and try again.");
    }

    let photoPath = existingRecipe?.photo_url || null;
    const file = $("recipe-photo")?.files?.[0];

    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

      if (!allowedTypes.includes(file.type)) {
        throw new Error("Use a JPG, PNG, or WEBP image.");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Your photo must be 5 MB or smaller.");
      }

      const extension =
        file.type === "image/jpeg"
          ? "jpg"
          : file.type === "image/png"
            ? "png"
            : "webp";

      const path = `${userAtSubmit.id}/${crypto.randomUUID()}.${extension}`;

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
      user_id: userAtSubmit.id,
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
        .eq("user_id", userAtSubmit.id)
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
    if (currentUser?.id !== userAtSubmit.id) return;

    const previousPhoto = existingRecipe?.photo_url;

    if (
      file &&
      previousPhoto &&
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

    document.querySelector('[data-view="my-recipes-view"]')?.click();
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
    if (button) button.disabled = false;
  }
});

$("recipe-search")?.addEventListener("input", renderMyRecipes);
$("visibility-filter")?.addEventListener("change", renderMyRecipes);
$("recipe-sort")?.addEventListener("change", renderMyRecipes);
$("prep-filter")?.addEventListener("change", renderMyRecipes);

$("explore-search")?.addEventListener("input", renderExploreRecipes);
$("explore-sort")?.addEventListener("change", renderExploreRecipes);

$("recipe-form")?.addEventListener("reset", () => {
  editingRecipeId = null;
  setText("save-recipe-button", "Save to my book ♡");
});

$("signin-tab")?.addEventListener("click", () => switchMode(false));
$("signup-tab")?.addEventListener("click", () => switchMode(true));

$("auth-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = $("email")?.value.trim() || "";
  const password = $("password")?.value || "";

  if (!email || !password) {
    showMessage($("auth-message"), "Enter your email and password.", true);
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
        $("auth-message"),
        "Use at least 8 characters, including uppercase, lowercase, and a number.",
        true
      );
      return;
    }
  }

  const submitButton = $("submit-button");
  const signinTab = $("signin-tab");
  const signupTab = $("signup-tab");

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Please wait...";
  }
  if (signinTab) signinTab.disabled = true;
  if (signupTab) signupTab.disabled = true;

  showMessage($("auth-message"), "");

  const signingUpAtSubmit = isSigningUp;

  try {
    const result = signingUpAtSubmit
      ? await supabaseClient.auth.signUp({ email, password })
      : await supabaseClient.auth.signInWithPassword({ email, password });

    if (result.error) throw result.error;

    if (result.data.session && result.data.user) {
      showSignedIn(result.data.user);
    } else if (signingUpAtSubmit) {
      showMessage(
        $("auth-message"),
        "Account created. Check your email if confirmation is required."
      );
    } else {
      showMessage(
        $("auth-message"),
        "Couldn't start your session. Try again.",
        true
      );
    }
  } catch (error) {
    showMessage(
      $("auth-message"),
      error.message || "Something went wrong. Please try again.",
      true
    );
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = isSigningUp
        ? "Create account"
        : "Sign in";
    }
    if (signinTab) signinTab.disabled = false;
    if (signupTab) signupTab.disabled = false;
  }
});

// Optional GitHub sign-in button. This runs if the button exists in index.html.
$("github-signin-button")?.addEventListener("click", async () => {
  const button = $("github-signin-button");
  if (button) button.disabled = true;

  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });

    if (error) throw error;
  } catch (error) {
    showMessage(
      $("auth-message"),
      error.message || "Couldn't sign in with GitHub.",
      true
    );
    if (button) button.disabled = false;
  }
});

$("signout-button")?.addEventListener("click", async () => {
  const button = $("signout-button");
  if (button) button.disabled = true;

  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;

    showSignedOut();
    switchMode(false);
    showMessage($("auth-message"), "You've signed out successfully.");
  } catch (error) {
    showMessage(
      $("session-message"),
      error.message || "Couldn't sign out.",
      true
    );
  } finally {
    if (button) button.disabled = false;
  }
});

$("change-password-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const newPassword = $("new-password")?.value || "";
  const confirmPassword = $("confirm-password")?.value || "";
  const message = $("password-message");

  if (!currentUser) {
    showMessage(message, "Please sign in first.", true);
    return;
  }

  if (newPassword.length < 8) {
    showMessage(message, "Password must be at least 8 characters.", true);
    return;
  }

  if (
    !/[a-z]/.test(newPassword) ||
    !/[A-Z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword)
  ) {
    showMessage(
      message,
      "Include an uppercase letter, lowercase letter, and number.",
      true
    );
    return;
  }

  if (newPassword !== confirmPassword) {
    showMessage(message, "Your passwords don't match.", true);
    return;
  }

  const button = $("update-password-button");
  if (button) button.disabled = true;

  showMessage(message, "Updating password...");

  try {
    const { error } = await supabaseClient.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;

    showMessage(message, "Password updated successfully!");
    $("change-password-form")?.reset();
  } catch (error) {
    showMessage(
      message,
      error.message || "Couldn't update your password.",
      true
    );
  } finally {
    if (button) button.disabled = false;
  }
});

async function restoreSession() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) throw error;

    if (data.session?.user) {
      showSignedIn(data.session.user);
    } else {
      showSignedOut();
    }
  } catch (error) {
    console.error("Session restore failed:", error);
    showMessage(
      $("auth-message"),
      "Couldn't restore your session. Refresh the page.",
      true
    );
  }
}

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    showSignedOut();
  } else if (session?.user) {
    // Defer Supabase follow-up work until after the auth callback.
    Promise.resolve().then(() => {
      if (currentUser?.id !== session.user.id) {
        showSignedIn(session.user);
      }
    });
  }
});

restoreSession();

document
  .getElementById("github-signin-button")
  ?.addEventListener("click", async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });

    if (error) {
      alert("GitHub sign-in failed: " + error.message);
    }
  });
