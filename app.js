
const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const authSection = document.getElementById("auth-section");
const signedInSection = document.getElementById("signed-in-section");
const authForm = document.getElementById("auth-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signinTab = document.getElementById("signin-tab");
const signupTab = document.getElementById("signup-tab");
const submitButton = document.getElementById("submit-button");
const passwordHelp = document.getElementById("password-help");
const authMessage = document.getElementById("auth-message");
const welcomeMessage = document.getElementById("welcome-message");
const signoutButton = document.getElementById("signout-button");
const sessionMessage = document.getElementById("session-message");

let isSigningUp = false;
let currentUser = null;
let profileRequestNumber = 0;
let profilePanel = null;

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
  profileRequestNumber++;

  signedInSection.classList.add("hidden");
  authSection.classList.remove("hidden");
  passwordInput.value = "";
  sessionMessage.textContent = "";

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
  welcomeMessage.textContent = "Signed in as " + user.email;
  sessionMessage.textContent = "";

  loadProfile(user, requestNumber);
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
    signedInSection.insertBefore(profilePanel, signoutButton);
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
    setTimeout(() => showSignedIn(session.user), 0);
  }
});

restoreSession();
